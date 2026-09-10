import ServerAppShell from "@/components/server-app-shell";

export default async function ImageToPromptLayout({ children, params }) {
  const { locale } = await params;
  return <ServerAppShell publicView locale={locale}>{children}</ServerAppShell>;
}
