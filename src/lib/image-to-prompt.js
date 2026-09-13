import { uploadTemporaryFile } from "@/lib/kie-files";

const KIE_API_BASE = (process.env.KIE_BASE || "https://api.kie.ai").replace(/\/+$/, "");
const GEMINI_API_BASE = (process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com").replace(/\/+$/, "");
const GEMINI_MODEL = process.env.GEMINI_IMAGE_TO_PROMPT_MODEL || "gemini-3.1-flash-lite";

async function kieFetch(url, options) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${process.env.KIE_API_KEY}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      signal: AbortSignal.timeout(60_000),
    });
  } catch (cause) {
    const error = new Error("The image analysis service could not be reached.", { cause });
    error.code = "KIE_NETWORK";
    throw error;
  }

  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false || (body?.code && body.code !== 200)) {
    const error = new Error(body?.msg || body?.message || `KIE request failed (${response.status}).`);
    error.code = "KIE_RESPONSE";
    throw error;
  }
  return body;
}

async function geminiFetch(buffer, locale) {
  let response;
  try {
    response = await fetch(`${GEMINI_API_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { text: analysisInstruction(locale) },
            { inlineData: { mimeType: "image/webp", data: buffer.toString("base64") } },
          ],
        }],
        generationConfig: {
          maxOutputTokens: 512,
          temperature: 0.4,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (cause) {
    const error = new Error("The Gemini fallback could not be reached.", { cause });
    error.code = "GEMINI_NETWORK";
    throw error;
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.error?.message || `Gemini request failed (${response.status}).`);
    error.code = "GEMINI_RESPONSE";
    throw error;
  }

  const prompt = body?.candidates?.[0]?.content?.parts
    ?.map((part) => typeof part?.text === "string" ? part.text : "")
    .join("")
    .trim();
  if (!prompt) {
    const error = new Error("Gemini returned an empty prompt.");
    error.code = "GEMINI_RESPONSE";
    throw error;
  }
  return prompt;
}

function analysisInstruction(locale) {
  const outputLanguage = locale === "ja" ? "Japanese" : "English";
  return `Analyze the supplied image and write one polished text-to-image generation prompt in ${outputLanguage}. Describe the visible subject, composition, environment, artistic medium or photographic style, lighting, color palette, mood, perspective, lens or rendering details when they are visually supported. Preserve distinctive visual details without guessing identities, brands, locations, or facts that are not visible. Make the prompt specific and natural, between 80 and 160 words. Return only the prompt, with no heading, bullets, quotation marks, or commentary.`;
}

function responseText(body) {
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) return content.map((part) => part?.text || "").join("").trim();
  return "";
}

async function createPromptWithKie(buffer, locale) {
  const imageUrl = await uploadTemporaryFile(buffer, {
    contentType: "image/webp",
    fileName: `${crypto.randomUUID()}.webp`,
    uploadPath: "freetexttoimage/image-to-prompt",
  });
  const result = await kieFetch(`${KIE_API_BASE}/gemini-2.5-flash/v1/chat/completions`, {
    method: "POST",
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: analysisInstruction(locale) },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      }],
      reasoning_effort: "low",
      stream: false,
    }),
  });

  const prompt = responseText(result);
  if (!prompt) {
    const error = new Error("KIE returned an empty prompt.");
    error.code = "KIE_RESPONSE";
    throw error;
  }
  return prompt;
}

export async function createPromptFromImage(buffer, locale = "en") {
  const attempts = [];

  if (process.env.KIE_API_KEY) {
    try {
      return await createPromptWithKie(buffer, locale);
    } catch (error) {
      attempts.push(error);
      console.warn("[image-to-prompt] Kie unavailable; trying Gemini fallback", {
        code: error?.code || "UNKNOWN",
      });
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      return await geminiFetch(buffer, locale);
    } catch (error) {
      attempts.push(error);
    }
  }

  if (attempts.length === 0) {
    const error = new Error("Neither KIE_API_KEY nor GEMINI_API_KEY is configured.");
    error.code = "IMAGE_TO_PROMPT_CONFIG";
    throw error;
  }

  const error = new Error("All configured image analysis providers failed.", { cause: attempts.at(-1) });
  error.code = "IMAGE_TO_PROMPT_UPSTREAM";
  throw error;
}
