import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export function isAdminEmail(email) {
  if (!email) return false;
  const allowed = new Set((process.env.ADMIN_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
  return allowed.has(String(email).trim().toLowerCase());
}

// 共享的 admin API 校验，给新增的 /api/admin/users* 路由用。失败一律按现有 admin 路由的
// 约定返回 404（伪装成不存在，不暴露 admin 端点存在性），不是 403。
export async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user && isAdminEmail(session.user.email) ? session : null;
}
