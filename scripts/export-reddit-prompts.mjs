#!/usr/bin/env node
// 将公开提示词导出为可用于 Reddit 分享的 CSV。只读 Turso，不访问图片存储或第三方 API。
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { promptItems } from "../src/lib/schema.js";
import { getModelPromptPage } from "../src/lib/model-prompt-pages.js";

function readArgs(argv) {
  const options = { envFile: ".env.local", out: null, model: null, limit: null, minPromptLength: null };
  for (const value of argv) {
    if (value === "--") continue;
    if (value.startsWith("--env=")) options.envFile = value.slice("--env=".length);
    else if (value.startsWith("--out=")) options.out = value.slice("--out=".length);
    else if (value.startsWith("--model=")) options.model = value.slice("--model=".length);
    else if (value.startsWith("--limit=")) {
      const limit = Number.parseInt(value.slice("--limit=".length), 10);
      if (!Number.isSafeInteger(limit) || limit < 1) {
        throw new Error("--limit must be a positive integer");
      }
      options.limit = limit;
    }
    else if (value.startsWith("--min-prompt-length=")) {
      const minPromptLength = Number.parseInt(value.slice("--min-prompt-length=".length), 10);
      if (!Number.isSafeInteger(minPromptLength) || minPromptLength < 1) {
        throw new Error("--min-prompt-length must be a positive integer");
      }
      options.minPromptLength = minPromptLength;
    }
    else throw new Error(`Unknown option: ${value}`);
  }
  return options;
}

function csvCell(value, { protectFormula = false } = {}) {
  let text = value == null ? "" : String(value);
  // 提示词来自外部内容；避免用户将 CSV 导入表格时被 =、+、-、@ 开头的文本当作公式执行。
  if (protectFormula && /^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function firstSourceImage(images) {
  const parsed = typeof images === "string" ? JSON.parse(images) : images;
  if (!Array.isArray(parsed)) return null;
  return parsed[0]?.sourceUrl || null;
}

function defaultOutputPath() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join("exports", `reddit-prompts-${date}.csv`);
}

async function main() {
  const options = readArgs(process.argv.slice(2));
  try { loadEnvFile(options.envFile); } catch { throw new Error(`Unable to load ${options.envFile}`); }
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    throw new Error(`Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in ${options.envFile}`);
  }
  if (options.model && !getModelPromptPage(options.model)) throw new Error(`Unknown model slug: ${options.model}`);

  const db = drizzle(createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN }));
  const conditions = [isNull(promptItems.deletedAt)];
  if (options.model) conditions.push(eq(promptItems.modelSlug, options.model));
  if (options.minPromptLength) {
    conditions.push(sql`length(${promptItems.prompt}) >= ${options.minPromptLength}`);
  }
  const where = and(...conditions);
  const query = db.select().from(promptItems)
    .where(where)
    .orderBy(desc(promptItems.publishedAt), desc(promptItems.id));
  const rows = options.limit ? await query.limit(options.limit) : await query;

  const headers = ["model", "author_name", "author_handle", "prompt", "x_url", "original_image_url", "published_at"];
  const output = [headers.map((value) => csvCell(value)).join(",")];
  const byModel = new Map();
  let skippedWithoutImage = 0;

  for (const row of rows) {
    const imageUrl = firstSourceImage(row.images);
    if (!imageUrl) {
      skippedWithoutImage += 1;
      continue;
    }
    const handle = row.authorHandle.startsWith("@") ? row.authorHandle : `@${row.authorHandle}`;
    output.push([
      csvCell(row.modelLabel, { protectFormula: true }),
      csvCell(row.authorName, { protectFormula: true }),
      csvCell(handle, { protectFormula: true }),
      csvCell(row.prompt, { protectFormula: true }),
      csvCell(row.sourceUrl),
      csvCell(imageUrl),
      csvCell(new Date(row.publishedAt).toISOString()),
    ].join(","));
    byModel.set(row.modelLabel, (byModel.get(row.modelLabel) || 0) + 1);
  }

  const outputPath = path.resolve(options.out || defaultOutputPath());
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${output.join("\n")}\n`, "utf8");

  console.log(`✓ Exported ${output.length - 1} public prompts → ${outputPath}`);
  if (options.minPromptLength) console.log(`  Prompt length: ${options.minPromptLength}+ characters`);
  console.log(`  Models: ${[...byModel.entries()].map(([model, count]) => `${model} ${count}`).join(", ") || "none"}`);
  if (skippedWithoutImage) console.log(`  Skipped ${skippedWithoutImage} prompt(s) without an original X image URL.`);
}

main().catch((error) => {
  let rootCause = error;
  while (rootCause?.cause) rootCause = rootCause.cause;
  const detail = rootCause?.message && rootCause !== error
    ? `\n  Cause: ${rootCause.message}`
    : "";
  console.error(`\n✗ ${error?.message || error}${detail}`);
  process.exitCode = 1;
});
