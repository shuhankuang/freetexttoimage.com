import Pricing from "@/components/pricing";

export default async function PricingPage({ params }) {
  const { locale } = await params;
  return <Pricing locale={locale} />;
}
