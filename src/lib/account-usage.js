import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import { Buffer } from "node:buffer";
import { db } from "@/lib/db";
import { creditLedger, generationJobs } from "@/lib/schema";
import { listProviders } from "@/lib/models";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MODEL_LABELS = new Map(listProviders().map((model) => [model.id, model.label]));

function encodeCursor(row) {
  return Buffer.from(JSON.stringify([row.createdAt, row.id])).toString("base64url");
}

function decodeCursor(value) {
  if (!value) return null;
  try {
    const [createdAt, id] = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt)) || typeof id !== "string" || !id) {
      throw new Error("invalid cursor values");
    }
    return { createdAt, id };
  } catch {
    const error = new Error("Invalid usage cursor");
    error.code = "INVALID_CURSOR";
    throw error;
  }
}

function creditState(job, held, refunded) {
  if (held <= 0) return "untracked";
  if (job.status === "processing") return "reserved";
  if (job.status === "failed") return refunded >= held ? "refunded" : "refund_pending";
  return "charged";
}

export async function listGenerationUsage(userId, { limit = DEFAULT_PAGE_SIZE, cursor: rawCursor } = {}) {
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(limit, 10) || DEFAULT_PAGE_SIZE));
  const cursor = decodeCursor(rawCursor);
  const afterCursor = (value) => or(
    lt(generationJobs.createdAt, value.createdAt),
    and(eq(generationJobs.createdAt, value.createdAt), lt(generationJobs.id, value.id))
  );
  const where = cursor
    ? and(eq(generationJobs.userId, userId), afterCursor(cursor))
    : eq(generationJobs.userId, userId);

  const rows = await db
    .select({
      id: generationJobs.id,
      model: generationJobs.model,
      status: generationJobs.status,
      createdAt: generationJobs.createdAt,
    })
    .from(generationJobs)
    .where(where)
    .orderBy(desc(generationJobs.createdAt), desc(generationJobs.id))
    .limit(pageSize + 1);

  const pageRows = rows.slice(0, pageSize);
  if (pageRows.length === 0) return { items: [], nextCursor: null };

  const jobIds = pageRows.map((row) => row.id);
  const ledgerRows = await db
    .select({
      refId: creditLedger.refId,
      delta: creditLedger.delta,
      reason: creditLedger.reason,
    })
    .from(creditLedger)
    .where(and(
      eq(creditLedger.userId, userId),
      eq(creditLedger.refType, "job"),
      inArray(creditLedger.refId, jobIds),
      or(eq(creditLedger.reason, "generation_hold"), eq(creditLedger.reason, "generation_refund"))
    ));

  const totals = new Map();
  for (const entry of ledgerRows) {
    const current = totals.get(entry.refId) || { held: 0, refunded: 0 };
    if (entry.reason === "generation_hold") current.held += Math.abs(entry.delta);
    if (entry.reason === "generation_refund") current.refunded += Math.max(0, entry.delta);
    totals.set(entry.refId, current);
  }

  const hasMore = rows.length > pageSize;
  const last = pageRows.at(-1);
  return {
    items: pageRows.map((job) => {
      const { held, refunded } = totals.get(job.id) || { held: 0, refunded: 0 };
      return {
        id: job.id,
        model: MODEL_LABELS.get(job.model) || job.model,
        status: job.status,
        credits: held,
        creditState: creditState(job, held, refunded),
        createdAt: job.createdAt,
      };
    }),
    nextCursor: hasMore ? encodeCursor(last) : null,
  };
}
