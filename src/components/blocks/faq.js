import "server-only";

import Hero from "@/components/blocks/hero";

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(" ");
}

export default function FaqBlock({
  id = "faq",
  items,
  label,
  title,
  accent,
  subtitle,
  className,
  headingClassName,
}) {
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
    <section className={joinClassNames("faq-block", className)} aria-labelledby={`${id}-heading`}>
      <Hero
        headingId={`${id}-heading`}
        className={joinClassNames("section-heading", "faq-block-heading", headingClassName)}
        label={label}
        title={title}
        accent={accent}
        subtitle={subtitle}
      />
      <div className="faq-block-list">
        {items.map((item, index) => <details className="faq-block-item" key={item.question}>
          <summary>
            <span className="faq-block-index ml-2" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span className="faq-block-question">{item.question}</span>
            <span className="faq-block-toggle" aria-hidden="true" />
          </summary>
          <p>{item.answer}</p>
        </details>)}
      </div>
    </section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }} />
  </>;
}
