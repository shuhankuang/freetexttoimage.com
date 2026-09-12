import "server-only";

export function isAdminEmail(email) {
  if (!email) return false;
  const allowed = new Set((process.env.ADMIN_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
  return allowed.has(String(email).trim().toLowerCase());
}
