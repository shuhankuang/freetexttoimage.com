import Pricing from "@/components/pricing";
import { getDictionary } from "@/i18n/dictionaries";
import { buildPublicMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const messages = await getDictionary(locale);
  return buildPublicMetadata({
    locale,
    path: "/pricing",
    title: messages.pricing.metaTitle,
    description: messages.pricing.metaDescription,
  });
}

export default async function PricingPage({ params }) {
  const { locale } = await params;
  return <Pricing locale={locale} />;
}
