import "server-only";

import Hero from "@/components/blocks/hero";

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(" ");
}

export default function CtaBlock({
  id = "cta",
  label,
  title,
  accent,
  description,
  descriptionSecond,
  action,
  href,
  note,
  className,
}) {
  return <section className={joinClassNames("cta-block", className)} aria-labelledby={`${id}-heading`}>
    <Hero
      headingId={`${id}-heading`}
      className="section-heading cta-block-heading"
      label={label}
      title={title}
      accent={accent}
      subtitle={<>{description}{descriptionSecond && <><br />{descriptionSecond}</>}</>}
    />
    <a href={href} className="cta-block-button">{action}<span aria-hidden="true">→</span></a>
    {note && <small>{note}</small>}
  </section>;
}
