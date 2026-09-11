import ServerAppShell from "@/components/server-app-shell";
import { getDictionary } from "@/i18n/dictionaries";
import { buildPrivateMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const messages = await getDictionary(locale);
  return buildPrivateMetadata({ title: messages.creations.title, description: messages.creations.subtitle });
}

export default async function CreationsLayout({ children, params }) {
  const { locale } = await params;
  return <ServerAppShell locale={locale}>{children}</ServerAppShell>;
}
