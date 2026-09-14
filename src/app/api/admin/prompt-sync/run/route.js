import path from "node:path";
import { spawn } from "node:child_process";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { promptSyncSettings, promptSyncSources } from "@/lib/schema";
import { promptImportsEnabled } from "@/lib/prompt-import-settings";

export const runtime = "nodejs";
export async function POST(request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || !isAdminEmail(session.user.email)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!promptImportsEnabled()) return NextResponse.json({ error: "Prompt imports are disabled." }, { status: 409 });
  const [setting] = await db.select().from(promptSyncSettings).where(eq(promptSyncSettings.id, 1)).limit(1);
  if (setting && !setting.enabled) return NextResponse.json({ error: "Automatic sync is paused." }, { status: 409 });
  const body = await request.json().catch(() => ({}));
  const [source] = await db.select().from(promptSyncSources).where(eq(promptSyncSources.id, String(body.id || ""))).limit(1);
  if (!source) return NextResponse.json({ error: "Sync source not found." }, { status: 404 });
  if (!source.enabled) return NextResponse.json({ error: "Enable this sync source first." }, { status: 409 });
  const scriptArgs = ["--preset", source.preset, "--query", source.query, "--lookback-hours", "1", "--limit", "100", "--apply"];
  const child = spawn(process.execPath, [path.resolve("scripts/import-twitter-prompts.mjs"), ...scriptArgs], { cwd: process.cwd(), env: process.env, detached: true, stdio: "ignore" });
  child.unref();
  return NextResponse.json({ started: true, source: source.id }, { status: 202 });
}
