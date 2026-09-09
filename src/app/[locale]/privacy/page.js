import LegalPage from "@/components/legal-page";
import { getLegalContent } from "@/content/legal";
import { localePath } from "@/i18n/config";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const content = getLegalContent(locale, "privacy");
  return {
    title: content.title,
    description: content.description,
    alternates: {
      canonical: localePath(locale, "/privacy"),
      languages: { en: "/privacy", ja: "/ja/privacy" },
    },
  };
}

export default async function PrivacyPage({ params }) {
  const { locale } = await params;
  return <LegalPage locale={locale} page="privacy" />;
}
