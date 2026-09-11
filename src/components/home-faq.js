import "server-only";
import Hero from "@/components/blocks/hero";
import { getDictionary } from "@/i18n/dictionaries";

const FAQ_KEYS = ["what", "how", "free", "models", "reference", "prompt"];

export default async function HomeFaq({ locale }) {
  const messages = await getDictionary(locale);
  const copy = messages.homeFaq;
  const items = FAQ_KEYS.map((key) => copy.items[key]);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return <>
    <section className="home-faq" aria-labelledby="home-faq-title">
      <Hero headingId="home-faq-title" className="section-heading home-faq-heading" label={copy.section} title={copy.title} accent={copy.titleAccent} subtitle={copy.subtitle} />
      <div className="home-faq-list">
        {items.map((item, index) => <details className="home-faq-item" key={item.question}>
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
  </>;
}
