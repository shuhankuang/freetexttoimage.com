const KIE_API_BASE = (process.env.KIE_BASE || "https://api.kie.ai").replace(/\/+$/, "");
const KIE_UPLOAD_BASE = (process.env.KIE_UPLOAD_BASE || "https://kieai.redpandaai.co").replace(/\/+$/, "");

function apiKey() {
  if (!process.env.KIE_API_KEY) {
    const error = new Error("KIE_API_KEY is not configured.");
    error.code = "KIE_CONFIG";
    throw error;
  }
  return process.env.KIE_API_KEY;
}

async function kieFetch(url, options) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${apiKey()}`,
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

async function uploadTemporaryImage(buffer) {
  const upload = await kieFetch(`${KIE_UPLOAD_BASE}/api/file-base64-upload`, {
    method: "POST",
    body: JSON.stringify({
      base64Data: `data:image/webp;base64,${buffer.toString("base64")}`,
      uploadPath: "freetexttoimage/image-to-prompt",
      fileName: `${crypto.randomUUID()}.webp`,
    }),
  });
  const url = upload?.data?.fileUrl || upload?.data?.downloadUrl;
  if (!url) {
    const error = new Error("KIE did not return an uploaded image URL.");
    error.code = "KIE_RESPONSE";
    throw error;
  }
  return url;
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

export async function createPromptFromImage(buffer, locale = "en") {
  const imageUrl = await uploadTemporaryImage(buffer);
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
