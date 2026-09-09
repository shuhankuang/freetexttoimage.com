import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/lib/schema";

// 共享的 Turso（libsql）连接 + Drizzle 实例。只能被服务端代码 import。
// 本地开发和线上都指向各自的 Turso 库（两个独立数据库，见项目内迁移计划）。
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  throw new Error(
    "Turso is not configured. Set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in .env.local (see plan Phase 0)."
  );
}

const client = createClient({ url, authToken });
export const db = drizzle(client, { schema });
