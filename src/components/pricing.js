import "server-only";

import FaqBlock from "@/components/blocks/faq";
import Hero from "@/components/blocks/hero";
import PricingPlans from "@/components/pricing-plans";
import PricingTopups from "@/components/pricing-topups";
import { getDictionary } from "@/i18n/dictionaries";

const FAQS = ["credits", "modelCost", "monthly", "permanent", "buyWithoutSubscription", "cancel", "yearly"];

export default async function Pricing({ locale }) {
  const messages = await getDictionary(locale);
  const copy = messages.pricing;
  const faqItems = FAQS.map((key) => copy.faq[key]);

  return <main className="workspace-page pricing-page">
    <Hero
      className="pricing-hero"
      headingLevel="h1"
      label={copy.section}
      title={copy.title}
      accent={copy.titleAccent}
      subtitle={copy.subtitle}
    />

    <PricingPlans />

    <section className="topup-section" aria-labelledby="topup-heading">
      <Hero
        headingId="topup-heading"
        className="section-heading topup-copy"
        label={copy.topupEyebrow}
        title={copy.onetimeSection}
        accent={copy.onetimeAccent}
        subtitle={copy.topupBody}
      />
      <PricingTopups />
    </section>

    <FaqBlock
      id="pricing-faq"
      className="pricing-faq"
      items={faqItems}
      label={copy.faqEyebrow}
      title={copy.faqTitle}
      accent={copy.faqTitleAccent}
      subtitle={copy.faqSubtitle}
    />
  </main>;
}
