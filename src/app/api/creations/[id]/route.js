import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { deleteCreationFor, getCreation, getCreationRecord } from "@/lib/creations";
import { ensurePolling } from "@/lib/generation";
import { deleteObject } from "@/lib/storage";

// 前端轮询生成状态（GET），兼删除（DELETE）。
export async function GET(_request, { params }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params; // Next 16：动态路由参数是 async
  const creation = await getCreation(session.user.id, id);
  if (!creation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 自愈：进程重启后轮询可能断了，卡在 processing 的陈旧任务顺手重启一条轮询。
  if (creation.status === "processing") await ensurePolling(id);

  return NextResponse.json(creation);
}

export async function DELETE(_request, { params }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params; // Next 16：动态路由参数是 async
  const record = await getCreationRecord(session.user.id, id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const deleted = await deleteCreationFor(session.user.id, id);

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // B2 实际对象位于桶根目录；旧记录可能仍保存带目录的历史 key，因此统一取文件名清理。
  const keys = [record.imageKey, record.thumbnailKey]
    .filter(Boolean)
    .map((key) => key.split("/").at(-1));
  const cleanup = await Promise.allSettled(keys.map((key) => deleteObject(key)));
  cleanup.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`[creations] failed to delete object ${keys[index]}:`, result.reason?.message || result.reason);
    }
  });

  return NextResponse.json({ ok: true });
}
