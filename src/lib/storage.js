import { Buffer } from "node:buffer";
import { S3mini } from "s3mini";

// 作品图片存储：私有桶 + 只存 object key，公开访问一律走 /api/images/[id] 鉴权代理。
// 用 s3mini（零依赖轻量客户端），兼容 AWS S3 与 MinIO 等一切 S3 兼容服务。
//
// 环境变量两种配法，二选一：
//   A. AWS 云端：S3_BUCKET + S3_REGION（自动拼 https://{bucket}.s3.{region}.amazonaws.com）
//   B. 自建 S3（MinIO 等）：S3_ENDPOINT，且 endpoint 必须带桶名（路径式 / 虚拟主机式皆可）
// 公共：S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY

export const s3Configured = Boolean(
  process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    (process.env.S3_ENDPOINT || process.env.S3_BUCKET)
);

const publicBaseUrl = (process.env.S3_PUBLIC_URL || "").replace(/\/+$/, "");

// 公开桶的下载地址。key 逐段编码，保留目录分隔符；未配置时由调用方回退鉴权代理。
export function publicObjectUrl(key) {
  if (!publicBaseUrl || !key) return null;
  const encodedKey = String(key).split("/").map(encodeURIComponent).join("/");
  return `${publicBaseUrl}/${encodedKey}`;
}

// SigV4 签名 region。显式 S3_REGION 优先；否则从 B2 endpoint 的 host 推导
// （如 https://bucket.s3.us-east-005.backblazeb2.com → us-east-005），
// 免得用户不填时退回 us-east-1 导致 SignatureDoesNotMatch。
const FALLBACK_REGION = "us-east-1";
function region() {
  if (process.env.S3_REGION) return process.env.S3_REGION;
  const m = /\.s3\.([a-z0-9-]+)\.backblazeb2\.com$/i.exec(process.env.S3_ENDPOINT || "");
  return m ? m[1] : FALLBACK_REGION;
}

function buildEndpoint() {
  if (!s3Configured) return null;
  if (process.env.S3_ENDPOINT) return process.env.S3_ENDPOINT.replace(/\/+$/, "");
  return `https://${process.env.S3_BUCKET}.s3.${region()}.amazonaws.com`;
}

let client;
function s3() {
  if (!client) {
    const endpoint = buildEndpoint();
    if (!endpoint) {
      throw new Error(
        "S3 storage is not configured. Set S3_ENDPOINT (with bucket) or S3_BUCKET + S3_ACCESS_KEY_ID + S3_SECRET_ACCESS_KEY."
      );
    }
    client = new S3mini({
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      endpoint,
      region: region(),
    });
  }
  return client;
}

export async function uploadObject(key, data, contentType = "application/octet-stream", headers) {
  await s3().putObject(key, data, contentType, undefined, headers);
  return { key };
}

export async function objectExists(key) {
  return s3().objectExists(key);
}

// 返回 Buffer（图片通常几百 KB ~ 几 MB，一次读进内存足够且简单可靠）。
export async function getObjectBuffer(key) {
  const arrayBuffer = await s3().getObjectArrayBuffer(key);
  return Buffer.from(arrayBuffer);
}

export async function deleteObject(key) {
  return s3().deleteObject(key);
}
