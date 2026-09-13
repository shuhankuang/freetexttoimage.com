import { createHmac } from "node:crypto";
import { domainToASCII } from "node:url";

export function canonicalizeBonusEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) throw new Error("Invalid signup bonus email.");

  let local = email.slice(0, at);
  let domain = domainToASCII(email.slice(at + 1)).toLowerCase().replace(/\.+$/, "");
  if (!domain) throw new Error("Invalid signup bonus email domain.");

  if (domain === "googlemail.com") domain = "gmail.com";
  // +tag 是通用的子地址约定（Outlook/Yahoo/iCloud/自建域名邮箱都支持），不是 Gmail 独有；
  // 这里只影响防滥用哈希，真实收信地址不受影响，所以对所有域名都去掉。
  // 点号折叠只对 Gmail 做——只有 Gmail 把点号当无意义字符，其他域名点号是真实语义的一部分。
  local = local.split("+", 1)[0];
  if (domain === "gmail.com") {
    local = local.replaceAll(".", "");
  }
  if (!local) throw new Error("Invalid signup bonus email local part.");

  return `${local}@${domain}`;
}

export function hashBonusEmail(email, secret = process.env.SIGNUP_BONUS_SECRET) {
  if (!secret) throw new Error("SIGNUP_BONUS_SECRET is not configured.");
  // 保持已上线 claim 的散列格式稳定；修改前缀会使旧邮箱重新获得奖励。
  return createHmac("sha256", secret).update(canonicalizeBonusEmail(email)).digest("hex");
}

export function hashSignupIp(ipAddress, secret = process.env.SIGNUP_BONUS_SECRET) {
  if (!secret) throw new Error("SIGNUP_BONUS_SECRET is not configured.");
  const normalized = String(ipAddress || "").trim().toLowerCase();
  if (!normalized) return null;
  return createHmac("sha256", secret).update(`ip:${normalized}`).digest("hex");
}
