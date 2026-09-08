import "server-only";

const dictionaries = {
  en: () => import("./en").then((module) => module.default),
  ja: () => import("./ja").then((module) => module.default),
};

export function getDictionary(locale) {
  return dictionaries[locale]();
}

