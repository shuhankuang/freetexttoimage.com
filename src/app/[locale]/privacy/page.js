import LegalPage from "@/components/legal-page";
import { getLegalContent } from "@/content/legal";
import { buildPublicMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const content = getLegalContent(locale, "privacy");
  return buildPublicMetadata({
    locale,
    path: "/privacy",
    title: content.title,
    description: content.description,
  });
}

export default async function PrivacyPage({ params }) {
  const { locale } = await params;
  return <LegalPage locale={locale} page="privacy" />;
}
