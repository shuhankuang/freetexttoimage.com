import path from "node:path";
import { spawn } from "node:child_process";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-auth";
import { promptImportsEnabled } from "@/lib/prompt-import-settings";
import { db } from "@/lib/db";
import { promptImportJobs } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export async function POST(request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || !isAdminEmail(session.user.email)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!promptImportsEnabled()) return NextResponse.json({ error: "Prompt imports are disabled." }, { status: 409 });

  const body = await request.json().catch(() => ({}));
  const jobId = typeof body?.id === "string" ? body.id.trim() : "";
  if (!jobId) return NextResponse.json({ error: "A queued task is required." }, { status: 400 });

  const [job] = await db.select({ id: promptImportJobs.id, status: promptImportJobs.status })
    .from(promptImportJobs)
    .where(eq(promptImportJobs.id, jobId))
    .limit(1);
  if (!job) return NextResponse.json({ error: "Queued task not found." }, { status: 404 });
  if (job.status !== "queued") return NextResponse.json({ error: "This task is no longer waiting in the queue." }, { status: 409 });

  const child = spawn(process.execPath, [path.resolve("scripts/prompt-import-worker.mjs")], {
    cwd: process.cwd(),
    env: { ...process.env, PROMPT_IMPORT_JOB_ID: job.id },
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  return NextResponse.json({ started: true, id: job.id }, { status: 202 });
}
