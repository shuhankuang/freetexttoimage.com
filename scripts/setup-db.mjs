// 用法：pnpm db:setup
// 1) 加载 .env.local（BETTER_AUTH_SECRET / BETTER_AUTH_URL）
// 2) 迁移 better-auth 的四张表（user / session / account / verification）
// 3) 建 creations 表
// 4) seed demo 用户 demo@forma.studio + 两条样例作品（幂等，可重复运行）

import { loadEnvFile } from "node:process";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { db } from "../src/lib/db.js";

const DEMO_EMAIL = "demo@forma.studio";
const DEMO_PASSWORD = "demo-password-123";
const DEMO_NAME = "Demo Creator";

const seedCreations = [
  {
    id: "sample-1",
    title: "Quiet desert forms",
    prompt:
      "Sculptural terracotta sand dunes beneath a pale blue sky, warm afternoon light, minimalist composition.",
    style: "Cinematic",
    ratio: "4:3",
    image: "/gallery/dunes.jpg",
    createdAt: "2026-09-08T08:30:00.000Z",
  },
  {
    id: "sample-2",
    title: "A room with soft light",
    prompt:
      "A serene contemporary living space, natural linen, sunlit neutral tones, architectural photography.",
    style: "Photographic",
    ratio: "1:1",
    image: "/gallery/architecture.jpg",
    createdAt: "2026-09-07T10:10:00.000Z",
  },
];

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

async function seedDemo() {
  const config = authConfig();
  const seedAuth = betterAuth(config);

  let userId = db.prepare("SELECT id FROM user WHERE email = ?").get(DEMO_EMAIL)?.id;

  if (!userId) {
    await seedAuth.api.signUpEmail({
      body: { email: DEMO_EMAIL, password: DEMO_PASSWORD, name: DEMO_NAME },
    });
    userId = db.prepare("SELECT id FROM user WHERE email = ?").get(DEMO_EMAIL)?.id;
    console.log(`✓ demo 用户已创建：${DEMO_EMAIL}`);
  } else {
    console.log("✓ demo 用户已存在，跳过创建");
  }

  const existing = db.prepare("SELECT COUNT(*) AS c FROM creations WHERE user_id = ?").get(userId).c;
  if (existing === 0) {
    const insert = db.prepare(
      `INSERT INTO creations (id, user_id, title, prompt, style, ratio, image, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const c of seedCreations) {
      insert.run(c.id, userId, c.title, c.prompt, c.style, c.ratio, c.image, c.createdAt);
    }
    console.log(`✓ 已 seed ${seedCreations.length} 条样例作品`);
  } else {
    console.log("✓ demo 用户已有作品，跳过 seed");
  }
}

async function main() {
  await migrateAuthTables();
  ensureCreationsTable();
  await seedDemo();
  console.log("\n数据库准备完成 → sqlite.db");
  process.exit(0);
}

main().catch((error) => {
  console.error("\n✗ 数据库 setup 失败：", error?.message || error);
  process.exit(1);
});
