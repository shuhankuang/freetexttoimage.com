import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-auth";
import { getPromptImportSummary, listPromptImportJobs } from "@/lib/prompt-import-jobs";
import { promptImportsEnabled } from "@/lib/prompt-import-settings";
import { getPromptSyncConfig } from "@/lib/prompt-sync-config";

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
  const [jobs, summary, syncConfig] = await Promise.all([listPromptImportJobs(limit, offset), getPromptImportSummary(), getPromptSyncConfig()]);
  return NextResponse.json({
    jobs,
    summary,
    importsEnabled: promptImportsEnabled() && syncConfig.settings.enabled,
    syncConfig,
    hasMore: offset + jobs.length < summary.jobs,
  });
}
