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
  if (domain === "gmail.com") {
    local = local.split("+", 1)[0].replaceAll(".", "");
  }
  if (!local) throw new Error("Invalid signup bonus email local part.");

  return `${local}@${domain}`;
}

export function hashBonusEmail(email, secret = process.env.SIGNUP_BONUS_SECRET) {
  if (!secret) throw new Error("SIGNUP_BONUS_SECRET is not configured.");
  return createHmac("sha256", secret).update(canonicalizeBonusEmail(email)).digest("hex");
}
