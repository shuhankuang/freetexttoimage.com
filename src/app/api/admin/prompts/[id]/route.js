import { headers } from "next/headers";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
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

  const result = await db.delete(promptItems).where(eq(promptItems.id, id));
  if ((result.rowsAffected ?? 0) === 0) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });

  // 图片资源按哈希在多个提示词之间去重，不能在这里直接删对象，否则可能让其他记录失图。
  revalidateTag("prompt-gallery", { expire: 0 });
  return NextResponse.json({ deletedId: id });
}
