import "../globals.css";
import { notFound } from "next/navigation";
import { I18nProvider } from "@/i18n/provider";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, locales } from "@/i18n/config";
import { BRAND_NAME } from "@/lib/brand";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const messages = await getDictionary(locale);
  return {
    metadataBase: new URL(process.env.APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000"),
    title: { default: messages.meta.title, template: `%s · ${BRAND_NAME}` },
    description: messages.meta.description,
  };
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = await getDictionary(locale);

  return (
    <html lang={locale}>
      <body><I18nProvider locale={locale} messages={messages}>{children}</I18nProvider></body>
    </html>
  );
}
