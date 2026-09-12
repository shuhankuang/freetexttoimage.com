import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { promptImportJobs } from "@/lib/schema";
import { promptImportsEnabled } from "@/lib/prompt-import-settings";

async function allowed() {
  const session = await auth.api.getSession({ headers: await headers() });
  return Boolean(session?.user && isAdminEmail(session.user.email));
}

export async function POST(request, { params }) {
  if (!(await allowed())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const [job] = await db.select().from(promptImportJobs).where(eq(promptImportJobs.id, id)).limit(1);
  if (!job) return NextResponse.json({ error: "Import job not found." }, { status: 404 });
  const now = new Date().toISOString();
  if (body.action === "confirm" && job.status === "preview") {
    if (!promptImportsEnabled()) return NextResponse.json({ error: "Prompt imports are disabled. Enable PROMPT_IMPORT_ENABLED before queueing a job." }, { status: 409 });
    const allowUpdates = job.changedCount > 0 && body.allowUpdates === true;
    if (job.changedCount > 0 && !allowUpdates) return NextResponse.json({ error: "Confirm updates before importing changed records." }, { status: 400 });
    const [updated] = await db.update(promptImportJobs).set({ status: "queued", allowUpdates, confirmedAt: now }).where(and(eq(promptImportJobs.id, id), eq(promptImportJobs.status, "preview"))).returning();
    return NextResponse.json({ job: updated });
  }
  if (body.action === "retry" && ["failed", "completed_with_errors"].includes(job.status)) {
    const [updated] = await db.update(promptImportJobs).set({ status: "queued", processedCount: 0, insertedCount: 0, updatedCount: 0, skippedCount: 0, failedCount: 0, errors: [], completedAt: null }).where(and(eq(promptImportJobs.id, id), inArray(promptImportJobs.status, ["failed", "completed_with_errors"]))).returning();
    return NextResponse.json({ job: updated });
  }
  return NextResponse.json({ error: "This action is not available for the current job." }, { status: 409 });
}
