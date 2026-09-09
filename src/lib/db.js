import Database from "better-sqlite3";
import path from "node:path";

// 共享的 SQLite 连接。只能被服务端代码 import（better-sqlite3 是原生模块）。
export const db = new Database(
  process.env.FREETEXTTOIMAGE_DB_PATH || process.env.FORMA_DB_PATH || path.join(process.cwd(), "sqlite.db")
);

db.pragma("journal_mode = WAL");
