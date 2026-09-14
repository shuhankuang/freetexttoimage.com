import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

// Drizzle schema — 字段/类型已经按迁移前的实际表结构核对，并由 drizzle/ 迁移记录维护。
// better-auth 四张表的日期列实际存的是
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

// 注册奖励身份占位：不保存原始邮箱，只保存规范化邮箱的 HMAC。
// 两个唯一约束分别保证同一个收件箱和同一个用户都只能领取一次。
export const signupBonusClaims = sqliteTable("signup_bonus_claims", {
  emailHash: text("email_hash").primaryKey(),
  userId: text("user_id").notNull().unique(),
  ipHash: text("ip_hash"),
  amount: integer("amount").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_signup_bonus_claims_ip_time").on(table.ipHash, table.createdAt)]);

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

// ── Stripe（Phase 3+）─────────────────────────────────────
// webhook 幂等：Stripe 会重复投递同一个 event，处理前先插这一行（主键 = event id，
// onConflictDoNothing），插不进去说明已经处理过，直接跳过——跟 credit_ledger 的退款闭锁
// 是同一个模式，靠主键唯一约束做原子闭锁，不是「先查有没有处理过」。
export const stripeEvents = sqliteTable("stripe_events", {
  id: text("id").primaryKey(), // Stripe event id，如 evt_xxx
  type: text("type").notNull(),
  createdAt: text("created_at").notNull(),
});

// userId ↔ Stripe customer 的稳定映射（Phase 4 订阅需要一个稳定 customer 才能复用/升级/开 Portal；
// 一次性充值那条路径没有用到这张表，走的是 Checkout 的 customer_email）。
export const stripeCustomers = sqliteTable(
  "stripe_customers",
  {
    userId: text("user_id").primaryKey(),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_stripe_customers_customer").on(table.stripeCustomerId)]
);

// 每个用户最多一条订阅记录（userId 主键，天然保证不会有两条并存）。status 是 Stripe 订阅状态
// 原样存（active/past_due/canceled/...）；credits 授予不在这张表发生，靠 invoice.paid 那条路径。
export const subscriptions = sqliteTable("subscriptions", {
  userId: text("user_id").primaryKey(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull(),
  plan: text("plan").notNull(), // 'basic' | 'pro'
  billingInterval: text("billing_interval").notNull().default("month"), // 'month' | 'year'
  billingAnchorAt: text("billing_anchor_at"), // Stripe billing_cycle_anchor，用于年付内的月度积分刷新
  status: text("status").notNull(),
  currentPeriodEnd: text("current_period_end"),
  cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ── 公开 Prompt 画廊 ─────────────────────────────────────
// images_json 按展示顺序保存；第 1 项永远是封面。这样封面顺序由导入端一次确定，
// 列表、详情和后续 API 不会各自猜测 coverUrl。
export const promptItems = sqliteTable(
  "prompt_items",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id").notNull(),
    sourceFingerprint: text("source_fingerprint"),
    modelSlug: text("model_slug").notNull(),
    modelLabel: text("model_label").notNull(),
    prompt: text("prompt").notNull(),
    promptType: text("prompt_type").notNull().default("text"),
    title: text("title"),
    authorName: text("author_name").notNull(),
    authorHandle: text("author_handle").notNull(),
    sourceUrl: text("source_url").notNull(),
    viewCount: integer("view_count"),
    publishedAt: integer("published_at").notNull(),
    images: text("images_json", { mode: "json" }).notNull(),
    deletedAt: text("deleted_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_prompt_items_source_id").on(table.sourceId),
    index("idx_prompt_items_model_page").on(table.modelSlug, table.publishedAt, table.id),
    index("idx_prompt_items_public_page").on(table.modelSlug, table.deletedAt, table.publishedAt, table.id),
  ]
);

export const promptImportFiles = sqliteTable("prompt_import_files", {
  fileHash: text("file_hash").primaryKey(),
  filePath: text("file_path").notNull(),
  status: text("status").notNull(),
  itemCount: integer("item_count").notNull().default(0),
  error: text("error"),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
});

export const promptImportJobs = sqliteTable(
  "prompt_import_jobs",
  {
    id: text("id").primaryKey(),
    contentHash: text("content_hash").notNull(),
    fileName: text("file_name").notNull(),
    objectKey: text("object_key").notNull(),
    sourceDate: integer("source_date").notNull(),
    seriesName: text("series_name").notNull(),
    sequence: integer("sequence").notNull().default(1),
    status: text("status").notNull().default("preview"),
    allowUpdates: integer("allow_updates", { mode: "boolean" }).notNull().default(false),
    totalCount: integer("total_count").notNull().default(0),
    newCount: integer("new_count").notNull().default(0),
    duplicateCount: integer("duplicate_count").notNull().default(0),
    changedCount: integer("changed_count").notNull().default(0),
    processedCount: integer("processed_count").notNull().default(0),
    insertedCount: integer("inserted_count").notNull().default(0),
    updatedCount: integer("updated_count").notNull().default(0),
    skippedCount: integer("skipped_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    changes: text("changes_json", { mode: "json" }).notNull().default([]),
    errors: text("errors_json", { mode: "json" }).notNull().default([]),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at").notNull(),
    confirmedAt: text("confirmed_at"),
    startedAt: text("started_at"),
    heartbeatAt: text("heartbeat_at"),
    completedAt: text("completed_at"),
  },
  (table) => [
    uniqueIndex("idx_prompt_import_jobs_content_hash").on(table.contentHash),
    index("idx_prompt_import_jobs_queue").on(table.status, table.sourceDate, table.seriesName, table.sequence, table.fileName),
  ]
);

export const promptImportWorkerLocks = sqliteTable("prompt_import_worker_locks", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const promptSyncSettings = sqliteTable("prompt_sync_settings", {
  id: integer("id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  updatedBy: text("updated_by"),
  updatedAt: text("updated_at").notNull(),
});

export const promptSyncSources = sqliteTable("prompt_sync_sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  preset: text("preset").notNull(),
  query: text("query").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  minFaves: integer("min_faves").notNull().default(5),
  lookbackHours: integer("lookback_hours").notNull().default(48),
  maxRecords: integer("max_records").notNull().default(500),
  lastRunAt: text("last_run_at"),
  lastStatus: text("last_status"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
