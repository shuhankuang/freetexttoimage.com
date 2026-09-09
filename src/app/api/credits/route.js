import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getBalance } from "@/lib/credits";

// 当前登录用户的积分余额。app-shell 顶栏、生成前余额校验都读这里。
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getBalance(session.user.id));
}
