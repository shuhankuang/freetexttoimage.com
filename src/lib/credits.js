import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { creditAccounts, creditLedger } from "@/lib/schema";

// 积分账本服务端访问层。
// 语义：generation_hold 在生成前扣（月度优先、永久其次），成功不再有动作（等于确认消费）；
// 失败/超时/上传失败按 generation.js 里 applyCreationStatus 的原子闭锁只退一次。
// 每笔扣款按实际用到的桶各记一条 ledger（bucket），退款靠查回这些 ledger 行精确退回对应的桶，
// 不重新计算——这样即使以后月度积分有重置逻辑，退款也不会退错桶。

const SIGNUP_BONUS_PERMANENT = 10;
const iso = () => new Date().toISOString();

// 注册即送：insert + onConflictDoNothing 是唯一的幂等保证（不是前面判断是否已存在的读——
// 那只是省一次无谓写入的优化，真正防止并发/重复调用发两次的是这条唯一约束插入）。
export async function grantSignupBonus(userId) {
  const result = await db
    .insert(creditAccounts)
    .values({ userId, monthlyBalance: 0, permanentBalance: SIGNUP_BONUS_PERMANENT })
    .onConflictDoNothing({ target: creditAccounts.userId });

  if ((result.rowsAffected ?? 0) === 0) return; // 已经发过，不重复记账

  await db.insert(creditLedger).values({
    id: crypto.randomUUID(),
    userId,
    delta: SIGNUP_BONUS_PERMANENT,
    bucket: "permanent",
    reason: "signup_bonus",
    refType: null,
    refId: null,
    createdAt: iso(),
  });
}

// 永久积分入账（一次性充值 / 以后的退款追回场景复用）。加法更新天然并发安全，不需要 CAS；
// 幂等靠调用方保证——Stripe 充值场景下靠 stripe_events 那层原子闭锁保证同一个 event 只处理一次，
// 这里不重复做一层判断。账户理论上注册时就建好了，rowsAffected=0（不存在）时兜底建一行。
export async function grantPermanentCredits(userId, amount, { reason, refType = null, refId = null }) {
  if (!amount || amount <= 0) return;

  const result = await db
    .update(creditAccounts)
    .set({ permanentBalance: sql`${creditAccounts.permanentBalance} + ${amount}` })
    .where(eq(creditAccounts.userId, userId));

  if ((result.rowsAffected ?? 0) === 0) {
    await db
      .insert(creditAccounts)
      .values({ userId, monthlyBalance: 0, permanentBalance: amount })
      .onConflictDoNothing({ target: creditAccounts.userId });
  }

  await db.insert(creditLedger).values({
    id: crypto.randomUUID(),
    userId,
    delta: amount,
    bucket: "permanent",
    reason,
    refType,
    refId,
    createdAt: iso(),
  });
}

// 月度积分发放/重置（订阅 invoice.paid 时调用）。是"设为 X"不是"加 X"——月度积分不结转，
// 上个周期没花完的会被覆盖掉，ledger 记的 delta 是净变化量（可能是负数，代表没花完的部分被清零），
// 保留审计轨迹。幂等靠外层 stripe_events 的原子闭锁保证同一张发票只处理一次，这里不用再 CAS。
export async function resetMonthlyCredits(userId, amount, { reason, refType = null, refId = null }) {
  const [account] = await db.select().from(creditAccounts).where(eq(creditAccounts.userId, userId));
  const previous = account?.monthlyBalance ?? 0;
  const delta = amount - previous;

  if (account) {
    await db.update(creditAccounts).set({ monthlyBalance: amount }).where(eq(creditAccounts.userId, userId));
  } else {
    await db
      .insert(creditAccounts)
      .values({ userId, monthlyBalance: amount, permanentBalance: 0 })
      .onConflictDoNothing({ target: creditAccounts.userId });
  }

  if (delta !== 0) {
    await db.insert(creditLedger).values({
      id: crypto.randomUUID(),
      userId,
      delta,
      bucket: "monthly",
      reason,
      refType,
      refId,
      createdAt: iso(),
    });
  }
}

export async function getBalance(userId) {
  const [account] = await db.select().from(creditAccounts).where(eq(creditAccounts.userId, userId));
  const monthlyBalance = account?.monthlyBalance ?? 0;
  const permanentBalance = account?.permanentBalance ?? 0;
  return { monthlyBalance, permanentBalance, total: monthlyBalance + permanentBalance };
}

// 扣款（生成前调用）：月度优先、永久兜底，乐观并发控制（读→算→带条件 UPDATE→检查
// rowsAffected），撞车了重试几次——同一账号极少真并发下单，重试次数给够即可，不做无限重试。
// 成功会按实际用到的桶各记一条 ledger（reason='generation_hold'，refId=jobId），供 refundCredits 精确退款。
export async function deductCredits(userId, cost, { jobId }) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const [account] = await db.select().from(creditAccounts).where(eq(creditAccounts.userId, userId));
    if (!account) return false; // 没有账户（理论上注册钩子会建），当没积分处理

    const monthlyUsed = Math.min(account.monthlyBalance, cost);
    const permanentUsed = cost - monthlyUsed;
    if (permanentUsed > account.permanentBalance) return false; // 余额不足

    const result = await db
      .update(creditAccounts)
      .set({
        monthlyBalance: account.monthlyBalance - monthlyUsed,
        permanentBalance: account.permanentBalance - permanentUsed,
      })
      .where(
        and(
          eq(creditAccounts.userId, userId),
          eq(creditAccounts.monthlyBalance, account.monthlyBalance),
          eq(creditAccounts.permanentBalance, account.permanentBalance)
        )
      );

    if ((result.rowsAffected ?? 0) === 0) continue; // 读之后被并发改了，重试

    const now = iso();
    const rows = [];
    if (monthlyUsed > 0) {
      rows.push({
        id: crypto.randomUUID(),
        userId,
        delta: -monthlyUsed,
        bucket: "monthly",
        reason: "generation_hold",
        refType: "job",
        refId: jobId,
        createdAt: now,
      });
    }
    if (permanentUsed > 0) {
      rows.push({
        id: crypto.randomUUID(),
        userId,
        delta: -permanentUsed,
        bucket: "permanent",
        reason: "generation_hold",
        refType: "job",
        refId: jobId,
        createdAt: now,
      });
    }
    if (rows.length) await db.insert(creditLedger).values(rows);
    return true;
  }
  return false; // 三次都撞车，极端并发下放弃，调用方按余额不足处理
}

// 退款（job 失败/超时时调用）：查回这个 job 的 generation_hold 记录，按桶精确退回。
// 单纯加法（col = col + delta），并发安全，不需要 CAS。已经退过就直接跳过（幂等兜底；
// 正常路径下 generation.js 已经用 applyCreationStatus 的原子闭锁保证每个 job 只会真正
// 触发一次退款调用，这里的检查只是防御性的，不是唯一保障）。
export async function refundCredits(jobId) {
  const holds = await db
    .select()
    .from(creditLedger)
    .where(and(eq(creditLedger.refType, "job"), eq(creditLedger.refId, jobId), eq(creditLedger.reason, "generation_hold")));
  if (holds.length === 0) return; // 没扣过（比如还没扣款就失败了），无需退

  // 原子闭锁：用 jobId 派生出确定性 id 抢占一行——主键唯一约束保证并发/重复调用只有一个人
  // insert 成功，抢到的人才真正执行退款。之前这里是「先 SELECT 有没有退过再决定要不要退」，
  // 读和写不是一个原子操作，并发调用两次会都读到「没退过」、都真正加钱——测试并发退款时复现过。
  const guardResult = await db
    .insert(creditLedger)
    .values({
      id: `refund-guard:${jobId}`,
      userId: holds[0].userId,
      delta: 0,
      bucket: "guard",
      reason: "generation_refund_guard",
      refType: "job",
      refId: jobId,
      createdAt: iso(),
    })
    .onConflictDoNothing({ target: creditLedger.id });
  if ((guardResult.rowsAffected ?? 0) === 0) return; // 已经有人抢到并退过了

  const userId = holds[0].userId;
  const monthlyBack = holds.filter((h) => h.bucket === "monthly").reduce((sum, h) => sum + Math.abs(h.delta), 0);
  const permanentBack = holds.filter((h) => h.bucket === "permanent").reduce((sum, h) => sum + Math.abs(h.delta), 0);

  await db
    .update(creditAccounts)
    .set({
      monthlyBalance: sql`${creditAccounts.monthlyBalance} + ${monthlyBack}`,
      permanentBalance: sql`${creditAccounts.permanentBalance} + ${permanentBack}`,
    })
    .where(eq(creditAccounts.userId, userId));

  const now = iso();
  const rows = [];
  if (monthlyBack > 0) {
    rows.push({
      id: crypto.randomUUID(),
      userId,
      delta: monthlyBack,
      bucket: "monthly",
      reason: "generation_refund",
      refType: "job",
      refId: jobId,
      createdAt: now,
    });
  }
  if (permanentBack > 0) {
    rows.push({
      id: crypto.randomUUID(),
      userId,
      delta: permanentBack,
      bucket: "permanent",
      reason: "generation_refund",
      refType: "job",
      refId: jobId,
      createdAt: now,
    });
  }
  if (rows.length) await db.insert(creditLedger).values(rows);
}
