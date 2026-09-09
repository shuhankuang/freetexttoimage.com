import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

// Drizzle schema — 字段/类型逐一对照当前 sqlite.db 的实际列（用 PRAGMA table_info + 抽样行核实过，
// 不是凭记忆写的模板）。better-auth 四张表由 getMigrations（Kysely）建出来，日期列实际存的是
// ISO 字符串（TEXT），不是 epoch 整数，所以这里用 text()，不是 integer(mode:'timestamp')。

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: text("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: text("accessTokenExpiresAt"),
  refreshTokenExpiresAt: text("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: text("expiresAt").notNull(),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

// ── 业务表：字段沿用现有 snake_case 列名，JS 侧用驼峰属性名 ──────────

export const creations = sqliteTable(
  "creations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    prompt: text("prompt").notNull(),
    style: text("style"),
    ratio: text("ratio"),
    image: text("image"),
    imageKey: text("image_key"),
    thumbnailKey: text("thumbnail_key"),
    status: text("status").notNull().default("processing"),
    model: text("model"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_creations_user").on(table.userId)]
);

export const generationJobs = sqliteTable(
  "generation_jobs",
  {
    id: text("id").primaryKey(),
    creationId: text("creation_id").notNull(),
    userId: text("user_id").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    externalTaskId: text("external_task_id"),
    status: text("status").notNull().default("processing"), // processing / succeeded / failed
    error: text("error"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_jobs_creation").on(table.creationId),
    index("idx_jobs_external").on(table.externalTaskId),
    index("idx_jobs_user_status").on(table.userId, table.status),
  ]
);

// ── 积分账本（Phase 2）────────────────────────────────────
// 月度积分（订阅赠送，不结转）+ 永久积分（充值/注册赠送，不过期）分两个字段存，
// 每个用户一行，一号位主键，插入用 onConflictDoNothing 保证注册赠送幂等。
export const creditAccounts = sqliteTable("credit_accounts", {
  userId: text("user_id").primaryKey(),
  monthlyBalance: integer("monthly_balance").notNull().default(0),
  permanentBalance: integer("permanent_balance").notNull().default(0),
  monthlyResetAt: text("monthly_reset_at"), // Phase 4（订阅）接入后才会用
});

// 每一笔积分变动都记一行，bucket 区分扣/退的是月度还是永久，reason 区分事件类型
// （signup_bonus / generation_hold / generation_refund / ...）。refType+refId 关联到具体的
// job/order，退款时靠它精确查回原来扣了哪个桶多少，不靠重新计算。
export const creditLedger = sqliteTable(
  "credit_ledger",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    delta: integer("delta").notNull(), // 正数入账，负数消费
    bucket: text("bucket").notNull(), // 'monthly' | 'permanent'
    reason: text("reason").notNull(),
    refType: text("ref_type"),
    refId: text("ref_id"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_credit_ledger_user").on(table.userId),
    index("idx_credit_ledger_ref").on(table.refType, table.refId),
  ]
);
