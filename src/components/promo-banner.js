"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Tooltip } from "@heroui/react";
import { useI18n } from "@/i18n/provider";
import { CheckIcon, CloseIcon, CopyIcon, GemIcon } from "@/components/ui";

const DISMISS_KEY = "freetexttoimage:promo-banner-dismissed-at";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000;
const PROMO_DISCOUNT_PERCENT = 30;
const PROMO_CODE = "SAVE30";

// 剪贴板：优先 navigator.clipboard（localhost/https 可用），失败退回 execCommand。
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      el.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export default function PromoBanner() {
  const { t, path } = useI18n();
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (await copyText(PROMO_CODE)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  useEffect(() => {
    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem(DISMISS_KEY)) || 0;
    } catch {}
    if (Date.now() - dismissedAt >= DISMISS_DURATION_MS) setVisible(true);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }

  if (!visible) return null;

  return <div className="promo-banner" role="note">
    <span className="promo-banner-icon"><GemIcon size={16} /></span>
    <span className="promo-banner-message">{t("shell.promoMessage", { discount: PROMO_DISCOUNT_PERCENT })}</span>
    <Tooltip delay={150}>
      <Tooltip.Trigger>
        <button type="button" className="promo-banner-code" onClick={copyCode} aria-label={t("shell.promoCodeCopy", { code: PROMO_CODE })}>
          {t("shell.promoCodeLabel")}: <strong>{PROMO_CODE}</strong>
          {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content showArrow>{copied ? t("shell.promoCodeCopied", { discount: PROMO_DISCOUNT_PERCENT }) : t("shell.promoCodeHint")}</Tooltip.Content>
    </Tooltip>
    <Link className="promo-banner-cta" href={path("/pricing")}>{t("shell.promoCta", { discount: PROMO_DISCOUNT_PERCENT })} <span>→</span></Link>
    <button type="button" className="promo-banner-close" onClick={dismiss} aria-label={t("shell.promoClose")}>
      <CloseIcon />
    </button>
  </div>;
}
