"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { CloseIcon, GemIcon } from "@/components/ui";

const DISMISS_KEY = "freetexttoimage:promo-banner-dismissed-at";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000;
const PROMO_DISCOUNT_PERCENT = 30;

export default function PromoBanner() {
  const { t, path } = useI18n();
  const [visible, setVisible] = useState(false);

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
    <Link className="promo-banner-cta" href={path("/pricing")}>{t("shell.promoCta", { discount: PROMO_DISCOUNT_PERCENT })} <span>→</span></Link>
    <button type="button" className="promo-banner-close" onClick={dismiss} aria-label={t("shell.promoClose")}>
      <CloseIcon />
    </button>
  </div>;
}
