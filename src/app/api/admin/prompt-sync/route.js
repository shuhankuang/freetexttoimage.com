import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { promptSyncSettings, promptSyncSources } from "@/lib/schema";
import { getPromptSyncConfig } from "@/lib/prompt-sync-config";

export const runtime = "nodejs";
async function admin() { const session = await auth.api.getSession({ headers: await headers() }); return session?.user && isAdminEmail(session.user.email) ? session : null; }
export async function GET() { if (!(await admin())) return NextResponse.json({ error: "Not found" }, { status: 404 }); return NextResponse.json(await getPromptSyncConfig()); }
export async function PATCH(request) {
  const session = await admin(); if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => ({})); const now = new Date().toISOString();
  if (body.scope === "global") await db.update(promptSyncSettings).set({ enabled: Boolean(body.enabled), updatedBy: session.user.email, updatedAt: now }).where(eq(promptSyncSettings.id, 1));
  else {
    const id = String(body.id || ""); if (!id) return NextResponse.json({ error: "Missing source id." }, { status: 400 });
    const values = {}; if (typeof body.enabled === "boolean") values.enabled = body.enabled;
    if (body.lookbackHours != null) values.lookbackHours = Math.min(Math.max(Number(body.lookbackHours) || 24, 1), 168);
    if (body.maxRecords != null) values.maxRecords = Math.min(Math.max(Number(body.maxRecords) || 100, 1), 1000);
    if (typeof body.query === "string" && body.query.trim().length <= 500) values.query = body.query.trim();
    values.updatedAt = now;
    await db.update(promptSyncSources).set(values).where(eq(promptSyncSources.id, id));
  }
  return NextResponse.json(await getPromptSyncConfig());
}
