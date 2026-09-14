import { headers } from "next/headers";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { promptItems } from "@/lib/schema";

export const runtime = "nodejs";

async function allowed() {
  const session = await auth.api.getSession({ headers: await headers() });
  return Boolean(session?.user && isAdminEmail(session.user.email));
}

export async function DELETE(_request, { params }) {
  if (!(await allowed())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id } = await params;
  if (typeof id !== "string" || !id || id.length > 160) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });

  const result = await db.update(promptItems)
    .set({ deletedAt: new Date().toISOString() })
    .where(and(eq(promptItems.id, id), isNull(promptItems.deletedAt)));
  if ((result.rowsAffected ?? 0) === 0) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });

  // 删除标记会随 source_id 保留。之后导入相同 Twitter 数据时，唯一键冲突会保留此标记，
  // 因而不会重新出现在画廊；图片资源仍可能被其他提示词共享，也不在这里删对象。
  revalidateTag("prompt-gallery", { expire: 0 });
  return NextResponse.json({ deletedId: id });
}
