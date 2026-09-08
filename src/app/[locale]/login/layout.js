import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const messages = await getDictionary(locale);
  return {
    title: messages.meta.loginTitle,
    alternates: {
      canonical: locale === "en" ? "/login" : "/ja/login",
      languages: { en: "/login", ja: "/ja/login" },
    },
  };
}

export default function LoginLayout({ children }) {
  return children;
}
