import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createTopupCheckoutSession, CREDIT_PACKS } from "@/lib/billing";
import { localePath } from "@/i18n/config";

// 一次性积分包 Checkout。body 只接受 { pack: "credits_40" | "credits_140" | "credits_320" }——
// 金额/积分数量由服务端按 pack 查，浏览器传别的字段一律忽略。
export async function POST(request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const packId = body?.pack;
  if (!CREDIT_PACKS[packId]) {
    return NextResponse.json({ error: "Unknown credit pack." }, { status: 400 });
  }

  const origin = process.env.APP_URL || new URL(request.url).origin;
  const pricingPath = localePath(body?.locale === "ja" ? "ja" : "en", "/pricing");
  try {
    const checkoutSession = await createTopupCheckoutSession({
      userId: session.user.id,
      userEmail: session.user.email,
      packId,
      successUrl: `${origin}${pricingPath}?checkout=success`,
      cancelUrl: `${origin}${pricingPath}`,
    });
    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const status = err?.code === "CONFIG" ? 503 : err?.code === "INVALID_PACK" ? 400 : 502;
    return NextResponse.json({ error: err?.message || "Checkout is unavailable. Please try again." }, { status });
  }
}
