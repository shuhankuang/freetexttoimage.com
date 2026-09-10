import { Buffer } from "node:buffer";
import sharp from "sharp";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { creations, generationJobs } from "@/lib/schema";
import { getCreation, updateCreationSucceeded, updateCreationStatus } from "@/lib/creations";
import { getProvider, DEFAULT_MODEL } from "@/lib/models";
import { publicObjectUrl, uploadObject, s3Configured } from "@/lib/storage";
import { deductCredits, refundCredits, getBalance } from "@/lib/credits";
import { ensureSubscriptionCreditsFresh } from "@/lib/billing";

const THUMBNAIL_WIDTH = 640; // 网格列按宽度布局；固定宽度并保留原比例，避免裁掉生成内容

// 图像生成编排层：把「一次生成」串成  creation(status) + generation_jobs + provider + S3 落盘。
// 双通道触发最终落盘，且 finalize 幂等：
//   1) 回调快通道 —— KIE 完成后 POST /api/webhooks/kie → handleCallback → finalizeJob
//   2) 轮询兜底 —— createJob 起 startPollLoop，进程内退避轮询 provider.getTask → finalizeJob
// 竞态时无论哪个先到，都靠 applyCreationStatus 里对 generation_jobs 的原子条件 UPDATE 只放行一次
// （Turso 是走 HTTP 的远程库，没有 better-sqlite3 那种本地同步事务可用，所以原子性由这条
//  `UPDATE ... WHERE status = 'processing'` + 受影响行数判断来保证，不是靠事务包裹）。

const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 15000;
const MAX_TOTAL_MS = 5 * 60 * 1000; // 单次任务总观察窗口
const JOB_STALE_MS = 45 * 1000; // updated_at 超过该值视为轮询已断（进程重启后自愈用）
const activePolls = new Set();

const iso = () => new Date().toISOString();
const configError = (message) => { const err = new Error(message); err.code = "CONFIG"; return err; };

// 回调地址由 APP_URL 推导；本地开发未设 APP_URL 则纯轮询。
function callbackUrl() {
  const app = process.env.APP_URL;
  if (!app) return null;
  return `${app.replace(/\/+$/, "")}/api/webhooks/kie`;
}

async function jobRow(id) {
  const [row] = await db.select().from(generationJobs).where(eq(generationJobs.id, id));
  return row;
}

async function insertJob({ id, creationId, userId, provider, model, externalTaskId, now }) {
  await db.insert(generationJobs).values({
    id,
    creationId,
    userId,
    provider,
    model,
    externalTaskId,
    status: "processing",
    createdAt: now,
    updatedAt: now,
  });
}

// 状态迁移：先原子闭锁 generation_jobs（只有仍是 processing 时这条 UPDATE 才会命中），
// 受影响行数为 0 说明已经被另一条并发路径（webhook / 轮询）抢先终结，直接放弃、不再动 creation。
// 闭锁成功后才写 creation——此时只有一个调用者能走到这一步，不会重复落盘。
async function applyCreationStatus({ userId, creationId, jobId, status, image, imageKey, thumbnailKey, error }) {
  const jobResult = await db
    .update(generationJobs)
    .set({ status, error: error || null, updatedAt: iso() })
    .where(and(eq(generationJobs.id, jobId), eq(generationJobs.status, "processing")));

  if ((jobResult.rowsAffected ?? 0) === 0) return false;

  if (status === "succeeded") {
    await updateCreationSucceeded(userId, creationId, { image, imageKey, thumbnailKey });
  } else {
    await updateCreationStatus(userId, creationId, status);
  }
  return true;
}

async function failJob(jobId, message) {
  const job = await jobRow(jobId);
  if (!job || job.status !== "processing") return;
  const applied = await applyCreationStatus({
    userId: job.userId,
    creationId: job.creationId,
    jobId,
    status: "failed",
    error: message,
  });
  // 只有真正把 job 判死的那个调用者退款——原子闭锁保证同一个 job 不会有两个调用者都拿到 applied=true，
  // 天然避免双重退款，不需要另外加锁。
  if (applied) await refundCredits(jobId);
}

async function touchJob(jobId, error = null) {
  await db
    .update(generationJobs)
    .set(error ? { error, updatedAt: iso() } : { updatedAt: iso() })
    .where(and(eq(generationJobs.id, jobId), eq(generationJobs.status, "processing")));
}

// ── 最终落盘（幂等，双通道共用）──────────────────────────────
async function finalizeJob(jobId, urls) {
  const job = await jobRow(jobId);
  if (!job || job.status !== "processing") return false; // 早退出，纯优化：省一次下载，不是正确性保证

  if (!urls || urls.length === 0) {
    await failJob(jobId, "The model finished but returned no image.");
    return true;
  }

  const image = await downloadImage(urls[0]); // 失败会抛，交给上层退避重试
  const ext = pickExtension(image.contentType, urls[0]);
  const contentType = image.contentType?.startsWith("image/")
    ? image.contentType
    : mimeForExt(ext);
  const key = `${job.creationId}.${ext}`;
  await uploadObject(key, image.buffer, contentType); // 原图必须成功，失败交给上层重试

  const thumbnailKey = await buildThumbnail(job, image.buffer); // 尽力而为，失败不影响原图落盘

  const applied = await applyCreationStatus({
    userId: job.userId,
    creationId: job.creationId,
    jobId,
    status: "succeeded",
    image: publicObjectUrl(key) || `/api/images/${job.creationId}`,
    imageKey: key,
    thumbnailKey,
  });
  return applied;
}

// 缩略图生成/上传失败都只记日志、返回 null——不能让锦上添花的缩略图拖垮主图交付。
async function buildThumbnail(job, buffer) {
  let thumbBuffer;
  try {
    thumbBuffer = await sharp(buffer)
      .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();
  } catch (err) {
    console.error("[generation] thumbnail render failed:", err?.message || err);
    return null;
  }
  const thumbnailKey = `${job.creationId}_thumb.webp`;
  try {
    await uploadObject(thumbnailKey, thumbBuffer, "image/webp");
    return thumbnailKey;
  } catch (err) {
    console.error("[generation] thumbnail upload failed:", err?.message || err);
    return null;
  }
}

// ── 轮询兜底 ──────────────────────────────────────────────
function startPollLoop(jobId) {
  if (activePolls.has(jobId)) return;
  activePolls.add(jobId);
  scheduleTick(jobId, Date.now(), 0);
}

function stopPollLoop(jobId) {
  activePolls.delete(jobId);
}

function scheduleTick(jobId, startedAt, attempt) {
  // 2s → 4s → 8s … 封顶 15s（加一点随机抖动避免扎堆）
  const delay =
    Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.min(attempt, 5)) + Math.floor(Math.random() * 300);
  setTimeout(() => {
    pollTick(jobId, startedAt, attempt).catch(() => stopPollLoop(jobId));
  }, delay);
}

async function pollTick(jobId, startedAt, attempt) {
  const job = await jobRow(jobId);
  if (!job || job.status !== "processing") return stopPollLoop(jobId);

  if (Date.now() - startedAt > MAX_TOTAL_MS) {
    await failJob(jobId, "Image generation timed out. Please try again.");
    return stopPollLoop(jobId);
  }

  try {
    const info = await getProvider(job.model).getTask(job.externalTaskId);
    if (info.status === "succeeded") {
      const applied = await finalizeJob(jobId, info.resultUrls);
      if (applied) return stopPollLoop(jobId);
      // 没落盘：可能是 S3/下载瞬时失败或并发被抢先 → 查一下，仍 processing 就继续退避重试
      const cur = await jobRow(jobId);
      if (!cur || cur.status !== "processing") return stopPollLoop(jobId);
    } else if (info.status === "failed") {
      await failJob(jobId, info.error || "Image generation failed. Please try again.");
      return stopPollLoop(jobId);
    } else {
      await touchJob(jobId);
    }
  } catch (err) {
    if (err?.code === "CONFIG") {
      await failJob(jobId, err.message);
      return stopPollLoop(jobId);
    }
    await touchJob(jobId, err?.message || String(err)); // 记录最近一次瞬时错误，继续退避重试
  }
  scheduleTick(jobId, startedAt, attempt + 1);
}

// 进程重启后自愈：GET 发现卡在 processing 且 updated_at 陈旧时调用，重启一条轮询。
export async function ensurePolling(creationId) {
  const [job] = await db
    .select()
    .from(generationJobs)
    .where(and(eq(generationJobs.creationId, creationId), eq(generationJobs.status, "processing")));
  if (!job || activePolls.has(job.id)) return;
  if (Date.now() - new Date(job.updatedAt).getTime() > JOB_STALE_MS) {
    startPollLoop(job.id);
  }
}

// ── 对外入口 ──────────────────────────────────────────────
export async function createJob(user, { prompt, style, ratio, model = DEFAULT_MODEL }) {
  if (!s3Configured) {
    throw configError(
      "S3 storage is not configured. Fill S3_BUCKET/S3_ENDPOINT + S3_ACCESS_KEY_ID + S3_SECRET_ACCESS_KEY in .env.local."
    );
  }
  const provider = getProvider(model);
  const normalizedPrompt = typeof prompt === "string" ? prompt.trim() : "";
  const promptMax = provider.promptMax || 2000;
  if (!normalizedPrompt || normalizedPrompt.length > promptMax) {
    const error = new Error(`Prompt must be between 1 and ${promptMax} characters for ${provider.label}.`);
    error.code = "INVALID_INPUT";
    throw error;
  }
  const normalizedRatio = ratio || provider.aspectRatios?.[0] || "1:1";
  if (provider.aspectRatios?.length && !provider.aspectRatios.includes(normalizedRatio)) {
    const error = new Error(`${provider.label} does not support the ${normalizedRatio} aspect ratio.`);
    error.code = "INVALID_INPUT";
    throw error;
  }
  const cost = provider.creditCost || 1;

  // 年付订阅在年内没有月度 invoice；真正扣款前按订阅锚点刷新本月额度。
  await ensureSubscriptionCreditsFresh(user.id);

  const now = iso();
  const creationId = crypto.randomUUID();
  const jobId = crypto.randomUUID();

  // 先扣款、后调 KIE：调用 KIE 是要花我们自己钱的外部请求，不能让付不起积分的用户先把这笔钱花出去。
  const held = await deductCredits(user.id, cost, { jobId });
  if (!held) {
    const err = new Error("Not enough credits.");
    err.code = "INSUFFICIENT_CREDITS";
    err.cost = cost;
    err.balance = (await getBalance(user.id)).total;
    throw err;
  }

  // 扣款之后、job 真正建起来之前的这一段都算「还没开始生成」——任何一步失败（KIE 调用失败、
  // 建 creation/job 行时数据库瞬时失败）都退款，不能让积分在没有对应任务的情况下凭空消失。
  try {
    const externalTaskId = await provider.createTask({
      prompt: normalizedPrompt,
      aspectRatio: normalizedRatio,
      callBackUrl: callbackUrl(),
    });

    await db.insert(creations).values({
      id: creationId,
      userId: user.id,
      title: normalizedPrompt.split(/\s+/).slice(0, 5).join(" "),
      prompt: normalizedPrompt,
      style: style || null,
      ratio: normalizedRatio,
      image: null,
      imageKey: null,
      status: "processing",
      model,
      createdAt: now,
    });
    await insertJob({
      id: jobId,
      creationId,
      userId: user.id,
      provider: provider.id,
      model,
      externalTaskId,
      now,
    });
  } catch (err) {
    await refundCredits(jobId);
    throw err;
  }

  startPollLoop(jobId); // 兜底轮询，异步进行
  return getCreation(user.id, creationId);
}

// KIE 回调入口（webhook route 调用）。容错：未知 taskId / 已终态 / 坏 body 一律安全返回。
export async function handleCallback(payload = {}) {
  const taskId = payload?.taskId || payload?.data?.taskId;
  if (!taskId) return { reason: "missing-task" };

  const [job] = await db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.externalTaskId, String(taskId)));
  if (!job) return { reason: "unknown-task" };
  if (job.status !== "processing") return { reason: "already-settled" };

  const state = String(payload?.state || payload?.status || "").toLowerCase();
  const urls = extractResultUrls(payload?.resultJson);
  try {
    if (state === "fail") {
      await failJob(job.id, payload?.msg || payload?.failMsg || "Image generation failed.");
      return { reason: "failed" };
    }
    if (state === "success" || urls.length > 0) {
      await finalizeJob(job.id, urls); // 内部会兜底“无图算失败”
      return { reason: "finalized" };
    }
  } catch (err) {
    // 告诉 webhook 路由返回 503，请求上游重试；轮询兜底也会继续。
    console.error("[generation] callback finalize error:", err?.message || err);
    await touchJob(job.id, err?.message || String(err));
    return { reason: "retryable-error" };
  }
  return { reason: "still-processing" };
}

// ── 小工具 ──────────────────────────────────────────────
function extractResultUrls(resultJson) {
  let urls = [];
  if (!resultJson) return urls;
  let parsed = resultJson;
  if (typeof resultJson === "string") {
    try { parsed = JSON.parse(resultJson); } catch { return urls; }
  }
  if (Array.isArray(parsed)) urls = parsed;
  else if (parsed && Array.isArray(parsed.resultUrls)) urls = parsed.resultUrls;
  else if (parsed && Array.isArray(parsed.urls)) urls = parsed.urls;
  return urls.filter((u) => typeof u === "string" && u.length > 0);
}

const EXT_BY_MIME = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
function pickExtension(contentType, url) {
  if (contentType) {
    const mime = contentType.split(";")[0].trim().toLowerCase();
    if (EXT_BY_MIME[mime]) return EXT_BY_MIME[mime];
  }
  try {
    const match = /\.(jpe?g|png|webp|gif)$/i.exec(new URL(url).pathname);
    if (match) return match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  } catch { /* 无 URL 可解析 */ }
  return "png";
}
const mimeForExt = (ext) => (ext === "jpg" ? "image/jpeg" : `image/${ext}`);

async function downloadImage(url) {
  let lastErr;
  for (let i = 0; i < 2; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60 * 1000);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": "FreeTexttoImage/1.0", Accept: "image/*,*/*" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length === 0) throw new Error("empty body");
      return { buffer, contentType: res.headers.get("content-type") || "" };
    } catch (err) {
      lastErr = err;
    } finally {
      clearTimeout(timer);
    }
  }
  const err = new Error(`Failed to download generated image: ${lastErr?.message || lastErr}`);
  err.transient = true;
  throw err;
}
