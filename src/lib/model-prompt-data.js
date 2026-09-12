import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

function safeTime(value) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function normalizePrompt(item, model) {
  // coverUrl 是数据源明确指定的封面。始终把它放在第 1 张，再按源顺序追加其余图片；
  // 不能先铺 images[] 再补 cover，否则多图条目的缩略图顺序会把封面排到中间。
  const images = Array.from(new Set([
    item.coverUrl,
    ...(Array.isArray(item.images) ? item.images.map((image) => image?.url) : []),
  ].filter(Boolean)));

  return {
    id: String(item.tweetId),
    title: item.title?.trim() || "Untitled prompt",
    prompt: item.prompt?.trim() || "",
    model: item.model?.trim() || "GPT Image 2.5",
    modelIcon: model.icon,
    coverUrl: item.coverUrl,
    images,
    sourceUrl: item.twitterUrl,
    authorName: item.userName?.trim() || item.userScreenName,
    authorHandle: item.userScreenName?.trim() || "",
  };
}

export async function getModelPromptItems(model) {
  if (!model?.dataFile) return [];

  const file = path.join(process.cwd(), "data", model.dataFile);
  const raw = JSON.parse(await readFile(file, "utf8"));

  return raw
    .filter((item) => item?.tweetId && item?.coverUrl && item?.prompt)
    .sort((a, b) => safeTime(b.publishedAt) - safeTime(a.publishedAt) || String(b.tweetId).localeCompare(String(a.tweetId)))
    .map((item) => normalizePrompt(item, model));
}

export async function getModelPromptCount(model) {
  if (!model?.dataFile) return 0;

  const file = path.join(process.cwd(), "data", model.dataFile);
  const raw = JSON.parse(await readFile(file, "utf8"));

  return raw.filter((item) => item?.tweetId && item?.coverUrl && item?.prompt).length;
}
