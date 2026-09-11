import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createSubscriptionCheckoutSession, scheduleSubscriptionChange, upgradeSubscription, BILLING_INTERVALS, SUBSCRIPTION_PLANS } from "@/lib/billing";
import { localePath } from "@/i18n/config";

// 订阅入口：body 只接受服务端白名单里的 plan / interval；价格与积分额度不能由浏览器提交。
// 没有有效订阅 → 走 Checkout（第一次要收卡）；已有有效订阅且换套餐 → 直接升级（立即生效，见 billing.js）。
// 降级和周期切换由本接口建立 Subscription Schedule；取消与付款方式走 /api/billing/portal。
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
  const interval = body?.interval;
  if (!SUBSCRIPTION_PLANS[plan] || !BILLING_INTERVALS.includes(interval)) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  try {
    await upgradeSubscription({ userId: session.user.id, plan, interval });
    return NextResponse.json({ immediate: true });
  } catch (err) {
    if (err?.code === "NO_ACTIVE_SUBSCRIPTION") {
      const origin = process.env.APP_URL || new URL(request.url).origin;
      const pricingPath = localePath(body?.locale === "ja" ? "ja" : "en", "/pricing");
      try {
        const checkoutSession = await createSubscriptionCheckoutSession({
          userId: session.user.id,
          userEmail: session.user.email,
          plan,
          interval,
          successUrl: `${origin}${pricingPath}?checkout=success`,
          cancelUrl: `${origin}${pricingPath}`,
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
    if (err?.code === "SCHEDULE_CHANGE") {
      try {
        const scheduled = await scheduleSubscriptionChange({ userId: session.user.id, plan, interval });
        return NextResponse.json({ scheduled: true, ...scheduled });
      } catch (scheduleErr) {
        return NextResponse.json({ error: scheduleErr?.message || "Subscription change could not be scheduled." }, { status: 502 });
      }
    }
    const status = err?.code === "CONFIG" ? 503 : err?.code === "INVALID_PLAN" ? 400 : 502;
    return NextResponse.json({ error: err?.message || "Subscription update failed." }, { status });
  }
}
