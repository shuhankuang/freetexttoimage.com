import { db } from "@/lib/db";

// creations 表服务端访问层。只被 route handler / server 代码 import。

const columns = "id, user_id, title, prompt, style, ratio, image, created_at AS createdAt";

export function listCreations(userId) {
  return db
    .prepare(
      `SELECT ${columns} FROM creations WHERE user_id = ? ORDER BY created_at DESC`
    )
    .all(userId);
}

export function getCreation(userId, id) {
  return db
    .prepare(`SELECT ${columns} FROM creations WHERE user_id = ? AND id = ?`)
    .get(userId, id);
}

export function createCreation(userId, { id, title, prompt, style, ratio, image, createdAt }) {
  db.prepare(
    `INSERT INTO creations (id, user_id, title, prompt, style, ratio, image, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, userId, title, prompt, style || null, ratio || null, image, createdAt);
  return getCreation(userId, id);
}

// 返回是否删除了记录（用于区分「不存在」与「非本人」）。
export function deleteCreationFor(userId, id) {
  const result = db
    .prepare(`DELETE FROM creations WHERE user_id = ? AND id = ?`)
    .run(userId, id);
  return result.changes > 0;
}
