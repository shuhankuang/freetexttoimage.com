import AppShell from "@/components/app-shell";
import AppFooter from "@/components/app-footer";
import AppSidebar from "@/components/app-sidebar";
import { getServerSession } from "@/lib/server-session";

export default async function ServerAppShell({ activePath = "/", children, locale, ...props }) {
  const session = await getServerSession();
  const showMyCreations = Boolean(session?.user);

  return <AppShell
    {...props}
    footer={<AppFooter locale={locale} />}
    sidebar={<AppSidebar activePath={activePath} locale={locale} showMyCreations={showMyCreations} />}
  >{children}</AppShell>;
}
