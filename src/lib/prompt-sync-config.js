import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { promptSyncSettings, promptSyncSources } from "@/lib/schema";
import { PROMPT_SYNC_DEFAULTS } from "@/lib/prompt-sync-defaults";

export async function ensurePromptSyncConfig() {
  const now = new Date().toISOString();
  const [setting] = await db.select().from(promptSyncSettings).where(eq(promptSyncSettings.id, 1)).limit(1);
  if (!setting) await db.insert(promptSyncSettings).values({ id: 1, enabled: true, updatedAt: now });
  const existing = await db.select({ id: promptSyncSources.id }).from(promptSyncSources);
  const ids = new Set(existing.map((row) => row.id));
  for (const source of PROMPT_SYNC_DEFAULTS) if (!ids.has(source.id)) {
    await db.insert(promptSyncSources).values({
      id: source.id,
      name: source.name,
      preset: source.id,
      query: source.query,
      enabled: true,
      lookbackHours: 48,
      maxRecords: 500,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function getPromptSyncConfig() {
  await ensurePromptSyncConfig();
  const [settings, sources] = await Promise.all([
    db.select().from(promptSyncSettings).where(eq(promptSyncSettings.id, 1)).limit(1),
    db.select().from(promptSyncSources),
  ]);
  return { settings: settings[0], sources };
}
