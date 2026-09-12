const KIE_UPLOAD_BASE = (process.env.KIE_UPLOAD_BASE || "https://kieai.redpandaai.co").replace(/\/+$/, "");

function apiKey() {
  if (!process.env.KIE_API_KEY) {
    const error = new Error("KIE_API_KEY is not configured.");
    error.code = "KIE_CONFIG";
    throw error;
  }
  return process.env.KIE_API_KEY;
}

// KIE 的文件服务用于模型输入，文件会自动过期。使用 multipart 流上传可避免
// Base64 额外增加约 33% 的请求体大小，参考图较多时差别很明显。
export async function uploadTemporaryFile(buffer, {
  contentType = "image/webp",
  fileName = `${crypto.randomUUID()}.webp`,
  uploadPath = "freetexttoimage/uploads",
} = {}) {
  const formData = new FormData();
  formData.append("file", new Blob([buffer], { type: contentType }), fileName);
  formData.append("uploadPath", uploadPath);
  formData.append("fileName", fileName);

  let response;
  try {
    response = await fetch(`${KIE_UPLOAD_BASE}/api/file-stream-upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}` },
      body: formData,
      signal: AbortSignal.timeout(60_000),
    });
  } catch (cause) {
    const error = new Error("The image upload service could not be reached.", { cause });
    error.code = "KIE_NETWORK";
    throw error;
  }

  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false || (body?.code && Number(body.code) !== 200)) {
    const error = new Error(body?.msg || body?.message || `KIE upload failed (${response.status}).`);
    error.code = "KIE_RESPONSE";
    throw error;
  }

  const url = body?.data?.fileUrl || body?.data?.downloadUrl;
  if (!url) {
    const error = new Error("KIE did not return an uploaded image URL.");
    error.code = "KIE_RESPONSE";
    throw error;
  }
  return url;
}
