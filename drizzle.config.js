import { loadEnvFile } from "node:process";
import { defineConfig } from "drizzle-kit";

try {
  loadEnvFile(".env.local");
} catch {
  // 生产环境走真实环境变量，没有 .env.local 文件是正常情况。
}

export default defineConfig({
  schema: "./src/lib/schema.js",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
