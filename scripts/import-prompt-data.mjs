import { createHash } from "node:crypto";
import { open, readFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { inArray, sql } from "drizzle-orm";
import sharp from "sharp";
import { promptImportFiles, promptItems } from "../src/lib/schema.js";
import { resolveModelPromptPage } from "../src/lib/model-prompt-pages.js";

const dryRun = process.argv.includes("--dry-run");
const inputs = process.argv.slice(2).filter((value) => !value.startsWith("--"));
const lockPath = path.join(process.cwd(), ".prompt-import.lock");
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const CACHE_HEADERS = { "Cache-Control": "public, max-age=31536000, immutable" };

try { loadEnvFile(".env.local"); } catch {}

function requiredString(value, field, source) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new Error(`${source}: missing ${field}`);
  return normalized;
}

function imageUrls(item, source) {
  const cover = requiredString(item.coverUrl, "coverUrl", source);
  const listed = Array.isArray(item.images) ? item.images.map((image) => image?.url).filter(Boolean) : [];
  if (!listed.includes(cover)) throw new Error(`${source}: coverUrl must also exist in images[]`);
  const urls = [...new Set([cover, ...listed])];
  for (const value of urls) {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${source}: unsupported image URL`);
  }
  return urls;
}

function promptValue(item, source) {
  if (item.prompt_type === "json" && item.prompt && typeof item.prompt === "object") {
    return JSON.stringify(item.prompt, null, 2);
  }
  return requiredString(item.prompt, "prompt", source);
}

function authorFrom(item, source) {
  const sourceUrl = requiredString(item.twitterUrl, "twitterUrl", source);
  let handle = typeof item.userScreenName === "string" ? item.userScreenName.trim().replace(/^@/, "") : "";
  if (!handle) {
    const url = new URL(sourceUrl);
    handle = url.pathname.split("/").filter(Boolean)[0] || "";
  }
  if (!handle) throw new Error(`${source}: unable to derive author handle`);
  const name = typeof item.userName === "string" && item.userName.trim() ? item.userName.trim() : handle;
  return { name, handle, sourceUrl };
}

function normalizeItems(raw, filePath) {
  if (!Array.isArray(raw)) throw new Error(`${filePath}: root must be an array`);
  const ids = new Set();
  return raw.map((item, index) => {
    const source = `${filePath}[${index}]`;
    const sourceId = requiredString(String(item.tweetId || ""), "tweetId", source);
    const model = resolveModelPromptPage(requiredString(item.model, "model", source));
    if (!model) throw new Error(`${source}: unknown model label "${item.model}"`);
    const author = authorFrom(item, source);
    const id = `${model.sourceKey}:${sourceId}`;
    if (ids.has(id)) throw new Error(`${source}: duplicate prompt id ${id}`);
    ids.add(id);
    const publishedAt = new Date(requiredString(item.publishedAt, "publishedAt", source)).getTime();
    if (!Number.isSafeInteger(publishedAt)) throw new Error(`${source}: invalid publishedAt`);
    return {
      id,
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
  });
}

async function download(url, attempt = 0) {
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
    return download(url, attempt + 1);
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

async function retryStorage(task, attempt = 0) {
  try {
    return await task();
  } catch (error) {
    if (attempt >= 4) throw error;
    await new Promise((resolve) => setTimeout(resolve, 600 * (2 ** attempt)));
    return retryStorage(task, attempt + 1);
  }
}

async function loadExisting(db, ids) {
  const found = [];
  for (let index = 0; index < ids.length; index += 100) {
    found.push(...await db.select().from(promptItems).where(inArray(promptItems.id, ids.slice(index, index + 100))));
  }
  return new Map(found.map((row) => [row.id, row]));
}

function stableComparable(row) {
  return JSON.stringify({
    modelSlug: row.modelSlug,
    prompt: row.prompt,
    promptType: row.promptType,
    sourceUrl: row.sourceUrl,
    publishedAt: row.publishedAt,
    images: row.images,
  });
}

async function collectJsonFiles(input) {
  const absolute = path.resolve(input);
  const info = await stat(absolute);
  if (info.isFile()) {
    if (!absolute.endsWith(".json")) throw new Error(`${input}: expected a .json file or directory`);
    return [absolute];
  }
  if (!info.isDirectory()) throw new Error(`${input}: expected a .json file or directory`);
  const entries = await readdir(absolute, { withFileTypes: true });
  const nested = await Promise.all(entries.sort((a, b) => a.name.localeCompare(b.name)).map((entry) => {
    const child = path.join(absolute, entry.name);
    if (entry.isDirectory()) return collectJsonFiles(child);
    return entry.isFile() && entry.name.endsWith(".json") ? [child] : [];
  }));
  return nested.flat();
}

async function importFile(filePath, db, storage) {
  const contents = await readFile(filePath);
  const fileHash = createHash("sha256").update(contents).digest("hex");
  const items = normalizeItems(JSON.parse(contents.toString("utf8")), filePath);
  if (dryRun) {
    console.log(`✓ ${filePath}: ${items.length} prompts, ${new Set(items.flatMap((item) => item.imageUrls)).size} source images`);
    return;
  }

  const [ledger] = await db.select().from(promptImportFiles).where(sql`${promptImportFiles.fileHash} = ${fileHash}`).limit(1);
  if (ledger?.status === "completed") { console.log(`↷ ${filePath}: already imported`); return; }
  const startedAt = new Date().toISOString();
  await db.insert(promptImportFiles).values({ fileHash, filePath, status: "running", itemCount: items.length, startedAt })
    .onConflictDoUpdate({ target: promptImportFiles.fileHash, set: { status: "running", error: null, startedAt, completedAt: null } });

  try {
    const uniqueUrls = [...new Set(items.flatMap((item) => item.imageUrls))];
    const assets = await mapConcurrent(uniqueUrls, 4, async (url, index) => {
      const buffer = await download(url);
      const hash = createHash("sha256").update(buffer).digest("hex");
      const metadata = await sharp(buffer, { animated: false, limitInputPixels: 80_000_000 }).metadata();
      const ext = extension(metadata.format);
      if (!ext || !metadata.width || !metadata.height) throw new Error(`Unsupported image format: ${url}`);
      const swapped = [5, 6, 7, 8].includes(metadata.orientation);
      const originalKey = `prompts/original/${hash}.${ext}`;
      const thumbnailKey = `prompts/thumb/v1/${hash}.webp`;
      if (!(await retryStorage(() => storage.objectExists(originalKey)))) {
        await retryStorage(() => storage.uploadObject(originalKey, buffer, `image/${metadata.format === "jpeg" ? "jpeg" : metadata.format}`, CACHE_HEADERS));
      }
      if (!(await retryStorage(() => storage.objectExists(thumbnailKey)))) {
        const thumb = await sharp(buffer, { animated: false }).rotate().resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
        await retryStorage(() => storage.uploadObject(thumbnailKey, thumb, "image/webp", CACHE_HEADERS));
      }
      process.stdout.write(`\r  images ${index + 1}/${uniqueUrls.length}`);
      return { url, hash, originalKey, thumbnailKey, width: swapped ? metadata.height : metadata.width, height: swapped ? metadata.width : metadata.height };
    });
    process.stdout.write("\n");
    const byUrl = new Map(assets.map((asset) => [asset.url, asset]));
    const now = new Date().toISOString();
    const rows = items.map(({ imageUrls: urls, ...item }) => {
      const seen = new Set();
      const images = urls.map((url) => byUrl.get(url)).filter((asset) => asset && !seen.has(asset.hash) && seen.add(asset.hash))
        .map(({ hash, originalKey, thumbnailKey, width, height }) => ({ hash, originalKey, thumbnailKey, width, height }));
      return { ...item, images, createdAt: now, updatedAt: now };
    });
    const existing = await loadExisting(db, rows.map((row) => row.id));
    for (const row of rows) {
      const old = existing.get(row.id);
      if (old && stableComparable(old) !== stableComparable({ ...row, viewCount: old.viewCount })) throw new Error(`Prompt conflict for ${row.id}`);
    }
    for (let index = 0; index < rows.length; index += 40) {
      await db.insert(promptItems).values(rows.slice(index, index + 40)).onConflictDoUpdate({
        target: promptItems.id,
        set: { viewCount: sql`CASE WHEN excluded.view_count IS NULL THEN ${promptItems.viewCount} WHEN ${promptItems.viewCount} IS NULL OR excluded.view_count > ${promptItems.viewCount} THEN excluded.view_count ELSE ${promptItems.viewCount} END`, updatedAt: now },
      });
    }
    await db.update(promptImportFiles).set({ status: "completed", completedAt: new Date().toISOString(), error: null }).where(sql`${promptImportFiles.fileHash} = ${fileHash}`);
    console.log(`✓ ${filePath}: imported ${rows.length} prompts`);
  } catch (error) {
    await db.update(promptImportFiles).set({ status: "failed", completedAt: new Date().toISOString(), error: String(error?.message || error).slice(0, 2000) }).where(sql`${promptImportFiles.fileHash} = ${fileHash}`);
    throw error;
  }
}

async function main() {
  const requested = inputs.length ? inputs : ["data/img-20260911-GPT2.5-86-items.json"];
  const files = [...new Set((await Promise.all(requested.map(collectJsonFiles))).flat())].sort();
  if (!files.length) throw new Error("No JSON files found");
  let itemCount = 0;
  let imageCount = 0;
  for (const filePath of files) {
    const contents = await readFile(filePath, "utf8");
    const raw = JSON.parse(contents);
    const items = normalizeItems(raw, filePath);
    itemCount += items.length;
    imageCount += items.reduce((total, item) => total + item.imageUrls.length, 0);
  }
  console.log(`✓ validated ${files.length} files, ${itemCount} importable prompts, ${imageCount} image references`);
  if (dryRun) {
    return;
  }
  const lock = await open(lockPath, "wx").catch(() => { throw new Error("Another prompt import is running (.prompt-import.lock exists)."); });
  try {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local");
    const db = drizzle(createClient({ url, authToken }));
    const storage = await import("../src/lib/storage.js");
    if (!storage.s3Configured || !process.env.S3_PUBLIC_URL) throw new Error("S3 storage and S3_PUBLIC_URL must be configured");
    for (const filePath of files) await importFile(filePath, db, storage);
  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
  }
}

main().catch((error) => { console.error(`\n✗ ${error?.message || error}`); process.exitCode = 1; });
