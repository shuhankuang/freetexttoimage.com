import "server-only";

import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { promptImportJobs } from "@/lib/schema";

const lastActivityAt = sql`coalesce(${promptImportJobs.heartbeatAt}, ${promptImportJobs.completedAt}, ${promptImportJobs.startedAt}, ${promptImportJobs.confirmedAt}, ${promptImportJobs.createdAt})`;

export async function listPromptImportJobs(limit = 20, offset = 0) {
  return db.select().from(promptImportJobs)
    .orderBy(desc(lastActivityAt), desc(promptImportJobs.id))
    .limit(limit)
    .offset(offset);
}

export async function getPromptImportSummary() {
  const rows = await db.select({
    status: promptImportJobs.status,
    jobs: sql`count(*)`,
    total: sql`coalesce(sum(${promptImportJobs.totalCount}), 0)`,
    processed: sql`coalesce(sum(${promptImportJobs.processedCount}), 0)`,
    inserted: sql`coalesce(sum(${promptImportJobs.insertedCount}), 0)`,
    skipped: sql`coalesce(sum(${promptImportJobs.skippedCount}), 0)`,
    failed: sql`coalesce(sum(${promptImportJobs.failedCount}), 0)`,
  }).from(promptImportJobs).groupBy(promptImportJobs.status);

  const summary = {
    jobs: 0,
    queuedJobs: 0,
    runningJobs: 0,
    completedJobs: 0,
    attentionJobs: 0,
    totalRecords: 0,
    processedRecords: 0,
    insertedRecords: 0,
    skippedRecords: 0,
    failedRecords: 0,
  };

  for (const row of rows) {
    const jobs = Number(row.jobs);
    summary.jobs += jobs;
    summary.totalRecords += Number(row.total);
    summary.processedRecords += Number(row.processed);
    summary.insertedRecords += Number(row.inserted);
    summary.skippedRecords += Number(row.skipped);
    summary.failedRecords += Number(row.failed);
    if (row.status === "queued") summary.queuedJobs += jobs;
    else if (row.status === "running") summary.runningJobs += jobs;
    else if (row.status === "completed") summary.completedJobs += jobs;
    else if (["completed_with_errors", "failed"].includes(row.status)) summary.attentionJobs += jobs;
  }

  return summary;
}
