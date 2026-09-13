import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { createPromptFromImage } from "@/lib/image-to-prompt";
import { verifyTurnstileToken } from "@/lib/turnstile";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = formData.get("image");
  const locale = formData.get("locale") === "ja" ? "ja" : "en";
  if (!(file instanceof File) || !ACCEPTED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Upload a JPEG, PNG, or WebP image." }, { status: 400 });
  }
  if (!file.size || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "The processed image must be smaller than 4 MB." }, { status: 413 });
  }

  const turnstileToken = request.headers.get("x-turnstile-token");
  if (!await verifyTurnstileToken(turnstileToken)) {
    return NextResponse.json(
      { error: "Complete the security check before generating a prompt.", code: "TURNSTILE_VERIFICATION_FAILED" },
      { status: 403 },
    );
  }

  let image;
  try {
    // 解码后再编码可以验证实际图片内容，同时移除 EXIF 等不需要发送给模型的元数据。
    image = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "The image could not be read." }, { status: 400 });
  }

  try {
    const prompt = await createPromptFromImage(image, locale);
    return NextResponse.json({ prompt });
  } catch (error) {
    console.error("[image-to-prompt] failed:", error?.message || error);
    return NextResponse.json(
      { error: "Image analysis is unavailable right now." },
      { status: error?.code === "IMAGE_TO_PROMPT_CONFIG" ? 503 : 502 }
    );
  }
}
