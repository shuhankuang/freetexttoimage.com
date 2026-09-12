import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";
import sharp from "sharp";
import { uploadTemporaryFile } from "@/lib/kie-files";

export const MAX_REFERENCE_BYTES = 10 * 1024 * 1024;
const MAX_REFERENCE_PIXELS = 64_000_000;
const TOKEN_TTL_SECONDS = 30 * 60;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function inputError(message, code = "INVALID_REFERENCE") {
  const error = new Error(message);
  error.code = code;
  return error;
}

function signingSecret() {
  const secret = process.env.REFERENCE_TOKEN_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    const error = new Error("BETTER_AUTH_SECRET is required to sign reference image uploads.");
    error.code = "CONFIG";
    throw error;
  }
  return secret;
}

function sign(value) {
  return createHmac("sha256", signingSecret()).update(value).digest("base64url");
}

function issueToken(userId, url) {
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    userId,
    url,
    expiresAt: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeToken(token, userId) {
  if (typeof token !== "string" || token.length > 4096) throw inputError("Invalid reference image token.");
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) throw inputError("Invalid reference image token.");

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw inputError("Invalid reference image token.");
  }

  let data;
  try { data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); }
  catch { throw inputError("Invalid reference image token."); }
  if (data?.v !== 1 || data?.userId !== userId || typeof data?.url !== "string") {
    throw inputError("Invalid reference image token.");
  }
  if (!Number.isFinite(data.expiresAt) || data.expiresAt <= Math.floor(Date.now() / 1000)) {
    throw inputError("Reference image upload expired. Please generate again.", "REFERENCE_EXPIRED");
  }
  try {
    if (new URL(data.url).protocol !== "https:") throw new Error();
  } catch {
    throw inputError("Invalid reference image URL.");
  }
  return data.url;
}

async function normalizeImage(file) {
  if (!(file instanceof File) || !ACCEPTED_TYPES.has(file.type)) {
    throw inputError("Upload a JPEG, PNG, or WebP reference image.");
  }
  if (!file.size) throw inputError("The reference image is empty.");
  if (file.size > MAX_REFERENCE_BYTES) {
    throw inputError("Reference images must be 10 MB or smaller.", "REFERENCE_TOO_LARGE");
  }

  const source = Buffer.from(await file.arrayBuffer());
  try {
    const image = sharp(source, { limitInputPixels: MAX_REFERENCE_PIXELS }).rotate();
    let output = await image
      .clone()
      .resize({ width: 4096, height: 4096, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer();
    if (output.length > MAX_REFERENCE_BYTES) {
      output = await image
        .clone()
        .resize({ width: 3072, height: 3072, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    }
    if (output.length > MAX_REFERENCE_BYTES) {
      throw inputError("The processed reference image is still too large.", "REFERENCE_TOO_LARGE");
    }
    return output;
  } catch (error) {
    if (error?.code === "REFERENCE_TOO_LARGE") throw error;
    throw inputError("The reference image could not be read.");
  }
}

export async function uploadReferenceImage(userId, file) {
  const image = await normalizeImage(file);
  const url = await uploadTemporaryFile(image, {
    contentType: "image/webp",
    fileName: `${crypto.randomUUID()}.webp`,
    uploadPath: "freetexttoimage/reference-images",
  });
  return issueToken(userId, url);
}

export function resolveReferenceTokens(tokens, userId, limit) {
  if (tokens == null) return [];
  if (!Array.isArray(tokens)) throw inputError("referenceTokens must be an array.");
  if (tokens.length > 0 && limit < 1) {
    throw inputError("This model does not support reference images.");
  }
  if (tokens.length > limit) {
    throw inputError(`This model supports up to ${limit} reference images.`);
  }
  return tokens.map((token) => decodeToken(token, userId));
}
