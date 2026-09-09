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
