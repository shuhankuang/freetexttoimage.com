// 用法：pnpm db:setup；正式库：node scripts/setup-db.mjs --env=.env.production
// 对 TURSO_DATABASE_URL 指向的库应用 drizzle/ 下的迁移文件（better-auth 四表 + creations + generation_jobs）。
// 改了 src/lib/schema.js 之后先跑 `pnpm exec drizzle-kit generate` 生成新的迁移文件，再跑本脚本应用。

import { loadEnvFile } from "node:process";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const envArg = process.argv.slice(2).find((value) => value.startsWith("--env="));
const envFile = envArg?.slice("--env=".length) || ".env.local";

try {
  loadEnvFile(envFile);
} catch {
  // 生产环境走真实环境变量，没有 .env.local 文件是正常情况。
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error(`Set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in ${envFile} before running db:setup.`);
  }

  const client = createClient({ url, authToken });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ 数据库迁移完成 →", url);
}

main().catch((error) => {
  console.error("\n✗ 数据库 setup 失败：", error?.message || error);
  process.exit(1);
});
