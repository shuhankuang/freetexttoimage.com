import ServerAppShell from "@/components/server-app-shell";

export default async function PromptAdminLayout({ children, params }) {
  const { locale } = await params;
  return <ServerAppShell activePath="/admin/prompts" locale={locale}>{children}</ServerAppShell>;
}
