import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

function safeTime(value) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function normalizePrompt(item, model) {
  const images = Array.from(new Set([
    ...(Array.isArray(item.images) ? item.images.map((image) => image?.url) : []),
    item.coverUrl,
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
