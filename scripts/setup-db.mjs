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

// 对已存在的表做“缺列就补”，幂等、不动已有数据。
function addColumnIfMissing(table, name, ddl) {
  const has = db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === name);
  if (!has) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  return !has;
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
      image_key TEXT,
      status TEXT NOT NULL DEFAULT 'processing',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_creations_user ON creations(user_id);
  `);
  // 老库（接入 KIE 前）没有 status / image_key 列，这里补齐。
  let added = addColumnIfMissing("creations", "status", "status TEXT NOT NULL DEFAULT 'processing'");
  added = addColumnIfMissing("creations", "image_key", "image_key TEXT") || added;
  // 老库里的作品直接引用 /gallery/*.jpg（本地静态图，已“完成”）→ 标 succeeded。
  // 新库刚建时没有旧行，UPDATE 空转无副作用。
  db.exec(`UPDATE creations SET status = 'succeeded' WHERE status = 'processing' AND image IS NOT NULL`);
  console.log(`✓ creations 表就绪${added ? "（已补 status / image_key 列并回填旧数据）" : ""}`);
}

// 异步生成任务表：一次“生成”= 一条 job（KIE 侧有对应 task），关联一条 creation。
function ensureGenerationJobsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS generation_jobs (
      id TEXT PRIMARY KEY,
      creation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      external_task_id TEXT,
      status TEXT NOT NULL DEFAULT 'processing', -- processing / succeeded / failed
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_creation ON generation_jobs(creation_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_external ON generation_jobs(external_task_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON generation_jobs(user_id, status);
  `);
  console.log("✓ generation_jobs 表就绪");
}

async function main() {
  await migrateAuthTables();
  ensureCreationsTable();
  ensureGenerationJobsTable();
  console.log("\n数据库准备完成 → sqlite.db");
  process.exit(0);
}

main().catch((error) => {
  console.error("\n✗ 数据库 setup 失败：", error?.message || error);
  process.exit(1);
});
