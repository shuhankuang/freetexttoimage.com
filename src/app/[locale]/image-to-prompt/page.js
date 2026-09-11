import Link from "next/link";
import CtaBlock from "@/components/blocks/cta";
import FaqBlock from "@/components/blocks/faq";
import ImageToPrompt from "@/components/image-to-prompt";
import ImagePromptExamples from "@/components/image-prompt-examples";
import Hero from "@/components/blocks/hero";
import Steps from "@/components/blocks/steps";
import { getDictionary } from "@/i18n/dictionaries";
import { localePath } from "@/i18n/config";

const GUIDE_STEP_KEYS = ["upload", "analyze", "create"];
const FAQ_KEYS = ["what", "how", "types", "create", "accuracy", "free"];

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const messages = await getDictionary(locale);
  return {
    title: messages.imageToPrompt.metaTitle,
    description: messages.imageToPrompt.metaDescription,
    alternates: {
      canonical: localePath(locale, "/image-to-prompt"),
      languages: { en: "/image-to-prompt", ja: "/ja/image-to-prompt" },
    },
  };
}

export default async function ImageToPromptPage({ params }) {
  const { locale } = await params;
  const messages = await getDictionary(locale);
  const copy = messages.imageToPrompt;

  return <main className="workspace-page image-prompt-page">
    <Hero
      headingLevel="h1"
      className="image-prompt-hero"
      label={copy.section}
      title={copy.title}
      accent={copy.titleAccent}
      subtitle={copy.subtitle}
    />
    <ImageToPrompt />
    <p className="image-prompt-note">{copy.note} <Link href={localePath(locale, "/privacy")}>{copy.privacy}</Link></p>
    <Steps
      label={copy.guideLabel}
      steps={GUIDE_STEP_KEYS.map((key) => ({
        title: copy.guide[`${key}Title`],
        body: copy.guide[`${key}Body`],
      }))}
    />
    <ImagePromptExamples copy={copy.examples} />
    <FaqBlock
      id="image-prompt-faq"
      className="image-prompt-faq"
      items={FAQ_KEYS.map((key) => copy.faq.items[key])}
      label={copy.faq.section}
      title={copy.faq.title}
      accent={copy.faq.titleAccent}
      subtitle={copy.faq.subtitle}
    />
    <CtaBlock
      id="image-prompt-cta"
      className="image-prompt-cta"
      label={copy.cta.section}
      title={copy.cta.title}
      accent={copy.cta.titleAccent}
      description={copy.cta.description}
      descriptionSecond={copy.cta.descriptionSecond}
      action={copy.cta.action}
      href="#image-prompt-generator"
      note={copy.cta.note}
    />
  </main>;
}
