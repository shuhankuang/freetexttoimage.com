import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { deleteCreationFor, getCreation } from "@/lib/creations";
import { ensurePolling } from "@/lib/generation";

// 前端轮询生成状态（GET），兼删除（DELETE）。
export async function GET(_request, { params }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params; // Next 16：动态路由参数是 async
  const creation = getCreation(session.user.id, id);
  if (!creation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 自愈：进程重启后轮询可能断了，卡在 processing 的陈旧任务顺手重启一条轮询。
  if (creation.status === "processing") ensurePolling(id);

  return NextResponse.json(creation);
}

export async function DELETE(_request, { params }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params; // Next 16：动态路由参数是 async
  const deleted = deleteCreationFor(session.user.id, id);

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
