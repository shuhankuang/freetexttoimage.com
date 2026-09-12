import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { inArray } from "drizzle-orm";
import { promptItems } from "./schema.js";
import { resolveModelPromptPage } from "./model-prompt-pages.js";

export const PROMPT_IMPORT_VERSION = "tweet-id-thumb-v5";
export const COVER_THUMBNAIL_WIDTH = 640;
export const DETAIL_THUMBNAIL_WIDTH = 160;
export const MAX_JSON_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const CACHE_HEADERS = { "Cache-Control": "public, max-age=31536000, immutable" };

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function requiredString(value, field, source) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new Error(`${source}: missing ${field}`);
  return normalized;
}

function canonicalXUrl(value, field, source) {
  const url = new URL(requiredString(value, field, source));
  if (url.protocol !== "https:") throw new Error(`${source}: ${field} must use HTTPS`);
  if (url.hostname === "twitter.com" || url.hostname === "www.twitter.com") url.hostname = "x.com";
  if (url.hostname === "www.x.com") url.hostname = "x.com";
  return url.toString();
}

function imageUrls(item, source) {
  const cover = canonicalXUrl(item.coverUrl, "coverUrl", source);
  const listed = Array.isArray(item.images)
    ? item.images.map((image) => image?.url).filter(Boolean).map((url) => canonicalXUrl(url, "images[].url", source))
    : [];
  if (!listed.includes(cover)) throw new Error(`${source}: coverUrl must also exist in images[]`);
  return [...new Set([cover, ...listed])];
}

function promptValue(item, source) {
  if (item.prompt_type === "json" && item.prompt && typeof item.prompt === "object") return JSON.stringify(item.prompt, null, 2);
  return requiredString(item.prompt, "prompt", source);
}

function authorFrom(item, source) {
  const sourceUrl = canonicalXUrl(item.twitterUrl, "twitterUrl", source);
  let handle = typeof item.userScreenName === "string" ? item.userScreenName.trim().replace(/^@/, "") : "";
  if (!handle) handle = new URL(sourceUrl).pathname.split("/").filter(Boolean)[0] || "";
  if (!handle) throw new Error(`${source}: unable to derive author handle`);
  const name = typeof item.userName === "string" && item.userName.trim() ? item.userName.trim() : handle;
  return { name, handle, sourceUrl };
}

function fingerprint(item) {
  return sha256(JSON.stringify({
    sourceId: item.sourceId,
    modelSlug: item.modelSlug,
    modelLabel: item.modelLabel,
    prompt: item.prompt,
    promptType: item.promptType,
    title: item.title,
    authorName: item.authorName,
    authorHandle: item.authorHandle,
    sourceUrl: item.sourceUrl,
    publishedAt: item.publishedAt,
    imageUrls: item.imageUrls,
  }));
}

export function normalizePromptItems(raw, sourceName = "prompt data") {
  if (!Array.isArray(raw)) throw new Error(`${sourceName}: root must be an array`);
  const byTweetId = new Map();
  raw.forEach((item, index) => {
    const source = `${sourceName}[${index}]`;
    const sourceId = requiredString(String(item.tweetId || ""), "tweetId", source);
    const model = resolveModelPromptPage(requiredString(item.model, "model", source));
    if (!model) throw new Error(`${source}: unknown model label "${item.model}"`);
    const author = authorFrom(item, source);
    const publishedAt = new Date(requiredString(item.publishedAt, "publishedAt", source)).getTime();
    if (!Number.isSafeInteger(publishedAt)) throw new Error(`${source}: invalid publishedAt`);
    const normalized = {
      id: sourceId,
      sourceId,
      modelSlug: model.slug,
      modelLabel: model.sourceLabel,
      prompt: promptValue(item, source),
      promptType: item.prompt_type === "json" ? "json" : "text",
      title: typeof item.title === "string" && item.title.trim() ? item.title.trim() : null,
      authorName: author.name,
      authorHandle: author.handle,
      sourceUrl: author.sourceUrl,
      viewCount: Number.isFinite(Number(item.viewCount)) ? Number(item.viewCount) : null,
      publishedAt,
      imageUrls: imageUrls(item, source),
    };
    normalized.sourceFingerprint = fingerprint(normalized);
    const existing = byTweetId.get(sourceId);
    if (!existing) byTweetId.set(sourceId, normalized);
    else if ((normalized.viewCount ?? -1) > (existing.viewCount ?? -1)) existing.viewCount = normalized.viewCount;
  });
  return [...byTweetId.values()];
}

export function parsePromptFileName(fileName) {
  const base = path.basename(fileName);
  if (!base.toLowerCase().endsWith(".json")) throw new Error(`${base}: expected a .json file`);
  const dates = [...base.matchAll(/(?<!\d)(20\d{6})(?!\d)/g)].map((match) => match[1]);
  if (dates.length !== 1) throw new Error(`${base}: filename must contain exactly one YYYYMMDD date`);
  const rawDate = dates[0];
  const year = Number(rawDate.slice(0, 4));
  const month = Number(rawDate.slice(4, 6));
  const day = Number(rawDate.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error(`${base}: invalid date ${rawDate}`);
  const dateIndex = base.indexOf(rawDate);
  const before = base.slice(0, dateIndex).replace(/[-_.]+$/, "").toLowerCase();
  const after = base.slice(dateIndex + 8, -5);
  const partMatch = /^-(\d+)$/.exec(after);
  const sequence = !after ? 1 : partMatch ? Number(partMatch[1]) : 1;
  const seriesName = after && !partMatch ? `${before}-${after.replace(/^[-_.]+/, "").toLowerCase()}` : before;
  return { fileName: base, sourceDate: Number(rawDate), seriesName, sequence };
}

export function comparePromptFiles(a, b) {
  return a.sourceDate - b.sourceDate
    || a.seriesName.localeCompare(b.seriesName)
    || a.sequence - b.sequence
    || a.fileName.localeCompare(b.fileName, "en", { numeric: true });
}

export async function loadExistingPromptItems(db, ids) {
  const found = [];
  for (let index = 0; index < ids.length; index += 100) {
    found.push(...await db.select().from(promptItems).where(inArray(promptItems.sourceId, ids.slice(index, index + 100))));
  }
  return new Map(found.map((row) => [row.sourceId, row]));
}

export async function previewPromptItems(db, items) {
  const existing = await loadExistingPromptItems(db, items.map((item) => item.sourceId));
  const result = { total: items.length, newCount: 0, duplicateCount: 0, changedCount: 0, changes: [] };
  for (const item of items) {
    const current = existing.get(item.sourceId);
    if (!current) result.newCount += 1;
    else if (current.sourceFingerprint && current.sourceFingerprint === item.sourceFingerprint) result.duplicateCount += 1;
    else {
      result.changedCount += 1;
      const fields = ["modelSlug", "modelLabel", "prompt", "promptType", "title", "authorName", "authorHandle", "sourceUrl", "publishedAt"]
        .filter((field) => current[field] !== item[field]);
      const currentImageUrls = (Array.isArray(current.images) ? current.images : []).map((image) => image?.sourceUrl).filter(Boolean);
      if (!currentImageUrls.length || JSON.stringify(currentImageUrls) !== JSON.stringify(item.imageUrls)) fields.push("images");
      result.changes.push({ sourceId: item.sourceId, sourceUrl: item.sourceUrl, fields: [...new Set(fields)] });
    }
  }
  return result;
}

async function downloadImage(url, attempt = 0) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { "User-Agent": "FreeTexttoImage prompt importer" } });
    if (!response.ok) {
      if ((response.status === 429 || response.status >= 500) && attempt < 3) throw new Error(`retry:${response.status}`);
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    const declared = Number(response.headers.get("content-length"));
    if (declared > MAX_IMAGE_BYTES) throw new Error(`Image exceeds 20 MB: ${url}`);
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_IMAGE_BYTES) { await reader.cancel(); throw new Error(`Image exceeds 20 MB: ${url}`); }
      chunks.push(value);
    }
    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), size);
  } catch (error) {
    if (attempt >= 3 || (!String(error?.message).startsWith("retry:") && error?.name !== "TimeoutError" && error?.name !== "TypeError")) throw error;
    await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
    return downloadImage(url, attempt + 1);
  }
}

async function retry(task, attempt = 0) {
  try { return await task(); }
  catch (error) {
    if (attempt >= 4) throw error;
    await new Promise((resolve) => setTimeout(resolve, 600 * (2 ** attempt)));
    return retry(task, attempt + 1);
  }
}

function extension(format) {
  return ({ jpeg: "jpg", png: "png", webp: "webp", gif: "gif", avif: "avif" })[format];
}

async function mapConcurrent(values, concurrency, task) {
  const results = new Array(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await task(values[index], index);
    }
  }));
  return results;
}

async function prepareImages(item, storage, concurrency) {
  const coverUrl = item.imageUrls[0];
  const assets = await mapConcurrent(item.imageUrls, concurrency, async (url) => {
    const buffer = await downloadImage(url);
    const hash = sha256(buffer);
    const metadata = await sharp(buffer, { animated: false, limitInputPixels: 80_000_000 }).metadata();
    const ext = extension(metadata.format);
    if (!ext || !metadata.width || !metadata.height) throw new Error(`Unsupported image format: ${url}`);
    const swapped = [5, 6, 7, 8].includes(metadata.orientation);
    const originalKey = `prompts/original/${hash}.${ext}`;
    const coverThumbnailKey = `prompts/thumb/cover-v2/${hash}.webp`;
    const thumbnailKey = `prompts/thumb/detail-v3/${hash}.webp`;
    if (!(await retry(() => storage.objectExists(originalKey)))) await retry(() => storage.uploadObject(originalKey, buffer, `image/${metadata.format === "jpeg" ? "jpeg" : metadata.format}`, CACHE_HEADERS));
    if (!(await retry(() => storage.objectExists(thumbnailKey)))) {
      const thumbnail = await sharp(buffer, { animated: false }).rotate().resize({ width: DETAIL_THUMBNAIL_WIDTH }).webp({ quality: 74 }).toBuffer();
      await retry(() => storage.uploadObject(thumbnailKey, thumbnail, "image/webp", CACHE_HEADERS));
    }
    if (url === coverUrl && !(await retry(() => storage.objectExists(coverThumbnailKey)))) {
      const thumbnail = await sharp(buffer, { animated: false }).rotate().resize({ width: COVER_THUMBNAIL_WIDTH }).webp({ quality: 82 }).toBuffer();
      await retry(() => storage.uploadObject(coverThumbnailKey, thumbnail, "image/webp", CACHE_HEADERS));
    }
    return { hash, sourceUrl: url, originalKey, thumbnailKey, ...(url === coverUrl ? { coverThumbnailKey } : {}), width: swapped ? metadata.height : metadata.width, height: swapped ? metadata.width : metadata.height };
  });
  const seen = new Set();
  return assets.filter((asset) => !seen.has(asset.hash) && seen.add(asset.hash));
}

export async function importPromptItem({ db, storage, item, existing, allowUpdates = false, concurrency = 2 }) {
  if (existing?.sourceFingerprint === item.sourceFingerprint) return "skipped";
  if (existing && !allowUpdates) return "changed";
  const images = await prepareImages(item, storage, concurrency);
  const now = new Date().toISOString();
  const row = { ...item, images, createdAt: existing?.createdAt || now, updatedAt: now };
  delete row.imageUrls;
  await db.insert(promptItems).values(row).onConflictDoUpdate({
    target: promptItems.id,
    set: {
      modelSlug: row.modelSlug, modelLabel: row.modelLabel, prompt: row.prompt, promptType: row.promptType,
      title: row.title, authorName: row.authorName, authorHandle: row.authorHandle, sourceUrl: row.sourceUrl,
      viewCount: row.viewCount, publishedAt: row.publishedAt, images: row.images,
      sourceFingerprint: row.sourceFingerprint, updatedAt: now,
    },
  });
  return existing ? "updated" : "inserted";
}
