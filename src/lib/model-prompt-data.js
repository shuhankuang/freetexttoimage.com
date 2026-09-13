import "server-only";

import { unstable_cache } from "next/cache";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { promptItems } from "@/lib/schema";
import { publicObjectUrl } from "@/lib/storage";
import { getModelPromptPage, MODEL_PROMPT_PAGES } from "@/lib/model-prompt-pages";

export const PROMPT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 48;

function encodeCursor(row) {
  return Buffer.from(JSON.stringify([row.publishedAt, row.id]), "utf8").toString("base64url");
}

function decodeCursor(value) {
  if (!value) return null;
  if (typeof value !== "string" || value.length > 512) throw new Error("Invalid cursor");
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!Array.isArray(decoded) || decoded.length !== 2 || !Number.isSafeInteger(decoded[0]) || typeof decoded[1] !== "string" || !decoded[1]) throw new Error();
    return { publishedAt: decoded[0], id: decoded[1] };
  } catch {
    throw new Error("Invalid cursor");
  }
}

function normalizeImages(value) {
  return (Array.isArray(value) ? value : []).map((image) => ({
    id: image.hash,
    displayUrl: publicObjectUrl(image.originalKey),
    thumbUrl: publicObjectUrl(image.thumbnailKey),
    coverUrl: publicObjectUrl(image.coverThumbnailKey || image.thumbnailKey),
    width: image.width,
    height: image.height,
  })).filter((image) => image.id && image.displayUrl && image.thumbUrl);
}

// row.title 基本都是空的（数据来自 Twitter 抓取，原始记录不带标题），
// alt/aria-label 用它兜底只会渲染出一堆重复的 "Untitled prompt"，图片搜索等于白搭。
// 优先截一段真实的 prompt 文本做描述，比占位字符串有意义得多。
function imageAltText(row) {
  const title = row.title?.trim();
  if (title) return title;
  const prompt = row.prompt?.trim();
  if (!prompt) return "Untitled prompt";
  return prompt.length > 120 ? `${prompt.slice(0, 119).trimEnd()}…` : prompt;
}

function toPublicItem(row) {
  const model = getModelPromptPage(row.modelSlug);
  return {
    id: row.id,
    title: row.title || "Untitled prompt",
    imageAlt: imageAltText(row),
    prompt: row.prompt,
    promptType: row.promptType,
    model: row.modelLabel,
    modelIcon: model?.icon || "",
    images: normalizeImages(row.images),
    sourceUrl: row.sourceUrl,
    authorName: row.authorName,
    authorHandle: row.authorHandle,
  };
}

export async function listModelPromptItems(modelSlug, { cursor, limit = PROMPT_PAGE_SIZE } = {}) {
  if (!getModelPromptPage(modelSlug)) throw new Error("Unknown model");
  const pageSize = Math.min(Math.max(Number(limit) || PROMPT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const parsed = decodeCursor(cursor);
  const after = parsed ? sql`(${promptItems.publishedAt}, ${promptItems.id}) < (${parsed.publishedAt}, ${parsed.id})` : undefined;
  const rows = await db.select().from(promptItems)
    .where(and(eq(promptItems.modelSlug, modelSlug), after))
    .orderBy(desc(promptItems.publishedAt), desc(promptItems.id)).limit(pageSize + 1);
  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
  return {
    items: pageRows.map(toPublicItem).filter((item) => item.images.length),
    nextCursor: hasMore ? encodeCursor(pageRows.at(-1)) : null,
  };
}

const cachedFirstPage = unstable_cache((slug) => listModelPromptItems(slug), ["model-prompt-first-page-v9"], { revalidate: 300, tags: ["prompt-gallery"] });
const cachedCounts = unstable_cache(async () => {
  const rows = await db.select({ modelSlug: promptItems.modelSlug, count: sql`count(*)` }).from(promptItems).groupBy(promptItems.modelSlug);
  return Object.fromEntries(rows.map((row) => [row.modelSlug, Number(row.count)]));
}, ["model-prompt-counts-v7"], { revalidate: 300, tags: ["prompt-gallery"] });

export function getModelPromptFirstPage(modelSlug) {
  return cachedFirstPage(modelSlug);
}

export async function getModelPromptCounts() {
  const counts = await cachedCounts();
  return Object.fromEntries(MODEL_PROMPT_PAGES.map((model) => [model.slug, counts[model.slug] || 0]));
}
