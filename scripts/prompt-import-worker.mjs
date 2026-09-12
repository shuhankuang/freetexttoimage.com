import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";

const envArg = process.argv.slice(2).find((value) => value.startsWith("--env="));
const envFile = envArg?.slice("--env=".length) || ".env.local";
try { loadEnvFile(envFile); } catch (error) {
  if (envArg) throw new Error(`Unable to load ${envFile}: ${error.message}`);
}

const checkMode = process.argv.includes("--check");
const importsEnabled = String(process.env.PROMPT_IMPORT_ENABLED || "").trim().toLowerCase() === "true";
if (!importsEnabled && !checkMode) {
  console.log("Prompt imports are disabled (PROMPT_IMPORT_ENABLED is not true); exiting.");
  process.exit(0);
}

const [{ createClient }, { drizzle }, orm, schema, core, storage] = await Promise.all([
  import("@libsql/client"), import("drizzle-orm/libsql"), import("drizzle-orm"),
  import("../src/lib/schema.js"), import("../src/lib/prompt-import-core.js"), import("../src/lib/storage.js"),
]);

const { and, asc, eq, lt } = orm;
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required");
if (!storage.s3Configured) throw new Error("S3 storage is required");
const client = createClient({ url, authToken });
const db = drizzle(client);
const owner = randomUUID();
const lockId = "prompt-import-worker";
const lockMs = 10 * 60 * 1000;
const concurrency = Math.min(Math.max(Number(process.env.PROMPT_IMPORT_CONCURRENCY) || 2, 1), 4);

async function acquireLock() {
  const now = Date.now();
  await client.execute({
    sql: `INSERT INTO prompt_import_worker_locks (id, owner, expires_at) VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET owner=excluded.owner, expires_at=excluded.expires_at
      WHERE prompt_import_worker_locks.expires_at < ?`,
    args: [lockId, owner, now + lockMs, now],
  });
  const result = await client.execute({ sql: "SELECT owner FROM prompt_import_worker_locks WHERE id = ?", args: [lockId] });
  return result.rows[0]?.owner === owner;
}

async function refreshLock() {
  await client.execute({ sql: "UPDATE prompt_import_worker_locks SET expires_at = ? WHERE id = ? AND owner = ?", args: [Date.now() + lockMs, lockId, owner] });
}

async function releaseLock() {
  await client.execute({ sql: "DELETE FROM prompt_import_worker_locks WHERE id = ? AND owner = ?", args: [lockId, owner] });
}

async function nextJob() {
  return (await db.select().from(schema.promptImportJobs)
    .where(eq(schema.promptImportJobs.status, "queued"))
    .orderBy(asc(schema.promptImportJobs.sourceDate), asc(schema.promptImportJobs.seriesName), asc(schema.promptImportJobs.sequence), asc(schema.promptImportJobs.fileName))
    .limit(1))[0];
}

async function revalidateGallery() {
  const secret = process.env.PROMPT_IMPORT_WORKER_SECRET;
  const baseUrl = process.env.APP_URL || process.env.BETTER_AUTH_URL;
  if (!secret || !baseUrl) return;
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/admin/prompt-imports/revalidate`, {
    method: "POST", headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) console.warn(`Cache revalidation returned HTTP ${response.status}`);
}

async function runJob(job) {
  const startedAt = new Date().toISOString();
  const claimed = await db.update(schema.promptImportJobs).set({
    status: "running", processedCount: 0, insertedCount: 0, updatedCount: 0,
    skippedCount: 0, failedCount: 0, errors: [], startedAt, heartbeatAt: startedAt, completedAt: null,
  }).where(and(eq(schema.promptImportJobs.id, job.id), eq(schema.promptImportJobs.status, "queued"))).returning({ id: schema.promptImportJobs.id });
  if (!claimed.length) return;

  let items;
  let existing;
  try {
    const raw = JSON.parse((await storage.getObjectBuffer(job.objectKey)).toString("utf8"));
    items = core.normalizePromptItems(raw, job.fileName);
    existing = await core.loadExistingPromptItems(db, items.map((item) => item.sourceId));
    const preview = core.summarizePromptItems(items, existing);
    await db.update(schema.promptImportJobs).set({
      totalCount: preview.total, newCount: preview.newCount, duplicateCount: preview.duplicateCount,
      changedCount: preview.changedCount, changes: preview.changes,
    }).where(eq(schema.promptImportJobs.id, job.id));
  } catch (error) {
    const completedAt = new Date().toISOString();
    await db.update(schema.promptImportJobs).set({
      status: "failed", failedCount: 1, errors: [{ message: String(error?.message || error).slice(0, 500) }],
      completedAt, heartbeatAt: completedAt,
    }).where(eq(schema.promptImportJobs.id, job.id));
    console.error(`${job.fileName}: ${error?.message || error}`);
    return;
  }
  const counters = { processedCount: 0, insertedCount: 0, updatedCount: 0, skippedCount: 0, failedCount: 0 };
  const errors = [];
  for (const item of items) {
    try {
      const result = await core.importPromptItem({ db, storage, item, existing: existing.get(item.sourceId), allowUpdates: job.allowUpdates, concurrency });
      if (result === "inserted") counters.insertedCount += 1;
      else if (result === "updated") counters.updatedCount += 1;
      else if (result === "changed") throw new Error("Existing content changed but update was not confirmed");
      else counters.skippedCount += 1;
    } catch (error) {
      counters.failedCount += 1;
      errors.push({ sourceId: item.sourceId, message: String(error?.message || error).slice(0, 500) });
    }
    counters.processedCount += 1;
    const heartbeatAt = new Date().toISOString();
    await db.update(schema.promptImportJobs).set({ ...counters, errors: errors.slice(0, 100), heartbeatAt }).where(eq(schema.promptImportJobs.id, job.id));
    await refreshLock();
    console.log(`${job.fileName}: ${counters.processedCount}/${items.length}`);
  }
  const completedAt = new Date().toISOString();
  await db.update(schema.promptImportJobs).set({ status: counters.failedCount ? "completed_with_errors" : "completed", ...counters, errors: errors.slice(0, 100), completedAt, heartbeatAt: completedAt }).where(eq(schema.promptImportJobs.id, job.id));
  await revalidateGallery();
}

async function main() {
  if (checkMode) {
    const [jobs, items] = await Promise.all([
      client.execute("SELECT count(*) AS count FROM prompt_import_jobs"),
      client.execute("SELECT count(*) AS count FROM prompt_items"),
      storage.objectExists("prompts/healthcheck/credentials-check"),
    ]);
    console.log(`Prompt import check passed: ${Number(jobs.rows[0].count)} jobs, ${Number(items.rows[0].count)} prompts, database and storage reachable.`);
    console.log(`Import switch: ${importsEnabled ? "enabled" : "disabled"}. No prompt data was changed.`);
    return;
  }
  if (!(await acquireLock())) { console.log("Another prompt worker is active; exiting."); return; }
  const lockHeartbeat = setInterval(() => refreshLock().catch((error) => console.error(`Unable to refresh worker lock: ${error?.message || error}`)), 60_000);
  lockHeartbeat.unref();
  try {
    const staleBefore = new Date(Date.now() - lockMs).toISOString();
    await db.update(schema.promptImportJobs).set({ status: "queued" }).where(and(eq(schema.promptImportJobs.status, "running"), lt(schema.promptImportJobs.heartbeatAt, staleBefore)));
    while (true) {
      const job = await nextJob();
      if (!job) break;
      await runJob(job);
    }
  } finally {
    clearInterval(lockHeartbeat);
    await releaseLock();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
