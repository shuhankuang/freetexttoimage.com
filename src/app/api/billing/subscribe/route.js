import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createSubscriptionCheckoutSession, upgradeSubscription, SUBSCRIPTION_PLANS } from "@/lib/billing";

// 订阅入口：body 只接受 { plan: "basic" | "pro" }。
// 没有有效订阅 → 走 Checkout（第一次要收卡）；已有有效订阅且换套餐 → 直接升级（立即生效，见 billing.js）。
// 降级/取消不走这个接口，走 /api/billing/portal。
export async function POST(request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const plan = body?.plan;
  if (!SUBSCRIPTION_PLANS[plan]) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  try {
    await upgradeSubscription({ userId: session.user.id, plan });
    return NextResponse.json({ immediate: true });
  } catch (err) {
    if (err?.code === "NO_ACTIVE_SUBSCRIPTION") {
      const origin = process.env.APP_URL || new URL(request.url).origin;
      try {
        const checkoutSession = await createSubscriptionCheckoutSession({
          userId: session.user.id,
          userEmail: session.user.email,
          plan,
          successUrl: `${origin}/pricing?checkout=success`,
          cancelUrl: `${origin}/pricing?checkout=cancelled`,
        });
        return NextResponse.json({ url: checkoutSession.url });
      } catch (checkoutErr) {
        const status = checkoutErr?.code === "CONFIG" ? 503 : checkoutErr?.code === "INVALID_PLAN" ? 400 : 502;
        return NextResponse.json({ error: checkoutErr?.message || "Checkout is unavailable." }, { status });
      }
    }
    if (err?.code === "SAME_PLAN") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const status = err?.code === "CONFIG" ? 503 : err?.code === "INVALID_PLAN" ? 400 : 502;
    return NextResponse.json({ error: err?.message || "Subscription update failed." }, { status });
  }
}
