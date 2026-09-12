import { createHash } from "node:crypto";
import { open, readFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { loadEnvFile } from "node:process";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const continueOnError = args.includes("--continue-on-error");
const envArg = args.find((value) => value.startsWith("--env="));
const envFile = envArg?.slice("--env=".length) || ".env.local";
const inputs = args.filter((value) => !value.startsWith("--"));
const lockPath = path.join(process.cwd(), ".prompt-import.lock");

try { loadEnvFile(envFile); } catch (error) {
  if (envArg) throw new Error(`Unable to load ${envFile}: ${error.message}`);
}

const [{ createClient }, { drizzle }, { eq }, schema, core, storage] = await Promise.all([
  import("@libsql/client"), import("drizzle-orm/libsql"), import("drizzle-orm"),
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
    return entry.isFile() && entry.name.endsWith(".json") ? [child] : [];
  }));
  return nested.flat();
}

async function readSource(filePath) {
  const contents = await readFile(filePath);
  if (contents.byteLength > core.MAX_JSON_BYTES) throw new Error(`${filePath}: JSON exceeds 2 MB`);
  const order = core.parsePromptFileName(filePath);
  const items = core.normalizePromptItems(JSON.parse(contents.toString("utf8")), filePath);
  return { filePath, contents, items, ...order };
}

async function importSource(source, db) {
  const fileHash = createHash("sha256").update(core.PROMPT_IMPORT_VERSION).update("\0").update(source.contents).digest("hex");
  const [ledger] = await db.select().from(schema.promptImportFiles).where(eq(schema.promptImportFiles.fileHash, fileHash)).limit(1);
  if (ledger?.status === "completed") { console.log(`↷ ${source.fileName}: already imported`); return; }
  const startedAt = new Date().toISOString();
  await db.insert(schema.promptImportFiles).values({ fileHash, filePath: source.filePath, status: "running", itemCount: source.items.length, startedAt })
    .onConflictDoUpdate({ target: schema.promptImportFiles.fileHash, set: { status: "running", error: null, startedAt, completedAt: null } });
  const existing = await core.loadExistingPromptItems(db, source.items.map((item) => item.sourceId));
  let inserted = 0;
  let skipped = 0;
  const errors = [];
  for (let index = 0; index < source.items.length; index += 1) {
    const item = source.items[index];
    if (existing.has(item.sourceId)) { skipped += 1; continue; }
    try {
      await core.importPromptItem({ db, storage, item, concurrency: 4 });
      inserted += 1;
    } catch (error) { errors.push(`${item.sourceId}: ${error?.message || error}`); }
    process.stdout.write(`\r  prompts ${index + 1}/${source.items.length}${errors.length ? ` (${errors.length} failed)` : ""}`);
  }
  process.stdout.write("\n");
  const completedAt = new Date().toISOString();
  if (errors.length) {
    await db.update(schema.promptImportFiles).set({ status: "failed", error: errors.slice(0, 20).join("\n").slice(0, 2000), completedAt }).where(eq(schema.promptImportFiles.fileHash, fileHash));
    throw new Error(`${source.fileName}: ${errors.length} prompts failed`);
  }
  await db.update(schema.promptImportFiles).set({ status: "completed", error: null, completedAt }).where(eq(schema.promptImportFiles.fileHash, fileHash));
  console.log(`✓ ${source.fileName}: inserted ${inserted}, skipped ${skipped}`);
}

async function main() {
  const requested = inputs.length ? inputs : ["data/img-20260911-GPT2.5-86-items.json"];
  const paths = [...new Set((await Promise.all(requested.map(collectJsonFiles))).flat())];
  const sources = (await Promise.all(paths.map(readSource))).sort(core.comparePromptFiles);
  if (!sources.length) throw new Error("No JSON files found");
  const uniqueTweetIds = new Set();
  let duplicateCount = 0;
  let imageCount = 0;
  for (const source of sources) for (const item of source.items) {
    if (uniqueTweetIds.has(item.sourceId)) duplicateCount += 1;
    else { uniqueTweetIds.add(item.sourceId); imageCount += item.imageUrls.length; }
  }
  console.log(`✓ ${sources.length} files sorted ${sources[0].sourceDate} → ${sources.at(-1).sourceDate}`);
  console.log(`✓ ${uniqueTweetIds.size} unique prompts, ${imageCount} image references, ${duplicateCount} duplicate tweetIds`);
  if (dryRun) return;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error(`Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in ${envFile}`);
  if (!storage.s3Configured || !process.env.S3_PUBLIC_URL) throw new Error(`Set S3 storage variables in ${envFile}`);
  const db = drizzle(createClient({ url, authToken }));
  const lock = await open(lockPath, "wx").catch(() => { throw new Error("Another prompt import is running (.prompt-import.lock exists)."); });
  const failed = [];
  try {
    for (const source of sources) {
      try { await importSource(source, db); }
      catch (error) {
        failed.push(error.message);
        console.error(`✗ ${error.message}`);
        if (!continueOnError) throw error;
      }
    }
  } finally { await lock.close(); await rm(lockPath, { force: true }); }
  if (failed.length) throw new Error(`${failed.length} files failed:\n${failed.join("\n")}`);
}

main().catch((error) => { console.error(`\n✗ ${error?.message || error}`); process.exitCode = 1; });
