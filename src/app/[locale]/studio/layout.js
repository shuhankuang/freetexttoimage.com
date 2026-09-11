import ServerAppShell from "@/components/server-app-shell";
import { getDictionary } from "@/i18n/dictionaries";
import { buildPrivateMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const messages = await getDictionary(locale);
  return buildPrivateMetadata({
    title: messages.meta.studioTitle,
    description: messages.meta.studioDescription,
    follow: true,
  });
}

export default async function StudioLayout({ children, params }) {
  const { locale } = await params;
  return <ServerAppShell activePath="/studio" locale={locale}>{children}</ServerAppShell>;
}
