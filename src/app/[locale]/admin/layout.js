import { notFound, redirect } from "next/navigation";
import ServerAppShell from "@/components/server-app-shell";
import AdminNavTabs from "@/components/admin-nav-tabs";
import { localePath } from "@/i18n/config";
import { isAdminEmail } from "@/lib/admin-auth";
import { loginPathWithRedirect } from "@/lib/auth-redirect";
import { getServerSession } from "@/lib/server-session";

// 覆盖 /admin 下所有子路由的一次性权限校验，子页面（users、users/[id]、prompts）
// 不用再各自重复这段。admin/prompts/page.js 自己那份校验保留没删——多一层防御性校验，
// 对那个会触发实际写操作（手动跑同步、软删除）的页面没有坏处。
export default async function AdminLayout({ children, params }) {
  const { locale } = await params;
  const session = await getServerSession();
  const returnTo = localePath(locale, "/admin");
  if (!session?.user) redirect(loginPathWithRedirect(localePath(locale, "/login"), returnTo));
  if (!isAdminEmail(session.user.email)) notFound();

  return <ServerAppShell activePath="/admin" locale={locale} pageTitleOverride="Admin">
    <div className="admin-shell">
      <AdminNavTabs />
      {children}
    </div>
  </ServerAppShell>;
}
