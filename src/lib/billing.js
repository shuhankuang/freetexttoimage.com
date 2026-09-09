import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { stripeEvents, stripeCustomers, subscriptions } from "@/lib/schema";
import { grantPermanentCredits, resetMonthlyCredits } from "@/lib/credits";

// Stripe 集成：一次性积分充值（mode=payment）+ 订阅（mode=subscription）。
//
// 安全前提：浏览器只能提交 packId / plan 这类套餐标识，Price ID、金额、积分数量一律服务端按
// 标识查表 + 环境变量决定，不接受客户端传入的任何金额/积分字段。

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

const iso = () => new Date().toISOString();

// ── 一次性积分包（Phase 3）───────────────────────────────
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

// ── 订阅（Phase 4）───────────────────────────────────────
export const SUBSCRIPTION_PLANS = {
  basic: { credits: 100, priceEnvVar: "STRIPE_PRICE_BASIC" },
  pro: { credits: 350, priceEnvVar: "STRIPE_PRICE_PRO" },
};

function planPriceId(plan) {
  const spec = SUBSCRIPTION_PLANS[plan];
  return spec ? process.env[spec.priceEnvVar] || null : null;
}

function planFromPriceId(priceId) {
  return Object.entries(SUBSCRIPTION_PLANS).find(([, spec]) => process.env[spec.priceEnvVar] === priceId)?.[0] || null;
}

// 稳定的 userId ↔ Stripe customer 映射，订阅/升级/Portal 都要用同一个 customer，
// 不能像一次性充值那样每次现场传 customer_email 了事。insert+onConflictDoNothing 做原子闭锁；
// 插不进去说明并发下已经有别的请求建过了，重新读一次拿那条为准。
async function getOrCreateStripeCustomer(userId, email) {
  const [existing] = await db.select().from(stripeCustomers).where(eq(stripeCustomers.userId, userId));
  if (existing) return existing.stripeCustomerId;

  const customer = await stripe().customers.create({ email, metadata: { userId } });
  const result = await db
    .insert(stripeCustomers)
    .values({ userId, stripeCustomerId: customer.id, createdAt: iso() })
    .onConflictDoNothing({ target: stripeCustomers.userId });

  if ((result.rowsAffected ?? 0) > 0) return customer.id;

  // 并发下别人先插进去了：用那条为准，顺手把我们刚建的这个孤儿 customer 删掉，不留垃圾。
  const [winner] = await db.select().from(stripeCustomers).where(eq(stripeCustomers.userId, userId));
  await stripe().customers.del(customer.id).catch(() => {});
  return winner.stripeCustomerId;
}

// 全新订阅：走 Checkout（第一次要收集卡信息，必须走 hosted page）。
export async function createSubscriptionCheckoutSession({ userId, userEmail, plan, successUrl, cancelUrl }) {
  const priceId = planPriceId(plan);
  if (!SUBSCRIPTION_PLANS[plan] || !priceId) {
    const err = new Error("This plan is not available right now.");
    err.code = "INVALID_PLAN";
    throw err;
  }
  const customerId = await getOrCreateStripeCustomer(userId, userEmail);

  return stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { userId, plan } },
    success_url: successUrl,
    cancel_url: cancelUrl,
    automatic_tax: { enabled: false },
  });
}

// 升级：已有有效订阅时直接换价格，不走 Checkout、不走"取消老的建新的"——同一个 Stripe 订阅对象，
// proration_behavior:'none' + billing_cycle_anchor:'now' = 立即生效、收全价、账期从现在重开。
// 天然保证一个用户只有一个 Stripe 订阅对象，不会出现两条并存的情况。
export async function upgradeSubscription({ userId, plan }) {
  const priceId = planPriceId(plan);
  if (!SUBSCRIPTION_PLANS[plan] || !priceId) {
    const err = new Error("This plan is not available right now.");
    err.code = "INVALID_PLAN";
    throw err;
  }
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  if (!row || row.status !== "active") {
    const err = new Error("No active subscription to upgrade.");
    err.code = "NO_ACTIVE_SUBSCRIPTION";
    throw err;
  }
  if (row.plan === plan) {
    const err = new Error("Already on this plan.");
    err.code = "SAME_PLAN";
    throw err;
  }

  const current = await stripe().subscriptions.retrieve(row.stripeSubscriptionId);
  const itemId = current.items.data[0].id;

  await stripe().subscriptions.update(row.stripeSubscriptionId, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: "none",
    billing_cycle_anchor: "now",
    metadata: { userId, plan },
  });
  // 积分重置 + subscriptions 行更新都靠随之而来的 invoice.paid / customer.subscription.updated
  // webhook 完成，这里不重复写——同一份状态只有一个写入入口，避免和 webhook 打架。
}

// Customer Portal：降级、取消（账期末生效）全部交给 Portal 自己处理，我们只负责跳过去。
export async function createPortalSession({ userId, returnUrl }) {
  const [row] = await db.select().from(stripeCustomers).where(eq(stripeCustomers.userId, userId));
  if (!row) {
    const err = new Error("No billing account yet.");
    err.code = "NO_CUSTOMER";
    throw err;
  }
  const configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID || undefined;
  return stripe().billingPortal.sessions.create({ customer: row.stripeCustomerId, return_url: returnUrl, configuration });
}

// ── webhook ─────────────────────────────────────────────
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

  if (event.type === "checkout.session.completed") await handleCheckoutCompleted(event.data.object);
  else if (event.type === "invoice.paid") await handleInvoicePaid(event.data.object);
  else if (event.type === "customer.subscription.updated") await syncSubscriptionRow(event.data.object);
  else if (event.type === "customer.subscription.deleted") await handleSubscriptionDeleted(event.data.object);

  return { reason: "handled", type: event.type };
}

async function claimEvent(event) {
  const result = await db
    .insert(stripeEvents)
    .values({ id: event.id, type: event.type, createdAt: iso() })
    .onConflictDoNothing({ target: stripeEvents.id });
  return (result.rowsAffected ?? 0) > 0;
}

async function handleCheckoutCompleted(session) {
  if (session.mode !== "payment") return; // 订阅走 invoice.paid 发积分，这里不重复处理
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

// 月度积分只在这里发/重置——不能靠 checkout 成功页，也不能靠 subscription.updated
// （那个事件不代表"钱真的到账了"）。新订阅的首张发票、每期续费的发票都会走到这里。
async function handleInvoicePaid(invoice) {
  // 这个账号默认的 Stripe API 版本把订阅相关字段挪到了 invoice.parent.subscription_details 下面，
  // invoice.subscription / invoice.lines[].price 这些「经典」字段在这个版本里已经不存在了。
  const subscriptionId = invoice.parent?.subscription_details?.subscription;
  if (!subscriptionId) return; // 一次性付款的发票（理论上不会有，防御性判断）
  const priceId = invoice.lines?.data?.[0]?.pricing?.price_details?.price;
  const plan = planFromPriceId(priceId);
  if (!plan) return;

  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const userId = sub.metadata?.userId;
  if (!userId) return;

  await resetMonthlyCredits(userId, SUBSCRIPTION_PLANS[plan].credits, {
    reason: "subscription_renewal",
    refType: "stripe_invoice",
    refId: invoice.id,
  });
  await upsertSubscriptionRow(userId, sub, plan);
}

async function syncSubscriptionRow(sub) {
  const userId = sub.metadata?.userId;
  if (!userId) return;
  const plan = planFromPriceId(sub.items?.data?.[0]?.price?.id) || sub.metadata?.plan || null;
  await upsertSubscriptionRow(userId, sub, plan);
}

async function handleSubscriptionDeleted(sub) {
  const userId = sub.metadata?.userId;
  if (!userId) return;
  await db
    .update(subscriptions)
    .set({ status: "canceled", updatedAt: iso() })
    .where(eq(subscriptions.userId, userId));
  // 已发的月度积分不追回——只是不再续期，符合"取消在账期末生效"的语义。
}

async function upsertSubscriptionRow(userId, sub, plan) {
  // current_period_end 在这个 API 版本里挂在订阅项（item）上，不是订阅对象顶层——
  // Stripe 的多价格订阅改版把「周期」下放到了每个 item，不再假设整个订阅只有一个统一周期。
  const periodEnd = sub.items?.data?.[0]?.current_period_end;
  const row = {
    stripeSubscriptionId: sub.id,
    plan: plan || "unknown",
    status: sub.status,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    updatedAt: iso(),
  };
  const result = await db.update(subscriptions).set(row).where(eq(subscriptions.userId, userId));
  if ((result.rowsAffected ?? 0) === 0) {
    await db
      .insert(subscriptions)
      .values({ userId, ...row, createdAt: iso() })
      .onConflictDoNothing({ target: subscriptions.userId });
  }
}
