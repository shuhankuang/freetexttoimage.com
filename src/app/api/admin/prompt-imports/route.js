import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { promptImportJobs } from "@/lib/schema";
import { getPromptImportSummary, listPromptImportJobs } from "@/lib/prompt-import-jobs";
import { promptImportsEnabled } from "@/lib/prompt-import-settings";
import { MAX_JSON_BYTES, normalizePromptItems, parsePromptFileName, previewPromptItems, sha256 } from "@/lib/prompt-import-core";
import { objectExists, uploadObject } from "@/lib/storage";

const MAX_FILES = 20;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

export const runtime = "nodejs";

async function adminSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user && isAdminEmail(session.user.email) ? session : null;
}

export async function GET(request) {
  if (!(await adminSession())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 50);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
  const [jobs, summary] = await Promise.all([listPromptImportJobs(limit, offset), getPromptImportSummary()]);
  return NextResponse.json({
    jobs,
    summary,
    importsEnabled: promptImportsEnabled(),
    hasMore: offset + jobs.length < summary.jobs,
  });
}

export async function POST(request) {
  const session = await adminSession();
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const formData = await request.formData();
  const files = formData.getAll("files").filter((file) => file && typeof file.arrayBuffer === "function");
  if (!files.length || files.length > MAX_FILES) return NextResponse.json({ error: `Choose 1–${MAX_FILES} JSON files.` }, { status: 400 });
  if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) return NextResponse.json({ error: "The upload exceeds 20 MB." }, { status: 400 });

  const prepared = [];
  for (const file of files) {
    if (file.size > MAX_JSON_BYTES) return NextResponse.json({ error: `${file.name} exceeds 2 MB.` }, { status: 400 });
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const order = parsePromptFileName(file.name);
      const items = normalizePromptItems(JSON.parse(buffer.toString("utf8")), file.name);
      const preview = await previewPromptItems(db, items);
      prepared.push({ file, buffer, items, preview, contentHash: sha256(buffer), ...order });
    } catch (error) {
      return NextResponse.json({ error: error?.message || `Unable to validate ${file.name}.` }, { status: 400 });
    }
  }
  prepared.sort((a, b) => a.sourceDate - b.sourceDate || a.seriesName.localeCompare(b.seriesName) || a.sequence - b.sequence || a.fileName.localeCompare(b.fileName, "en", { numeric: true }));

  const jobs = [];
  for (const source of prepared) {
    const [existing] = await db.select().from(promptImportJobs).where(eq(promptImportJobs.contentHash, source.contentHash)).limit(1);
    if (existing) { jobs.push(existing); continue; }
    const objectKey = `prompts/import-source/${source.contentHash}.json`;
    if (!(await objectExists(objectKey))) await uploadObject(objectKey, source.buffer, "application/json", { "Cache-Control": "private, max-age=31536000, immutable" });
    const now = new Date().toISOString();
    const job = {
      id: randomUUID(), contentHash: source.contentHash, fileName: source.fileName, objectKey,
      sourceDate: source.sourceDate, seriesName: source.seriesName, sequence: source.sequence,
      status: "preview", totalCount: source.preview.total, newCount: source.preview.newCount,
      duplicateCount: source.preview.duplicateCount, changedCount: source.preview.changedCount,
      changes: source.preview.changes, errors: [], createdBy: session.user.email, createdAt: now,
    };
    await db.insert(promptImportJobs).values(job);
    jobs.push(job);
  }
  return NextResponse.json({ jobs, importsEnabled: promptImportsEnabled() });
}
