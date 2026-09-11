import AppShell from "@/components/app-shell";
import AppFooter from "@/components/app-footer";
import { getServerSession } from "@/lib/server-session";

export default async function ServerAppShell({ children, locale, ...props }) {
  const session = await getServerSession();
  const showMyCreations = Boolean(session?.user);

  return <AppShell {...props} showMyCreations={showMyCreations} footer={<AppFooter locale={locale} />}>{children}</AppShell>;
}
