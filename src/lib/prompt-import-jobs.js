import "server-only";

import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { promptImportJobs } from "@/lib/schema";

export async function listPromptImportJobs(limit = 20) {
  return db.select().from(promptImportJobs).orderBy(desc(promptImportJobs.createdAt)).limit(limit);
}
