"use client";

import { usePathname, useRouter } from "next/navigation";
import { Dropdown } from "@heroui/react";
import { LanguageIcon } from "@/components/ui";
import { useI18n } from "@/i18n/provider";

export default function LanguageSwitcher({ className = "" }) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, t } = useI18n();

  function switchLanguage(nextLocale) {
    if (nextLocale === locale) return;
    const withoutLocale = pathname.replace(/^\/(en|ja)(?=\/|$)/, "") || "/";
    const nextPath = nextLocale === "ja"
      ? `/ja${withoutLocale === "/" ? "" : withoutLocale}`
      : withoutLocale;
    router.push(`${nextPath}${window.location.search}${window.location.hash}`);
  }

  return (
    <Dropdown>
      <Dropdown.Trigger className={`language-trigger ${className}`.trim()} aria-label={t("language.label")}>
        <LanguageIcon />
        <span>{locale === "ja" ? "日本語" : "EN"}</span>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end" className="language-popover">
        <Dropdown.Menu
          aria-label={t("language.label")}
          selectionMode="single"
          selectedKeys={new Set([locale])}
          onAction={(key) => switchLanguage(String(key))}
        >
          <Dropdown.Item id="en" textValue={t("language.english")}>
            <span>{t("language.english")}</span><Dropdown.ItemIndicator />
          </Dropdown.Item>
          <Dropdown.Item id="ja" textValue={t("language.japanese")}>
            <span>{t("language.japanese")}</span><Dropdown.ItemIndicator />
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
