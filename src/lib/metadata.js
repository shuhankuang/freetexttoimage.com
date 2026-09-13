import { localePath } from "@/i18n/config";
import { BRAND_NAME } from "@/lib/brand";

const SOCIAL_LOCALES = { en: "en_US", ja: "ja_JP" };
// public/og.png 的实际像素尺寸——声明的宽高要跟文件对上，别处平台按错误尺寸裁切预览图。
const OG_IMAGE = { url: "/og.png", width: 1200, height: 675, alt: BRAND_NAME };

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
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [OG_IMAGE.url],
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
