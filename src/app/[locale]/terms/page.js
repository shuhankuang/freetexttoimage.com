import LegalPage from "@/components/legal-page";
import { getLegalContent } from "@/content/legal";
import { localePath } from "@/i18n/config";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const content = getLegalContent(locale, "terms");
  return {
    title: content.title,
    description: content.description,
    alternates: {
      canonical: localePath(locale, "/terms"),
      languages: { en: "/terms", ja: "/ja/terms" },
    },
  };
}

export default async function TermsPage({ params }) {
  const { locale } = await params;
  return <LegalPage locale={locale} page="terms" />;
}
