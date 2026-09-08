// 用法：pnpm db:setup
// 1) 加载 .env.local（BETTER_AUTH_SECRET / BETTER_AUTH_URL）
// 2) 迁移 better-auth 的四张表（user / session / account / verification）
// 3) 建 creations 表

import { loadEnvFile } from "node:process";
import { getMigrations } from "better-auth/db/migration";
import { db } from "../src/lib/db.js";

loadEnvFile(".env.local");

function authConfig() {
  return {
    database: db,
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
  };
}

async function migrateAuthTables() {
  const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(authConfig(), {
    throwOnUnsafe: false,
  });
  if (toBeCreated.length || toBeAdded.length) {
    await runMigrations();
    console.log(`✓ better-auth 表已迁移（新建 ${toBeCreated.length} 张，补列 ${toBeAdded.length} 处）`);
  } else {
    console.log("✓ better-auth 表已是最新，无需迁移");
  }
}

function ensureCreationsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS creations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      style TEXT,
      ratio TEXT,
      image TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_creations_user ON creations(user_id);
  `);
  console.log("✓ creations 表就绪");
}

async function main() {
  await migrateAuthTables();
  ensureCreationsTable();
  console.log("\n数据库准备完成 → sqlite.db");
  process.exit(0);
}

main().catch((error) => {
  console.error("\n✗ 数据库 setup 失败：", error?.message || error);
  process.exit(1);
});
