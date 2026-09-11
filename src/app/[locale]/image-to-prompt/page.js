import ImageToPrompt from "@/components/image-to-prompt";
import Hero from "@/components/blocks/hero";
import { getDictionary } from "@/i18n/dictionaries";
import { localePath } from "@/i18n/config";

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
  </main>;
}
