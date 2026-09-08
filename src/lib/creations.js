import { db } from "@/lib/db";
import { listProviders } from "@/lib/models";

// creations 表服务端访问层。只被 route handler / server 代码 import。

// 返回给客户端/内部用的常规列。
// image_key 是私有桶 object key，不暴露给客户端，代理路由单独取。
const columns = "id, user_id, title, prompt, style, ratio, image, status, model, created_at AS createdAt";

// 作品行里的 model 存的是 provider id（如 "z-image"）。
// 客户端要展示的是人类可读的标签（如 "Z-Image"），这里在服务端一次性装饰好，
// 标签的单一来源仍是模型注册表（src/lib/models）——改配置不用迁库。
const MODEL_LABELS = new Map(listProviders().map((p) => [p.id, p.label]));
const decorate = (row) => (row ? { ...row, model: MODEL_LABELS.get(row.model) || row.model || null } : row);

export function listCreations(userId) {
  return db
    .prepare(`SELECT ${columns} FROM creations WHERE user_id = ? ORDER BY created_at DESC`)
    .all(userId)
    .map(decorate);
}

export function getCreation(userId, id) {
  return decorate(
    db
      .prepare(`SELECT ${columns} FROM creations WHERE user_id = ? AND id = ?`)
      .get(userId, id)
  );
}

// 完整行（含 image_key）——仅供图片代理等需要私有 object key 的服务端路径用。
export function getCreationRecord(userId, id) {
  return db
    .prepare(`SELECT * FROM creations WHERE user_id = ? AND id = ?`)
    .get(userId, id);
}

// 生成成功：写入 S3 key + 对外代理 URL，并把 creation 推进到 succeeded。
export function updateCreationSucceeded(userId, id, { image, imageKey }) {
  db.prepare(
    `UPDATE creations
     SET image = ?, image_key = ?, status = 'succeeded'
     WHERE user_id = ? AND id = ? AND status = 'processing'`
  ).run(image, imageKey, userId, id);
}

export function updateCreationStatus(userId, id, status) {
  db.prepare(
    `UPDATE creations SET status = ? WHERE user_id = ? AND id = ? AND status = 'processing'`
  ).run(status, userId, id);
}

// 返回是否删除了记录（用于区分「不存在」与「非本人」）。
export function deleteCreationFor(userId, id) {
  const result = db.prepare(`DELETE FROM creations WHERE user_id = ? AND id = ?`).run(userId, id);
  return result.changes > 0;
}
