import { NextResponse } from "next/server";
import { handleStripeWebhook } from "@/lib/billing";

// Stripe webhook。必须用原始请求体验签（request.text()，不能先 JSON.parse 再序列化回去），
// 签名header 是 stripe-signature。验签失败/未配置 → 4xx（Stripe 不重试 4xx）；
// 处理过程中的其他失败 → 5xx，交给 Stripe 按其重试策略重投，幂等由 stripe_events 表兜底。
export async function POST(request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });

  const rawBody = await request.text();

  try {
    const result = await handleStripeWebhook(rawBody, signature);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[webhook/stripe] error:", err?.message || err);
    const status = err?.type === "StripeSignatureVerificationError" || err?.code === "CONFIG" ? 400 : 500;
    return NextResponse.json({ ok: false, error: err?.message || "Webhook processing failed." }, { status });
  }
}
