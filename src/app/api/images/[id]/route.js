import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCreationRecord } from "@/lib/creations";
import { getObjectBuffer } from "@/lib/storage";

// 作品图片鉴权代理：私有桶里的图一律从这里读。
// - 未登录 / 非本人 → 404（不暴露图片是否存在）
// - 生成的作品：按 image_key 从 S3 流式读出
// - 接入 KIE 前的老数据（/gallery/*.jpg 静态图）→ 重定向到该静态路径，保持旧记录可看

const MIME_BY_EXT = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

function mimeForKey(key) {
  const ext = /\.([a-z0-9]+)$/i.exec(key || "")?.[1]?.toLowerCase();
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

export async function GET(request, { params }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id } = await params; // Next 16：动态路由参数是 async
  const record = getCreationRecord(session.user.id, id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 老数据：直接重定向到本地静态图
  if (!record.image_key && record.image?.startsWith("/gallery/")) {
    return NextResponse.redirect(new URL(record.image, request.url));
  }

  if (!record.image_key) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const buffer = await getObjectBuffer(record.image_key);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeForKey(record.image_key),
        "Content-Length": String(buffer.length),
        // 私有桶 + 鉴权代理，返回的是同一登录用户可见的静态内容，可放心长缓存
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    console.error("[images] S3 read failed:", err?.message || err);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
