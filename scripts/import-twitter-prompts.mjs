#!/usr/bin/env node
/**
 * TwitterAPI.io -> prompt import queue.
 * The existing JSON import path remains untouched; this script only creates
 * the same standard JSON consumed by queue-prompt-data.mjs.
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { loadEnvFile } from "node:process";
import { PROMPT_SYNC_DEFAULTS, PROMPT_SYNC_DEFAULTS_BY_ID } from "../src/lib/prompt-sync-defaults.js";

const BASE_URL = "https://api.twitterapi.io";
const SEARCH_PATH = "/twitter/tweet/advanced_search";
const MODEL_BY_PRESET = {
  nano_banana: "Nano Banana",
  flux: "FLUX.2 Pro",
  seedream: "Seedream 4.5",
  gpt_image: "GPT Image 2.5",
  qwen: "Qwen-Image-3.0 Pro",
};

function args(argv) {
  const out = { preset: null, query: null, since: null, until: null, windowHours: Number(process.env.TWITTER_IMPORT_WINDOW_HOURS || 24),
    limit: Number(process.env.TWITTER_IMPORT_MAX_RECORDS || 500), delayMs: Number(process.env.TWITTER_IMPORT_DELAY_MS || 1000),
    skipExtraction: false, apply: false, keep: false, queryType: "Latest" };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]; const next = () => argv[++i];
    if (key === "--preset") out.preset = next();
    else if (key === "--query") out.query = next();
    else if (key === "--since") out.since = next();
    else if (key === "--until") out.until = next();
    else if (key === "--window-hours") out.windowHours = Number(next());
    else if (key === "--limit") out.limit = Number(next());
    else if (key === "--delay-ms") out.delayMs = Number(next());
    else if (key === "--query-type") out.queryType = next();
    else if (key === "--skip-extraction") out.skipExtraction = true;
    else if (key === "--keep") out.keep = true;
    else if (key === "--apply") out.apply = true;
    else if (key.startsWith("--env=")) out.envFile = key.slice(6);
    else throw new Error(`未知参数: ${key}`);
  }
  return out;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function timestamp(value, fallback) {
  if (!value) return fallback;
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (!Number.isFinite(date.getTime())) throw new Error(`Invalid date: ${value}`);
  return date;
}
function ymd(date) { return date.toISOString().slice(0, 10).replaceAll("-", ""); }
function queryWithFilters(base) {
  return [base, "-filter:retweets", "-filter:replies", "lang:en"].join(" ");
}
function mediaUrls(tweet) {
  for (const field of ["extendedEntities", "entities"]) {
    const urls = (tweet?.[field]?.media ?? []).filter((m) => m.type == null || m.type === "photo")
      .map((m) => m.media_url_https || m.media_url).filter(Boolean);
    if (urls.length) return [...new Set(urls)];
  }
  return [];
}
async function request(apiKey, query, queryType, since, until, attempt = 0) {
  const params = new URLSearchParams({ query, queryType });
  if (since) params.set("since_time", String(Math.floor(since.getTime() / 1000)));
  if (until) params.set("until_time", String(Math.floor(until.getTime() / 1000)));
  const response = await fetch(`${BASE_URL}${SEARCH_PATH}?${params}`, { headers: { "X-API-Key": apiKey }, signal: AbortSignal.timeout(45_000) });
  if (!response.ok) {
    const body = await response.text();
    if ((response.status === 429 || response.status >= 500) && attempt < 4) { await sleep(700 * 2 ** attempt); return request(apiKey, query, queryType, since, until, attempt + 1); }
    throw new Error(`TwitterAPI.io HTTP ${response.status}: ${body.slice(0, 300)}`);
  }
  return response.json();
}
function record(tweet) {
  const images = mediaUrls(tweet); if (!images.length || !tweet?.id) return null;
  const author = tweet.author ?? {};
  return { tweet_id: String(tweet.id), url: tweet.url || `https://x.com/${author.userName || "i"}/status/${tweet.id}`,
    author: author.userName || author.screenName || "", author_name: author.name || author.userName || "",
    created_at: tweet.createdAt, text: tweet.text || "", image_urls: images, image_count: images.length,
    view_count: tweet.viewCount ?? null, like_count: tweet.likeCount ?? null, retweet_count: tweet.retweetCount ?? null, lang: tweet.lang || null };
}
function run(script, scriptArgs, env) {
  return new Promise((resolve, reject) => { const child = spawn(process.execPath, [script, ...scriptArgs], { stdio: "inherit", env }); child.on("error", reject); child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${path.basename(script)} exited with ${code}`))); });
}

async function main() {
  const envArg = process.argv.slice(2).find((value) => value.startsWith("--env="));
  const envFile = envArg?.slice(6) || ".env.local";
  try { loadEnvFile(envFile); } catch (error) { if (envArg) throw error; }
  const options = args(process.argv.slice(2));
  if (!options.preset && !options.query) {
    const [{ createClient }, { drizzle }, { eq }, schema] = await Promise.all([import("@libsql/client"), import("drizzle-orm/libsql"), import("drizzle-orm"), import("../src/lib/schema.js")]);
    if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required when no preset is supplied");
    const syncDb = drizzle(createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN }));
    const [setting] = await syncDb.select().from(schema.promptSyncSettings).where(eq(schema.promptSyncSettings.id, 1)).limit(1);
    if (setting && !setting.enabled) { console.log("Prompt sync is paused in the admin settings."); return; }
    let rows = await syncDb.select().from(schema.promptSyncSources).where(eq(schema.promptSyncSources.enabled, true));
    if (!rows.length) {
      const now = new Date().toISOString();
      for (const source of PROMPT_SYNC_DEFAULTS) {
        await syncDb.insert(schema.promptSyncSources).values({
          id: source.id,
          name: source.name,
          preset: source.id,
          query: source.query,
          enabled: true,
          lookbackHours: 48,
          maxRecords: 500,
          createdAt: now,
          updatedAt: now,
        }).onConflictDoNothing();
      }
      rows = await syncDb.select().from(schema.promptSyncSources).where(eq(schema.promptSyncSources.enabled, true));
    }
    if (!rows.length) { console.log("No enabled Twitter sync sources."); return; }
    for (const source of rows) {
      const childArgs = ["--preset", source.preset, "--query", source.query, "--window-hours", String(source.lookbackHours), "--limit", String(source.maxRecords)];
      if (options.since) childArgs.push("--since", options.since); if (options.until) childArgs.push("--until", options.until); if (options.apply) childArgs.push("--apply");
      await run(path.resolve("scripts/import-twitter-prompts.mjs"), childArgs, process.env);
    }
    return;
  }
  const apiKey = process.env.TWITTERAPI_IO_KEY; if (!apiKey) throw new Error("Missing TWITTERAPI_IO_KEY");
  const preset = PROMPT_SYNC_DEFAULTS_BY_ID.get(options.preset);
  if (!options.query && !preset) throw new Error(`Unknown preset: ${options.preset}`);
  if (!Number.isInteger(options.windowHours) || options.windowHours < 1) throw new Error("--window-hours must be a positive integer");
  const until = timestamp(options.until, new Date());
  const since = timestamp(options.since, new Date(until.getTime() - 24 * 3600 * 1000));
  if (since >= until) throw new Error("--since must be before --until");
  const query = queryWithFilters(options.query || preset.query);
  const tweets = new Map(); const windowMs = options.windowHours * 3600 * 1000;
  for (let start = since; start < until && tweets.size < options.limit; start = new Date(start.getTime() + windowMs)) {
    const end = new Date(Math.min(start.getTime() + windowMs, until.getTime()));
    const data = await request(apiKey, query, options.queryType, start, end);
    for (const tweet of data.tweets || []) { const item = record(tweet); if (item) tweets.set(item.tweet_id, item); }
    console.error(`[${start.toISOString()} → ${end.toISOString()}] fetched ${(data.tweets || []).length}, unique with images ${tweets.size}`);
    if (end < until) await sleep(options.delayMs);
  }
  const records = [...tweets.values()].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).slice(0, options.limit);
  if (!records.length) throw new Error("No image tweets found");
  const dir = path.resolve(".prompt-import-api"); await mkdir(dir, { recursive: true });
  const stamp = ymd(since); const rawPath = path.join(dir, `twitter-${options.preset}-${stamp}-raw.json`);
  await writeFile(rawPath, JSON.stringify({ query, since: since.toISOString(), until: until.toISOString(), data: records }, null, 2));
  const env = { ...process.env };
  if (!options.skipExtraction) {
    const extractedPath = path.join(dir, `twitter-${options.preset}-${stamp}-extracted.json`);
    const dataPath = path.join(dir, `twitter-${options.preset}-${stamp}-data.json`);
    await run(path.resolve("scripts/extract-prompts.mjs"), ["--in", rawPath, "--out", extractedPath, "--data-out", dataPath], env);
    if (options.apply) await run(path.resolve("scripts/queue-prompt-data.mjs"), [dataPath, "--apply"], env);
    else console.log(`Dry run complete. Standard JSON: ${dataPath}`);
  } else {
    const model = MODEL_BY_PRESET[options.preset]; if (!model) throw new Error("--skip-extraction requires a known preset");
    const items = records.map((item) => ({ tweetId: item.tweet_id, twitterUrl: item.url, userName: item.author_name || item.author,
      userScreenName: item.author, OriginTweetText: item.text, prompt: item.text, prompt_type: "text", model,
      coverUrl: item.image_urls[0], viewCount: item.view_count, publishedAt: item.created_at, images: item.image_urls.map((url) => ({ url })) }));
    const dataPath = path.join(dir, `twitter-${options.preset}-${stamp}-data.json`); await writeFile(dataPath, JSON.stringify(items, null, 2));
    if (options.apply) await run(path.resolve("scripts/queue-prompt-data.mjs"), [dataPath, "--apply"], env); else console.log(`Dry run complete. Standard JSON: ${dataPath}`);
  }
  if (!options.keep) await rm(rawPath, { force: true });
}
main().catch((error) => { console.error(`\n✗ ${error.message || error}`); process.exitCode = 1; });
