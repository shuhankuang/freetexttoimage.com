import { localePath, locales } from "@/i18n/config";

const SITE_URL = "https://freetexttoimage.com";
const PUBLIC_ROUTES = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/image-to-prompt", changeFrequency: "weekly", priority: 0.9 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.8 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
];

function absoluteUrl(locale, path) {
  return new URL(localePath(locale, path), SITE_URL).toString();
}

export default function sitemap() {
  return PUBLIC_ROUTES.flatMap((route) => {
    const languages = {
      en: absoluteUrl("en", route.path),
      ja: absoluteUrl("ja", route.path),
      "x-default": absoluteUrl("en", route.path),
    };

    return locales.map((locale) => ({
      url: absoluteUrl(locale, route.path),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: { languages },
    }));
  });
}
