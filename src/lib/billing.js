import Stripe from "stripe";
import { db } from "@/lib/db";
import { stripeEvents } from "@/lib/schema";
import { grantPermanentCredits } from "@/lib/credits";

// Stripe 一次性充值（积分包）。订阅（Basic/Pro）是 Phase 4，这里先只处理一次性 mode=payment。
//
// 安全前提：浏览器只能提交 packId 这个套餐标识，Price ID、金额、积分数量一律服务端按 packId
// 查 CREDIT_PACKS + 环境变量决定，不接受客户端传入的任何金额/积分字段。

export const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

let client;
function stripe() {
  if (!client) {
    if (!process.env.STRIPE_SECRET_KEY) {
      const err = new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in .env.local.");
      err.code = "CONFIG";
      throw err;
    }
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}

// 积分包配置的唯一来源：credits 数量写死在这里，Price ID 从环境变量读（不同环境接不同 Stripe 产品）。
export const CREDIT_PACKS = {
  credits_40: { credits: 40, priceEnvVar: "STRIPE_PRICE_CREDITS_40" },
  credits_140: { credits: 140, priceEnvVar: "STRIPE_PRICE_CREDITS_140" },
  credits_320: { credits: 320, priceEnvVar: "STRIPE_PRICE_CREDITS_320" },
};

function packPriceId(packId) {
  const pack = CREDIT_PACKS[packId];
  return pack ? process.env[pack.priceEnvVar] || null : null;
}

export async function createTopupCheckoutSession({ userId, userEmail, packId, successUrl, cancelUrl }) {
  const pack = CREDIT_PACKS[packId];
  const priceId = packPriceId(packId);
  if (!pack || !priceId) {
    const err = new Error("This credit pack is not available right now.");
    err.code = "INVALID_PACK";
    throw err;
  }

  return stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: userEmail,
    client_reference_id: userId,
    metadata: { userId, packId, credits: String(pack.credits) },
    success_url: successUrl,
    cancel_url: cancelUrl,
    automatic_tax: { enabled: false },
  });
}

// webhook 入口：验签 → 幂等闭锁（stripe_events 主键 + onConflictDoNothing）→ 按类型分发。
export async function handleStripeWebhook(rawBody, signature) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    const err = new Error("STRIPE_WEBHOOK_SECRET is not set.");
    err.code = "CONFIG";
    throw err;
  }
  const event = stripe().webhooks.constructEvent(rawBody, signature, secret);

  const claimed = await claimEvent(event);
  if (!claimed) return { reason: "duplicate-event", type: event.type };

  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(event.data.object);
  }
  return { reason: "handled", type: event.type };
}

async function claimEvent(event) {
  const result = await db
    .insert(stripeEvents)
    .values({ id: event.id, type: event.type, createdAt: new Date().toISOString() })
    .onConflictDoNothing({ target: stripeEvents.id });
  return (result.rowsAffected ?? 0) > 0;
}

async function handleCheckoutCompleted(session) {
  if (session.mode !== "payment") return; // 订阅走 Phase 4 的 invoice.paid，不在这处理
  if (session.payment_status !== "paid") return;

  const userId = session.metadata?.userId || session.client_reference_id;
  const credits = Number(session.metadata?.credits || 0);
  if (!userId || !credits) return;

  await grantPermanentCredits(userId, credits, {
    reason: "topup_purchase",
    refType: "stripe_session",
    refId: session.id,
  });
}
