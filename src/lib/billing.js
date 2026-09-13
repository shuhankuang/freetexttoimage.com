import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { stripeEvents, stripeCustomers, subscriptions, creditLedger } from "@/lib/schema";
import { grantPermanentCredits, resetMonthlyCredits, refreshMonthlyCreditsIfDue, getBalance } from "@/lib/credits";

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
    allow_promotion_codes: true,
  });
}

// ── 订阅（Phase 4）───────────────────────────────────────
export const SUBSCRIPTION_PLANS = {
  basic: {
    credits: 120,
    prices: { month: "STRIPE_PRICE_BASIC", year: "STRIPE_PRICE_BASIC_YEARLY" },
  },
  pro: {
    credits: 400,
    prices: { month: "STRIPE_PRICE_PRO", year: "STRIPE_PRICE_PRO_YEARLY" },
  },
};

export const BILLING_INTERVALS = ["month", "year"];

function planPriceId(plan, interval) {
  const spec = SUBSCRIPTION_PLANS[plan];
  const envVar = spec?.prices?.[interval];
  return envVar ? process.env[envVar] || null : null;
}

function planFromPriceId(priceId) {
  for (const [plan, spec] of Object.entries(SUBSCRIPTION_PLANS)) {
    for (const [interval, envVar] of Object.entries(spec.prices)) {
      if (process.env[envVar] === priceId) return { plan, interval };
    }
  }
  return null;
}

function subscriptionPeriod(sub, fallbackPlan = null, fallbackInterval = null) {
  const item = sub.items?.data?.[0];
  const matched = planFromPriceId(item?.price?.id);
  return {
    plan: matched?.plan || sub.metadata?.plan || fallbackPlan,
    interval: matched?.interval || item?.price?.recurring?.interval || sub.metadata?.interval || fallbackInterval || "month",
  };
}

function stripeDate(seconds) {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

function anniversary(anchor, monthOffset) {
  const year = anchor.getUTCFullYear() + Math.floor((anchor.getUTCMonth() + monthOffset) / 12);
  const month = (anchor.getUTCMonth() + monthOffset) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    year,
    month,
    Math.min(anchor.getUTCDate(), lastDay),
    anchor.getUTCHours(),
    anchor.getUTCMinutes(),
    anchor.getUTCSeconds()
  ));
}

// 返回 after 之后的首个订阅月纪念日。每次都从原始 Stripe anchor 计算，2 月不会让 31 日永久漂移。
function nextMonthlyAnniversary(anchorValue, afterValue = new Date()) {
  const anchor = new Date(anchorValue);
  const after = new Date(afterValue);
  let offset = (after.getUTCFullYear() - anchor.getUTCFullYear()) * 12
    + after.getUTCMonth() - anchor.getUTCMonth();
  if (offset < 0) offset = 0;
  let candidate = anniversary(anchor, offset);
  if (candidate.getTime() <= after.getTime()) candidate = anniversary(anchor, offset + 1);
  return candidate.toISOString();
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
export async function createSubscriptionCheckoutSession({ userId, userEmail, plan, interval, successUrl, cancelUrl }) {
  const priceId = planPriceId(plan, interval);
  if (!SUBSCRIPTION_PLANS[plan] || !BILLING_INTERVALS.includes(interval) || !priceId) {
    const err = new Error("This plan is not available right now.");
    err.code = "INVALID_PLAN";
    throw err;
  }
  const customerId = await getOrCreateStripeCustomer(userId, userEmail);

  return stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { userId, plan, interval } },
    success_url: successUrl,
    cancel_url: cancelUrl,
    automatic_tax: { enabled: false },
    allow_promotion_codes: true,
  });
}

// 升级：已有有效订阅时直接换价格，不走 Checkout、不走"取消老的建新的"——同一个 Stripe 订阅对象，
// proration_behavior:'none' + billing_cycle_anchor:'now' = 立即生效、收全价、账期从现在重开。
// 天然保证一个用户只有一个 Stripe 订阅对象，不会出现两条并存的情况。
export async function upgradeSubscription({ userId, plan, interval }) {
  const priceId = planPriceId(plan, interval);
  if (!SUBSCRIPTION_PLANS[plan] || !BILLING_INTERVALS.includes(interval) || !priceId) {
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
  const currentTier = row.plan === "pro" ? 2 : 1;
  const nextTier = plan === "pro" ? 2 : 1;
  if (row.billingInterval !== interval || nextTier < currentTier) {
    const err = new Error("This subscription change must be scheduled for the next billing period.");
    err.code = "SCHEDULE_CHANGE";
    throw err;
  }
  if (row.plan === plan) {
    const err = new Error("Already on this plan.");
    err.code = "SAME_PLAN";
    throw err;
  }

  const current = await stripe().subscriptions.retrieve(row.stripeSubscriptionId);
  const itemId = current.items.data[0].id;

  // 用户可能先安排了账期末切换，随后又选择立即升级；先释放旧 schedule，避免 Stripe 拒绝修改。
  if (current.schedule) {
    const scheduleId = typeof current.schedule === "string" ? current.schedule : current.schedule.id;
    await stripe().subscriptionSchedules.release(scheduleId);
  }

  await stripe().subscriptions.update(row.stripeSubscriptionId, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: "none",
    billing_cycle_anchor: "now",
    metadata: { userId, plan, interval },
  });
  // 积分重置 + subscriptions 行更新都靠随之而来的 invoice.paid / customer.subscription.updated
  // webhook 完成，这里不重复写——同一份状态只有一个写入入口，避免和 webhook 打架。
}

// 降级与月付/年付切换都在当前账期结束时生效。Stripe Portal 无法可靠地安排跨 Product
// 的降级，因此用官方 Subscription Schedule 明确创建下一阶段，避免立即改价或意外补差价。
export async function scheduleSubscriptionChange({ userId, plan, interval }) {
  const priceId = planPriceId(plan, interval);
  if (!SUBSCRIPTION_PLANS[plan] || !BILLING_INTERVALS.includes(interval) || !priceId) {
    const err = new Error("This plan is not available right now.");
    err.code = "INVALID_PLAN";
    throw err;
  }

  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  if (!row || row.status !== "active") {
    const err = new Error("No active subscription to change.");
    err.code = "NO_ACTIVE_SUBSCRIPTION";
    throw err;
  }

  const current = await stripe().subscriptions.retrieve(row.stripeSubscriptionId);
  const item = current.items.data[0];
  let schedule = current.schedule
    ? await stripe().subscriptionSchedules.retrieve(typeof current.schedule === "string" ? current.schedule : current.schedule.id)
    : await stripe().subscriptionSchedules.create({ from_subscription: current.id });

  const phaseStart = schedule.current_phase?.start_date || item.current_period_start;
  const phaseEnd = item.current_period_end;
  schedule = await stripe().subscriptionSchedules.update(schedule.id, {
    end_behavior: "release",
    proration_behavior: "none",
    phases: [
      {
        start_date: phaseStart,
        end_date: phaseEnd,
        items: [{ price: item.price.id, quantity: item.quantity || 1 }],
        metadata: { ...current.metadata },
        proration_behavior: "none",
      },
      {
        start_date: phaseEnd,
        iterations: 1,
        items: [{ price: priceId, quantity: 1 }],
        metadata: { userId, plan, interval },
        proration_behavior: "none",
      },
    ],
  });
  return { effectiveAt: stripeDate(phaseEnd), scheduleId: schedule.id };
}

// Customer Portal 用于付款方式与取消；套餐降级和付费周期切换由上面的 Subscription Schedule 处理。
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
  const matched = planFromPriceId(priceId);
  if (!matched) return;

  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const userId = sub.metadata?.userId;
  if (!userId) return;

  const item = sub.items?.data?.[0];
  const anchorAt = stripeDate(sub.billing_cycle_anchor);
  const nextResetAt = matched.interval === "year"
    ? nextMonthlyAnniversary(anchorAt, new Date())
    : stripeDate(item?.current_period_end);

  await resetMonthlyCredits(userId, SUBSCRIPTION_PLANS[matched.plan].credits, {
    reason: "subscription_renewal",
    refType: "stripe_invoice",
    refId: invoice.id,
    monthlyResetAt: nextResetAt,
    idempotencyKey: invoice.id,
  });
  await upsertSubscriptionRow(userId, sub, matched.plan, matched.interval);
}

async function syncSubscriptionRow(sub) {
  const userId = sub.metadata?.userId;
  if (!userId) return;
  const period = subscriptionPeriod(sub);
  await upsertSubscriptionRow(userId, sub, period.plan, period.interval);
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

async function upsertSubscriptionRow(userId, sub, plan, interval) {
  // current_period_end 在这个 API 版本里挂在订阅项（item）上，不是订阅对象顶层——
  // Stripe 的多价格订阅改版把「周期」下放到了每个 item，不再假设整个订阅只有一个统一周期。
  const periodEnd = sub.items?.data?.[0]?.current_period_end;
  const row = {
    stripeSubscriptionId: sub.id,
    plan: plan || "unknown",
    billingInterval: interval || "month",
    billingAnchorAt: stripeDate(sub.billing_cycle_anchor),
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

// ── 对账 / 自愈（Phase 5）─────────────────────────────────
// 复用 generation.js ensurePolling 的思路：不起独立后台进程，用户访问账单相关页面时，
// 如果本地订阅状态"陈旧"（超过一小时没被 webhook 更新过）就顺手拉一次 Stripe API 核对，
// 状态不一致就纠正；如果发现最新一张发票已付款但本地没有对应的积分发放记录（webhook 真的丢了，
// 不只是慢），一并补发，不用等用户发现自己"充了钱没到账"再来问。
const SUBSCRIPTION_STALE_MS = 60 * 60 * 1000;

export async function ensureSubscriptionFresh(userId) {
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  if (!row || row.status !== "active") return row; // 没订阅过，或已经是终态，不用高频核对
  if (Date.now() - new Date(row.updatedAt).getTime() <= SUBSCRIPTION_STALE_MS) return row;

  try {
    const sub = await stripe().subscriptions.retrieve(row.stripeSubscriptionId, { expand: ["latest_invoice"] });
    const period = subscriptionPeriod(sub, row.plan, row.billingInterval);
    await upsertSubscriptionRow(userId, sub, period.plan, period.interval);

    const invoice = sub.latest_invoice;
    if (invoice && invoice.status === "paid" && SUBSCRIPTION_PLANS[period.plan]) {
      const already = await db
        .select()
        .from(creditLedger)
        .where(and(eq(creditLedger.refType, "stripe_invoice"), eq(creditLedger.refId, invoice.id), eq(creditLedger.reason, "subscription_renewal")));
      if (already.length === 0) {
        const nextResetAt = period.interval === "year"
          ? nextMonthlyAnniversary(stripeDate(sub.billing_cycle_anchor), new Date())
          : stripeDate(sub.items?.data?.[0]?.current_period_end);
        await resetMonthlyCredits(userId, SUBSCRIPTION_PLANS[period.plan].credits, {
          reason: "subscription_renewal",
          refType: "stripe_invoice",
          refId: invoice.id,
          monthlyResetAt: nextResetAt,
          idempotencyKey: invoice.id,
        });
      }
    }
  } catch (err) {
    console.error("[billing] subscription reconcile failed:", err?.message || err); // Stripe 瞬时故障，先用本地数据，下次再核对
  }

  const [fresh] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  return fresh;
}

// 月付每月都有 invoice.paid；年付只在年度账单时有，因此年内靠访问时的 CAS 刷新当前月额度。
export async function ensureSubscriptionCreditsFresh(userId) {
  const subscription = await ensureSubscriptionFresh(userId);
  if (!subscription || subscription.status !== "active" || subscription.billingInterval !== "year") {
    return subscription;
  }

  const now = new Date();
  if (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd).getTime() <= now.getTime()) {
    return subscription;
  }

  const balance = await getBalance(userId);
  if (!balance.monthlyResetAt || new Date(balance.monthlyResetAt).getTime() > now.getTime()) return subscription;

  const anchorAt = subscription.billingAnchorAt || balance.monthlyResetAt;
  const nextResetAt = nextMonthlyAnniversary(anchorAt, now);
  await refreshMonthlyCreditsIfDue(userId, SUBSCRIPTION_PLANS[subscription.plan].credits, {
    expectedResetAt: balance.monthlyResetAt,
    nextResetAt,
    periodKey: `${subscription.stripeSubscriptionId}:${nextResetAt}`,
  });
  return subscription;
}

// 账单状态一次性拉齐：先自愈再读，前端账户/账单页用这一个接口就够。
export async function getBillingStatus(userId) {
  const subscription = await ensureSubscriptionCreditsFresh(userId);
  const credits = await getBalance(userId);
  return {
    credits,
    subscription: subscription
      ? {
          plan: subscription.plan,
          interval: subscription.billingInterval,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        }
      : null,
  };
}
