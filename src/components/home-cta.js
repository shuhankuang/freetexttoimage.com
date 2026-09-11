import "server-only";
import CtaBlock from "@/components/blocks/cta";
import { getDictionary } from "@/i18n/dictionaries";

export default async function HomeCta({ locale }) {
  const messages = await getDictionary(locale);
  const copy = messages.homeCta;

  return <CtaBlock
    id="home-cta"
    className="home-cta"
    label={copy.section}
    title={copy.title}
    accent={copy.titleAccent}
    description={copy.description}
    descriptionSecond={copy.descriptionSecond}
    action={copy.action}
    href="#image-generator"
    note={copy.note}
  />;
}
