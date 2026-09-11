import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";
import { buildPrivateMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const messages = await getDictionary(locale);
  return buildPrivateMetadata({
    title: messages.meta.loginTitle,
    description: messages.meta.loginDescription,
    follow: true,
  });
}

export default function LoginLayout({ children }) {
  return children;
}
