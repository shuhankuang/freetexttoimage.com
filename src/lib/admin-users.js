import "server-only";
import { Buffer } from "node:buffer";
import { and, desc, eq, inArray, like, lt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { creations, creditAccounts, creditLedger, subscriptions, user } from "@/lib/schema";

// Admin 用户列表/详情查询层。全部只读、直查 Drizzle，风格对齐 src/lib/creations.js。
//
// 刻意不用 src/lib/billing.js 的 getBillingStatus/getBalance ——那两个函数是有副作用的
// "读"：会对账 Stripe 订阅、发放签到奖励、写 credit_accounts。管理员每次点开一个用户详情页
// 都触发一遍这些写操作/外部调用，既慢又违反这个后台"只读查看"的范围。这里直接读本地
// subscriptions / credit_accounts 表，零 Stripe 调用、零写库。

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;

function encodeCursor(row) {
  return Buffer.from(JSON.stringify([row.createdAt, row.id])).toString("base64url");
}

function decodeCursor(value) {
  if (!value) return null;
  try {
    const [createdAt, id] = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt)) || typeof id !== "string" || !id) {
      throw new Error("invalid cursor values");
    }
    return { createdAt, id };
  } catch {
    const error = new Error("Invalid users cursor");
    error.code = "INVALID_CURSOR";
    throw error;
  }
}

function afterCursor(c) {
  return or(lt(user.createdAt, c.createdAt), and(eq(user.createdAt, c.createdAt), lt(user.id, c.id)));
}

// paidOnly 时用 INNER JOIN 把没有订阅记录的用户直接排除；其余情况用 LEFT JOIN，
// 没订阅过的用户 plan/subscriptionStatus 就是 null。
function withSubscriptionJoin(query, paidOnly) {
  return paidOnly
    ? query.innerJoin(subscriptions, eq(subscriptions.userId, user.id))
    : query.leftJoin(subscriptions, eq(subscriptions.userId, user.id));
}

export async function listUsersPage({ limit = DEFAULT_PAGE_SIZE, cursor: rawCursor, search, paidOnly = false } = {}) {
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(limit, 10) || DEFAULT_PAGE_SIZE));
  const cursor = decodeCursor(rawCursor);
  const term = search?.trim();

  const filters = [
    term ? or(like(user.email, `%${term}%`), like(user.name, `%${term}%`)) : undefined,
    paidOnly ? eq(subscriptions.status, "active") : undefined,
  ];
  const where = and(...filters, cursor ? afterCursor(cursor) : undefined);

  const rows = await withSubscriptionJoin(
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: user.createdAt,
        plan: subscriptions.plan,
        subscriptionStatus: subscriptions.status,
      })
      .from(user),
    paidOnly
  )
    .where(where)
    .orderBy(desc(user.createdAt), desc(user.id))
    .limit(pageSize + 1);

  const pageRows = rows.slice(0, pageSize);
  const hasMore = rows.length > pageSize;
  const last = pageRows.at(-1);

  let remaining = 0;
  if (hasMore) {
    const countRows = await withSubscriptionJoin(db.select({ count: sql`count(*)` }).from(user), paidOnly)
      .where(and(...filters, afterCursor(last)));
    remaining = Number(countRows[0].count);
  }

  const ids = pageRows.map((row) => row.id);
  const [credits, creationCounts] = ids.length
    ? await Promise.all([
        db.select().from(creditAccounts).where(inArray(creditAccounts.userId, ids)),
        db
          .select({ userId: creations.userId, count: sql`count(*)` })
          .from(creations)
          .where(inArray(creations.userId, ids))
          .groupBy(creations.userId),
      ])
    : [[], []];
  const creditsByUser = new Map(credits.map((row) => [row.userId, row]));
  const countByUser = new Map(creationCounts.map((row) => [row.userId, Number(row.count)]));

  return {
    items: pageRows.map((row) => {
      const balance = creditsByUser.get(row.id);
      return {
        ...row,
        monthlyCredits: balance?.monthlyBalance ?? 0,
        permanentCredits: balance?.permanentBalance ?? 0,
        creationCount: countByUser.get(row.id) ?? 0,
      };
    }),
    nextCursor: hasMore ? encodeCursor(last) : null,
    remaining,
  };
}

export async function getUserProfile(userId) {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      plan: subscriptions.plan,
      billingInterval: subscriptions.billingInterval,
      subscriptionStatus: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
    })
    .from(user)
    .leftJoin(subscriptions, eq(subscriptions.userId, user.id))
    .where(eq(user.id, userId));
  if (!row) return null;

  const [creditsRows, topups] = await Promise.all([
    db.select().from(creditAccounts).where(eq(creditAccounts.userId, userId)),
    db
      .select()
      .from(creditLedger)
      .where(and(eq(creditLedger.userId, userId), eq(creditLedger.reason, "topup_purchase")))
      .orderBy(desc(creditLedger.createdAt))
      .limit(10),
  ]);
  const credits = creditsRows[0];

  return {
    ...row,
    monthlyCredits: credits?.monthlyBalance ?? 0,
    permanentCredits: credits?.permanentBalance ?? 0,
    topups,
  };
}
