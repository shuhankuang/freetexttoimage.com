import { localePath } from "@/i18n/config";
import { BRAND_NAME } from "@/lib/brand";

const SOCIAL_LOCALES = { en: "en_US", ja: "ja_JP" };

export function buildPublicMetadata({ locale, path = "/", title, description, absoluteTitle = false }) {
  const canonical = localePath(locale, path);
  const english = localePath("en", path);
  const japanese = localePath("ja", path);
  const socialTitle = title.includes(BRAND_NAME) ? title : `${title} | ${BRAND_NAME}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical,
      languages: { en: english, ja: japanese, "x-default": english },
    },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: BRAND_NAME,
      locale: SOCIAL_LOCALES[locale] || SOCIAL_LOCALES.en,
      title: socialTitle,
      description,
    },
    twitter: {
      card: "summary",
      title: socialTitle,
      description,
    },
  };
}

export function buildPrivateMetadata({ title, description, follow = false }) {
  return {
    title,
    description,
    robots: { index: false, follow },
  };
}
