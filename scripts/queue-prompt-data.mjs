import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const envArg = args.find((value) => value.startsWith("--env="));
const envFile = envArg?.slice("--env=".length) || ".env.local";
const inputs = args.filter((value) => !value.startsWith("--"));

try { loadEnvFile(envFile); } catch (error) {
  if (envArg) throw new Error(`Unable to load ${envFile}: ${error.message}`);
}

const [{ createClient }, { drizzle }, schema, core, storage] = await Promise.all([
  import("@libsql/client"), import("drizzle-orm/libsql"),
  import("../src/lib/schema.js"), import("../src/lib/prompt-import-core.js"), import("../src/lib/storage.js"),
]);

async function collectJsonFiles(input) {
  const absolute = path.resolve(input);
  const info = await stat(absolute);
  if (info.isFile()) return [absolute];
  if (!info.isDirectory()) throw new Error(`${input}: expected a .json file or directory`);
  const entries = await readdir(absolute, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const child = path.join(absolute, entry.name);
    if (entry.isDirectory()) return collectJsonFiles(child);
    return entry.isFile() && entry.name.toLowerCase().endsWith(".json") ? [child] : [];
  }));
  return nested.flat();
}

async function readSource(filePath) {
  const buffer = await readFile(filePath);
  if (buffer.byteLength > core.MAX_JSON_BYTES) throw new Error(`${filePath}: JSON exceeds 2 MB`);
  const order = core.parsePromptFileName(filePath);
  const items = core.normalizePromptItems(JSON.parse(buffer.toString("utf8")), filePath);
  return { filePath, buffer, items, contentHash: core.sha256(buffer), ...order };
}

async function retry(task, attempt = 0) {
  try { return await task(); }
  catch (error) {
    if (attempt >= 4) throw error;
    await new Promise((resolve) => setTimeout(resolve, 600 * (2 ** attempt)));
    return retry(task, attempt + 1);
  }
}

async function mapConcurrent(values, concurrency, task) {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      await task(values[index], index);
    }
  }));
}

async function main() {
  const requested = inputs.length ? inputs : ["data-01"];
  const paths = [...new Set((await Promise.all(requested.map(collectJsonFiles))).flat())];
  const orderedPaths = paths.map((filePath) => ({ filePath, ...core.parsePromptFileName(filePath) })).sort(core.comparePromptFiles);
  if (!orderedPaths.length) throw new Error("No JSON files found");

  console.log(`${apply ? "Queueing" : "Previewing"} ${orderedPaths.length} files in ${orderedPaths[0].sourceDate} → ${orderedPaths.at(-1).sourceDate} order.`);
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error(`Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in ${envFile}`);
  if (!storage.s3Configured) throw new Error(`Set S3 storage variables in ${envFile}`);
  const db = drizzle(createClient({ url, authToken }));
  const knownHashes = new Set((await db.select({ contentHash: schema.promptImportJobs.contentHash }).from(schema.promptImportJobs)).map((job) => job.contentHash));
  let existing = 0;
  const pending = [];

  for (let index = 0; index < orderedPaths.length; index += 1) {
    const source = await readSource(orderedPaths[index].filePath);
    if (knownHashes.has(source.contentHash)) {
      existing += 1;
      console.log(`[${index + 1}/${orderedPaths.length}] skip ${source.fileName} (already uploaded)`);
      continue;
    }

    console.log(`[${index + 1}/${orderedPaths.length}] ${source.fileName}: ${source.items.length} validated`);
    pending.push(source);
  }

  if (!apply) {
    console.log(`Would queue ${pending.length} files; skipped ${existing} existing files.`);
    console.log("Run again with --apply to upload and queue them.");
    return;
  }

  let uploaded = 0;
  await mapConcurrent(pending, 4, async (source) => {
    const objectKey = `prompts/import-source/${source.contentHash}.json`;
    if (!(await retry(() => storage.objectExists(objectKey)))) {
      await retry(() => storage.uploadObject(objectKey, source.buffer, "application/json", { "Cache-Control": "private, max-age=31536000, immutable" }));
    }
    uploaded += 1;
    if (uploaded % 20 === 0 || uploaded === pending.length) console.log(`Uploaded source JSON ${uploaded}/${pending.length}`);
  });

  const now = new Date().toISOString();
  const jobs = pending.map((source) => ({
    id: randomUUID(), contentHash: source.contentHash, fileName: source.fileName,
    objectKey: `prompts/import-source/${source.contentHash}.json`, sourceDate: source.sourceDate,
    seriesName: source.seriesName, sequence: source.sequence, status: "queued", allowUpdates: false,
    totalCount: source.items.length, newCount: source.items.length, duplicateCount: 0, changedCount: 0,
    changes: [], errors: [], createdBy: "bulk-cli", createdAt: now, confirmedAt: now,
  }));
  for (let index = 0; index < jobs.length; index += 100) {
    await db.insert(schema.promptImportJobs).values(jobs.slice(index, index + 100)).onConflictDoNothing({ target: schema.promptImportJobs.contentHash });
  }
  console.log(`Queued ${jobs.length} files after all source JSON uploads completed; skipped ${existing} existing files.`);
}

main().catch((error) => { console.error(`\n✗ ${error?.message || error}`); process.exitCode = 1; });
