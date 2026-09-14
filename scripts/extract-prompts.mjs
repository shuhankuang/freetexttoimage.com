#!/usr/bin/env node
/**
 * extract-prompts.mjs
 * --------------------------------
 * 读取 TwitterAPI.io 搜索任务产出的原始 JSON，
 * 对每条推文的 text 做"语义判断 + 提取",而不是靠 `Prompt:` 关键词硬匹配。
 *
 * 用 OpenAI 的便宜小模型(默认 gpt-4o-mini),让它只做一件事:
 *   判断这条推文正文里是否包含一段"可以直接拿去生图"的完整提示语,
 *   有就原样提取,没有就返回 has_prompt=false。
 *
 * 明确不算 prompt 的情况(写进 system prompt):
 *   - "Prompt below" / "Prompt in comments" / "Paste this prompt"
 *   - 指向别处的链接
 *   - 讨论 prompt 这件事本身,但没写出具体内容
 *   - 只是描述图片内容,不是生成指令
 *
 * 通过初筛(有 prompt / 置信度 / 质量分 / 模型可识别)的记录,会再转换成
 * data/*.json 那种扁平格式,并逐条跑一遍真正的导入校验函数
 * (src/lib/prompt-import-core.js 的 normalizePromptItems——跟
 * scripts/import-prompt-data.mjs 用的是同一个函数),只有校验通过的
 * 才会写进 --data-out 产出文件,可以直接丢进 data/ 目录测试。
 *
 * 用法:
 *   export OPENAI_API_KEY='你的key'
 *   node scripts/extract-prompts.mjs --in .prompt-import-api/twitter-gpt_image-20260914-raw.json --out /tmp/gpt-image-extracted.json
 *   node scripts/extract-prompts.mjs --in .prompt-import-api/twitter-gpt_image-20260914-raw.json --limit 5
 */

import path from "node:path";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

function buildSystemPrompt(modelAliasBlock, classifyExplicitAdult) {
  const adultInstruction = classifyExplicitAdult ? `

Also classify whether the tweet text or extracted prompt contains EXPLICIT adult sexual content.
Set "is_explicit_adult" to true only for explicit sexual acts, explicit sexualized nudity,
sexual references to genitals, or material clearly intended as pornography.
Set it to false for swimwear, fashion, non-explicit romance, ordinary portraits,
and non-explicit artistic nudity.
` : "";
  const adultField = classifyExplicitAdult
    ? ',\n  "is_explicit_adult": boolean'
    : "";
  return `You are a strict classifier and extractor for AI image-generation prompts found in tweets.

Determine whether the tweet text contains an ACTUAL AI image generation prompt
(descriptive or instructional text that could reasonably be submitted as-is to
an AI image generator).

Do NOT classify these as a valid prompt, even if the word "prompt" appears:
- "Prompt below" / "Prompt in comments" / "Prompt ⤵️" pointing elsewhere (e.g. a link, a reply, a thread)
- "Paste this prompt" / "Copy the prompt" as an instruction without showing the prompt itself
- General discussion ABOUT prompting, without the actual prompt content
- A description of what the image looks like, written as commentary rather than as a generation instruction
- Marketing / ad copy that just mentions a product or app name

DO classify as valid prompt:
- Explicit "Prompt:" followed by real descriptive/instructional text
- Unlabeled descriptive text clearly meant as a generation instruction (e.g. a block of
  comma-separated visual descriptors, camera/lighting terms, style tags), even without the word "prompt"
- Text that reads like an image-generation instruction embedded naturally in the tweet

CRITICAL RULE: If you find a valid prompt, extract it EXACTLY as written in the tweet.
Do NOT rewrite, summarize, translate, "improve", or complete it. Copy the original text verbatim
(you may trim only leading/trailing whitespace and strip a leading "Prompt:" label itself).

The "model" field is constrained: our product currently only supports these exact model labels
${modelAliasBlock}
If the tweet clearly used one of the models above (matched against any of its aliases, case-insensitive),
set "model" to that exact label string. If the tweet used a different model (Midjourney, Flux, Stable
Diffusion, Seedream, Qwen, or anything else not listed above) or the model is unclear, set "model" to null.
Do NOT invent or guess one of the supported labels just to fill the field.
${adultInstruction}

Return ONLY a JSON object with this exact shape, no extra text:
{
  "has_prompt": boolean,
  "prompt": string | null,
  "model": string | null,        // one of the supported labels above, or null — see rule above
  "prompt_type": "image_generation" | "image_edit" | "unknown",
  "category": string | null,     // short label e.g. "Portrait", "Photography", "Poster", "Anime"
  "style": string | null,        // short label e.g. "Cinematic", "Photorealistic", "Anime"
  "quality_score": number,       // 0-10, how useful/detailed/reusable this prompt is for a prompt gallery
  "confidence": number${adultField}
}
}`;
}

function parseArgs(argv) {
  const args = {
    in: "out/gpt_image_raw_node.json",
    out: null,
    dataOut: null,
    limit: null,
    model: "gpt-4o-mini",
    concurrency: 5,
    minConfidence: 0.9,
    minQuality: 6,
    rejectExplicitAdult: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--in":
        args.in = next();
        break;
      case "--out":
        args.out = next();
        break;
      case "--data-out":
        args.dataOut = next();
        break;
      case "--limit":
        args.limit = Number(next());
        break;
      case "--model":
        args.model = next();
        break;
      case "--concurrency":
        args.concurrency = Number(next());
        break;
      case "--min-confidence":
        args.minConfidence = Number(next());
        break;
      case "--min-quality":
        args.minQuality = Number(next());
        break;
      case "--reject-explicit-adult":
        args.rejectExplicitAdult = true;
        break;
      default:
        console.error(`未知参数: ${a}`);
        process.exit(1);
    }
  }
  return args;
}

function buildUserContent(record) {
  return [
    `author: @${record.author ?? "unknown"}`,
    `tweet_url: ${record.url ?? ""}`,
    `image_count: ${record.image_count ?? 0}`,
    "tweet_text:",
    record.text ?? "",
  ].join("\n");
}

function parseJsonLoose(text) {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  }
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start !== -1 && end !== -1) return JSON.parse(t.slice(start, end + 1));
    throw new Error(`无法解析模型返回的 JSON: ${text.slice(0, 300)}`);
  }
}

async function extractOne(apiKey, model, systemPrompt, record) {
  const body = {
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildUserContent(record) },
    ],
  };

  const res = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return parseJsonLoose(content);
}

// 简单并发池,避免一次性把所有请求打出去
async function mapWithConcurrency(items, concurrency, fn) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const cur = idx++;
      results[cur] = await fn(items[cur], cur);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

// TwitterAPI.io 的原始字段 -> data/*.json 期望的扁平字段。
// 只做字段改名/取值,不做任何内容加工——校验交给下面真正的 normalizePromptItems。
function toDataFormatCandidate(record) {
  const imageUrls = Array.isArray(record.image_urls) ? record.image_urls.filter(Boolean) : [];
  if (!imageUrls.length) return { skip: "no image_urls" };

  const extraction = record.extraction ?? {};
  return {
    skip: null,
    item: {
      tweetId: String(record.tweet_id ?? ""),
      twitterUrl: record.url,
      userName: record.author_name || record.author,
      userScreenName: record.author,
      OriginTweetText: record.text,
      prompt: extraction.prompt,
      prompt_type: "text", // 这批数据永远是纯文本 prompt，不是结构化 JSON prompt
      model: extraction.model,
      title: null,
      coverUrl: imageUrls[0],
      viewCount: record.view_count ?? null,
      publishedAt: record.created_at,
      images: imageUrls.map((url) => ({ url })),
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("没找到 OPENAI_API_KEY,先 export OPENAI_API_KEY='你的key'");
    process.exit(1);
  }

  const fs = await import("node:fs/promises");
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);

  // 复用产品真正的模型别名表和导入校验函数，而不是在这个脚本里另外抄一份规则——
  // 别名表以后加新模型会自动同步，校验结果跟 scripts/import-prompt-data.mjs
  // 实际导入时的判定完全一致。
  const { MODEL_PROMPT_PAGES, resolveModelPromptPage } = await import(
    path.join(scriptDir, "../src/lib/model-prompt-pages.js")
  );
  const { normalizePromptItems } = await import(path.join(scriptDir, "../src/lib/prompt-import-core.js"));

  const modelAliasBlock = MODEL_PROMPT_PAGES
    .flatMap((page) => page.sourceModels.map((m) => `- "${m.label}"`))
    .join("\n");
  const systemPrompt = buildSystemPrompt(modelAliasBlock, args.rejectExplicitAdult);

  const inPath = path.resolve(args.in);
  const raw = JSON.parse(await fs.readFile(inPath, "utf-8"));
  let records = raw.data ?? raw; // 兼容直接传数组
  if (args.limit) records = records.slice(0, args.limit);

  console.error(`读取 ${inPath},共 ${records.length} 条待处理(model=${args.model}, concurrency=${args.concurrency})`);

  let done = 0;
  const enriched = await mapWithConcurrency(records, args.concurrency, async (record) => {
    let extracted;
    let error = null;
    try {
      extracted = await extractOne(apiKey, args.model, systemPrompt, record);
    } catch (e) {
      error = String(e.message ?? e);
      extracted = {
        has_prompt: null,
        prompt: null,
        model: null,
        prompt_type: "unknown",
        category: null,
        style: null,
        quality_score: 0,
        confidence: 0,
        ...(args.rejectExplicitAdult ? { is_explicit_adult: null } : {}),
      };
    }
    done++;
    const tag = extracted.is_explicit_adult === true ? "🚫 explicit-adult" : extracted.has_prompt ? "✅ prompt" : extracted.has_prompt === false ? "⬜ no-prompt" : "❌ error";
    console.error(`  [${done}/${records.length}] ${tag} @${record.author} ${error ? "- " + error : ""}`);
    return { ...record, extraction: extracted, extraction_error: error };
  });

  const rejected = [];
  const eligible = enriched.filter((record) => {
    if (!args.rejectExplicitAdult) return true;
    if (record.extraction?.is_explicit_adult === true) {
      rejected.push({ tweetId: record.tweet_id, reason: "explicit_adult_text" });
      return false;
    }
    if (record.extraction?.is_explicit_adult !== false) {
      rejected.push({ tweetId: record.tweet_id, reason: "adult_classification_unavailable" });
      return false;
    }
    return true;
  });
  const withPrompt = eligible.filter((r) => r.extraction?.has_prompt);
  const highQuality = withPrompt.filter(
    (r) =>
      (r.extraction.confidence ?? 0) >= args.minConfidence &&
      (r.extraction.quality_score ?? 0) >= args.minQuality
  );

  // 高质量候选 -> data/*.json 格式 -> 逐条跑真正的导入校验，只保留通过的。
  const dataFormatItems = [];
  for (const record of highQuality) {
    const { skip, item } = toDataFormatCandidate(record);
    if (skip) {
      rejected.push({ tweetId: record.tweet_id, reason: skip });
      continue;
    }
    if (!item.model || !resolveModelPromptPage(item.model)) {
      rejected.push({ tweetId: record.tweet_id, reason: `unsupported model: ${item.model ?? "null"}` });
      continue;
    }
    try {
      normalizePromptItems([item], `conformance-check:${item.tweetId}`); // 只为校验，丢弃返回值
      dataFormatItems.push(item);
    } catch (e) {
      rejected.push({ tweetId: record.tweet_id, reason: e.message });
    }
  }

  const outPath = path.resolve(args.out ?? args.in.replace(/\.json$/, "_extracted.json"));
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        source: inPath,
        model: args.model,
        total: enriched.length,
        with_prompt: withPrompt.length,
        high_quality: highQuality.length,
        data_format_ready: dataFormatItems.length,
        filters: { min_confidence: args.minConfidence, min_quality: args.minQuality, reject_explicit_adult: args.rejectExplicitAdult },
        rejected,
        data: enriched,
      },
      null,
      2
    ),
    "utf-8"
  );

  const dataOutPath = path.resolve(args.dataOut ?? outPath.replace(/\.json$/, "") + "_data-format.json");
  await fs.writeFile(dataOutPath, JSON.stringify(dataFormatItems, null, 2), "utf-8");

  console.error(
    `\n完成: 共处理 ${enriched.length} 条,判定含真实 prompt ${withPrompt.length} 条,` +
      `高质量(confidence>=${args.minConfidence} & quality>=${args.minQuality}) ${highQuality.length} 条,` +
      `\n通过 data/*.json 格式校验 ${dataFormatItems.length} 条 -> 已写入 ${dataOutPath}` +
      `(可直接放进 data/ 目录跑 pnpm prompts:import:dry 测试)` +
      (rejected.length ? `\n被拒绝 ${rejected.length} 条,原因见 ${outPath} 里的 "rejected" 字段` : "") +
      `\n调试用完整记录已写入 ${outPath}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
