import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { creations, generationJobs } from "@/lib/schema";
import { listProviders } from "@/lib/models";
import { publicObjectUrl } from "@/lib/storage";
import { Buffer } from "node:buffer";

// creations 表服务端访问层。只被 route handler / server 代码 import。
// 全部函数走 Drizzle（Turso 是走 HTTP 的远程库），因此都是异步的——调用方必须 await。

// 作品行里的 model 存的是 provider id（如 "z-image"）。
// 客户端要展示的是人类可读的标签（如 "Z-Image"），这里在服务端一次性装饰好，
// 标签的单一来源仍是模型注册表（src/lib/models）——改配置不用迁库。
const MODEL_LABELS = new Map(listProviders().map((p) => [p.id, p.label]));
function fileName(key) {
  return key?.split("/").at(-1) || null;
}

// 失败原因存在 generation_jobs.error（一个 creation 对应一个 job），creations 表本身没有
// 这个字段。显式列出列名 + LEFT JOIN，而不是裸 select(*)，避免两张表同名列（id/createdAt）冲突。
const CREATION_COLUMNS = {
  id: creations.id,
  userId: creations.userId,
  title: creations.title,
  prompt: creations.prompt,
  style: creations.style,
  ratio: creations.ratio,
  image: creations.image,
  imageKey: creations.imageKey,
  thumbnailKey: creations.thumbnailKey,
  status: creations.status,
  model: creations.model,
  createdAt: creations.createdAt,
  error: generationJobs.error,
};

function selectCreations() {
  return db.select(CREATION_COLUMNS).from(creations).leftJoin(generationJobs, eq(generationJobs.creationId, creations.id));
}

const decorate = (row) => {
  if (!row) return row;
  const { imageKey, thumbnailKey, ...creation } = row;
  const image = publicObjectUrl(fileName(imageKey)) || creation.image;
  const thumbnail = publicObjectUrl(fileName(thumbnailKey)) || (thumbnailKey && creation.image ? `${creation.image}?size=thumb` : null);
  return { ...creation, image, thumbnail, model: MODEL_LABELS.get(row.model) || row.model || null };
};

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 48;

function encodeCursor(row) {
  return Buffer.from(JSON.stringify([row.createdAt, row.id])).toString("base64url");
}

function decodeCursor(value) {
  if (!value) return null;
  try {
    const [createdAt, id] = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt)) || typeof id !== "string" || !id) {
      throw new Error("invalid cursor values");
    }
    return { createdAt, id };
  } catch {
    const error = new Error("Invalid creations cursor");
    error.code = "INVALID_CURSOR";
    throw error;
  }
}

export async function listCreationsPage(userId, { limit = DEFAULT_PAGE_SIZE, cursor: rawCursor } = {}) {
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(limit, 10) || DEFAULT_PAGE_SIZE));
  const cursor = decodeCursor(rawCursor);
  const afterCursor = (c) =>
    or(lt(creations.createdAt, c.createdAt), and(eq(creations.createdAt, c.createdAt), lt(creations.id, c.id)));

  const where = cursor ? and(eq(creations.userId, userId), afterCursor(cursor)) : eq(creations.userId, userId);

  const rows = await selectCreations()
    .where(where)
    .orderBy(desc(creations.createdAt), desc(creations.id))
    .limit(pageSize + 1);

  const pageRows = rows.slice(0, pageSize);
  const hasMore = rows.length > pageSize;
  const last = pageRows.at(-1);

  let remaining = 0;
  if (hasMore) {
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(creations)
      .where(and(eq(creations.userId, userId), afterCursor(last)));
    remaining = Number(count);
  }

  return {
    items: pageRows.map(decorate),
    nextCursor: hasMore ? encodeCursor(last) : null,
    remaining,
  };
}

export async function getCreation(userId, id) {
  const [row] = await selectCreations()
    .where(and(eq(creations.userId, userId), eq(creations.id, id)));
  return decorate(row);
}

// 完整行（含 image_key）——仅供图片代理等需要私有 object key 的服务端路径用。
export async function getCreationRecord(userId, id) {
  const [row] = await db
    .select()
    .from(creations)
    .where(and(eq(creations.userId, userId), eq(creations.id, id)));
  return row;
}

// 生成成功：写入 S3 key + 对外代理 URL，并把 creation 推进到 succeeded。
// thumbnailKey 可为空——缩略图生成是尽力而为，失败不影响原图落盘。
// 带 status='processing' 守卫，返回是否真的写入了（供 generation.js 的原子闭锁判断用）。
export async function updateCreationSucceeded(userId, id, { image, imageKey, thumbnailKey = null }) {
  const result = await db
    .update(creations)
    .set({ image, imageKey, thumbnailKey, status: "succeeded" })
    .where(and(eq(creations.userId, userId), eq(creations.id, id), eq(creations.status, "processing")));
  return (result.rowsAffected ?? 0) > 0;
}

export async function updateCreationStatus(userId, id, status) {
  const result = await db
    .update(creations)
    .set({ status })
    .where(and(eq(creations.userId, userId), eq(creations.id, id), eq(creations.status, "processing")));
  return (result.rowsAffected ?? 0) > 0;
}

// 返回是否删除了记录（用于区分「不存在」与「非本人」）。
export async function deleteCreationFor(userId, id) {
  const result = await db.delete(creations).where(and(eq(creations.userId, userId), eq(creations.id, id)));
  return (result.rowsAffected ?? 0) > 0;
}
