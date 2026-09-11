import "server-only";

import Hero from "@/components/blocks/hero";
import PricingPlans from "@/components/pricing-plans";
import PricingTopups from "@/components/pricing-topups";
import { CheckIcon } from "@/components/ui";
import { getDictionary } from "@/i18n/dictionaries";

const BENEFITS = ["models", "successOnly", "downloads", "history"];
const FAQS = ["credits", "modelCost", "monthly", "permanent", "buyWithoutSubscription", "cancel", "yearly"];

export default async function Pricing({ locale }) {
  const messages = await getDictionary(locale);
  const copy = messages.pricing;
  const faqItems = FAQS.map((key) => copy.faq[key]);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

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

    <section className="pricing-benefits" aria-label={copy.includedTitle}>
      {BENEFITS.map((key) => <div key={key}>
        <span><CheckIcon size={15} /></span>
        <div><strong>{copy.benefits[key].title}</strong><p>{copy.benefits[key].body}</p></div>
      </div>)}
    </section>

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

    <section className="pricing-faq" aria-labelledby="faq-heading">
      <Hero
        headingId="faq-heading"
        className="section-heading pricing-faq-heading"
        label={copy.faqEyebrow}
        title={copy.faqTitle}
        accent={copy.faqTitleAccent}
        subtitle={copy.faqSubtitle}
      />
      <div className="home-faq-list">
        {faqItems.map((item, index) => <details className="home-faq-item" key={item.question}>
          <summary>
            <span className="home-faq-index ml-2" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span className="home-faq-question">{item.question}</span>
            <span className="home-faq-toggle" aria-hidden="true" />
          </summary>
          <p>{item.answer}</p>
        </details>)}
      </div>
    </section>

    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }} />
  </main>;
}
