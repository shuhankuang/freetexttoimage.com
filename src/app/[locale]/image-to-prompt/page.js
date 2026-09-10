import ImageToPrompt from "@/components/image-to-prompt";
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

export default function ImageToPromptPage() {
  return <ImageToPrompt />;
}
