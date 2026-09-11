import "server-only";
import FaqBlock from "@/components/blocks/faq";
import { getDictionary } from "@/i18n/dictionaries";

const FAQ_KEYS = ["what", "how", "free", "models", "reference", "prompt"];

export default async function HomeFaq({ locale }) {
  const messages = await getDictionary(locale);
  const copy = messages.homeFaq;
  const items = FAQ_KEYS.map((key) => copy.items[key]);

  return <FaqBlock
    id="home-faq"
    className="home-faq"
    items={items}
    label={copy.section}
    title={copy.title}
    accent={copy.titleAccent}
    subtitle={copy.subtitle}
  />;
}
