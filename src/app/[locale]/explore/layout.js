import ServerAppShell from "@/components/server-app-shell";

export default async function ExploreLayout({ children, params }) {
  const { locale } = await params;
  return <ServerAppShell activePath="/explore" publicView locale={locale}>{children}</ServerAppShell>;
}
