import ServerAppShell from "@/components/server-app-shell";

export default async function PricingLayout({ children, params }) {
  const { locale } = await params;
  return <ServerAppShell activePath="/pricing" publicView locale={locale}>{children}</ServerAppShell>;
}
