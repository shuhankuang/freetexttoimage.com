import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getBillingStatus } from "@/lib/billing";

// 账单状态：当前订阅（没有就是 null）+ 积分余额。读之前先做一次自愈式核对
// （见 billing.js ensureSubscriptionFresh），所以本地状态跟 webhook 丢没丢基本无关。
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getBillingStatus(session.user.id));
}
