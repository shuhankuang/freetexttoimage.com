"use client";

import { createContext, useContext, useMemo } from "react";
import { localePath } from "@/i18n/config";

const I18nContext = createContext(null);

function read(messages, key) {
  return key.split(".").reduce((value, part) => value?.[part], messages);
}

export function I18nProvider({ locale, messages, children }) {
  const value = useMemo(() => ({
    locale,
    messages,
    path: (pathname = "/") => localePath(locale, pathname),
    t(key, variables = {}) {
      const message = read(messages, key);
      if (typeof message !== "string") return key;
      return message.replace(/\{(\w+)\}/g, (_, name) => variables[name] ?? `{${name}}`);
    },
  }), [locale, messages]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}

