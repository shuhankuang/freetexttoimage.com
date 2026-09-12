import AppShell from "@/components/app-shell";
import AppFooter from "@/components/app-footer";
import AppSidebar from "@/components/app-sidebar";
import { isAdminEmail } from "@/lib/admin-auth";
import { getServerSession } from "@/lib/server-session";

export default async function ServerAppShell({ activePath = "/", children, locale, ...props }) {
  const session = await getServerSession();
  const showMyCreations = Boolean(session?.user);
  const showAdmin = isAdminEmail(session?.user?.email);

  return <AppShell
    {...props}
    footer={<AppFooter locale={locale} />}
    showAdmin={showAdmin}
    sidebar={<AppSidebar activePath={activePath} locale={locale} showMyCreations={showMyCreations} />}
  >{children}</AppShell>;
}
