import "server-only";
import Hero from "@/components/blocks/hero";
import { getDictionary } from "@/i18n/dictionaries";

export default async function HomeCta({ locale }) {
  const messages = await getDictionary(locale);
  const copy = messages.homeCta;

  return <section className="home-cta" aria-labelledby="home-cta-title">
    <Hero
      headingId="home-cta-title"
      className="section-heading home-cta-heading"
      label={copy.section}
      title={copy.title}
      accent={copy.titleAccent}
      subtitle={<>{copy.description}<br />{copy.descriptionSecond}</>}
    />
    <a href="#image-generator" className="home-cta-button">{copy.action}<span aria-hidden="true">→</span></a>
    <small>{copy.note}</small>
  </section>;
}
