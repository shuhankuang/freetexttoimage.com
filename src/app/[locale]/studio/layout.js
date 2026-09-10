import ServerAppShell from "@/components/server-app-shell";

export default async function StudioLayout({ children, params }) {
  const { locale } = await params;
  return <ServerAppShell locale={locale}>{children}</ServerAppShell>;
}
