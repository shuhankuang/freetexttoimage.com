// 现有 signup_bonus 流水回填为邮箱身份 claim。
// 默认只预览；确认后加 --apply。正式环境同时传 --env=.env.production。

import { loadEnvFile } from "node:process";
import { createClient } from "@libsql/client";
import { hashBonusEmail } from "../src/lib/signup-bonus-identity.js";

const args = process.argv.slice(2);
const envFile = args.find((value) => value.startsWith("--env="))?.slice("--env=".length) || ".env.local";
const apply = args.includes("--apply");

try {
  loadEnvFile(envFile);
} catch {
  // Coolify 等环境直接注入变量时不需要 env 文件。
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error(`Set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in ${envFile}.`);
  if (!process.env.SIGNUP_BONUS_SECRET) throw new Error(`Set SIGNUP_BONUS_SECRET in ${envFile}.`);

  const client = createClient({ url, authToken });
  const result = await client.execute(`
    SELECT u.id, u.email, MIN(l.created_at) AS claimed_at
    FROM credit_ledger AS l
    INNER JOIN user AS u ON u.id = l.user_id
    WHERE l.reason = 'signup_bonus'
    GROUP BY u.id, u.email
    ORDER BY claimed_at ASC, u.id ASC
  `);

  const seenHashes = new Set();
  const claims = [];
  let canonicalDuplicates = 0;

  for (const row of result.rows) {
    const emailHash = hashBonusEmail(row.email);
    if (seenHashes.has(emailHash)) {
      canonicalDuplicates += 1;
      continue;
    }
    seenHashes.add(emailHash);
    claims.push({
      emailHash,
      userId: row.id,
      amount: 10,
      createdAt: row.claimed_at || new Date().toISOString(),
    });
  }

  console.log("注册奖励流水用户：", result.rows.length);
  console.log("可回填 claim：", claims.length);
  console.log("规范化后重复：", canonicalDuplicates);

  if (!apply) {
    console.log("预览完成；确认后追加 --apply 执行写入。");
    return;
  }

  let inserted = 0;
  let existing = 0;
  for (const claim of claims) {
    const write = await client.execute({
      sql: `INSERT OR IGNORE INTO signup_bonus_claims
        (email_hash, user_id, amount, created_at) VALUES (?, ?, ?, ?)`,
      args: [claim.emailHash, claim.userId, claim.amount, claim.createdAt],
    });
    if ((write.rowsAffected ?? 0) > 0) inserted += 1;
    else existing += 1;
  }

  console.log("✓ 回填完成，新增：", inserted, "；已存在或冲突：", existing);
}

main().catch((error) => {
  console.error("\n✗ 注册奖励回填失败：", error?.message || error);
  process.exit(1);
});
