"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Accordion, Button, Card, Spinner } from "@heroui/react";
import { useI18n } from "@/i18n/provider";
import { authClient } from "@/lib/auth-client";
import { CheckIcon, CoinsIcon } from "@/components/ui";

const PACKS = [
  { id: "credits_40", price: "$5", credits: 40 },
  { id: "credits_140", price: "$15", credits: 140 },
  { id: "credits_320", price: "$30", credits: 320, best: true },
];

const PLANS = [
  { id: "free", credits: 10, zImages: 10, wanImages: 2, tier: 0 },
  {
    id: "pro", credits: 350, zImages: 350, wanImages: 87, tier: 2, featured: true,
    month: { price: "$24", unit: "month" },
    year: { price: "$240", unit: "year", equivalent: "$20" },
  },
  {
    id: "basic", credits: 100, zImages: 100, wanImages: 25, tier: 1,
    month: { price: "$9", unit: "month" },
    year: { price: "$90", unit: "year", equivalent: "$7.50" },
  },
];

const BENEFITS = ["models", "successOnly", "downloads", "history"];
const FAQS = ["cost", "failure", "monthly", "yearly", "permanent", "cancel", "change"];

export default function Pricing() {
  const router = useRouter();
  const { locale, path, t } = useI18n();
  const { data: session } = authClient.useSession();
  const [interval, setInterval] = useState("month");
  const [pendingPack, setPendingPack] = useState(null);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [pendingPortal, setPendingPortal] = useState(false);
  const [error, setError] = useState("");
  const [scheduledChange, setScheduledChange] = useState(null);
  const [status, setStatus] = useState(null);
  const [checkoutState] = useState(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("checkout")
  );

  function refreshStatus() {
    if (!session?.user) return;
    fetch("/api/billing/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setStatus(data); })
      .catch(() => {});
  }

  useEffect(() => { refreshStatus(); }, [session?.user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (checkoutState !== "success") return;
    const timers = [500, 2000, 4000, 8000].map((delay) =>
      setTimeout(() => {
        window.dispatchEvent(new Event("credits:refresh"));
        refreshStatus();
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutState]);

  useEffect(() => {
    function resetPendingAfterHistoryRestore() {
      setPendingPack(null);
      setPendingPlan(null);
      setPendingPortal(false);
    }

    window.addEventListener("pageshow", resetPendingAfterHistoryRestore);
    return () => window.removeEventListener("pageshow", resetPendingAfterHistoryRestore);
  }, []);

  function requireSignIn() {
    router.push(`${path("/login")}?redirect=${encodeURIComponent(path("/pricing"))}`);
  }

  async function buyPack(packId) {
    setError("");
    if (!session?.user) return requireSignIn();
    setPendingPack(packId);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: packId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.url) throw new Error(body.error || t("pricing.errors.checkout"));
      window.location.assign(body.url);
    } catch (err) {
      setError(err?.message || t("pricing.errors.checkout"));
      setPendingPack(null);
    }
  }

  async function subscribe(planId) {
    setError("");
    if (!session?.user) return requireSignIn();
    setPendingPlan(planId);
    let leavingPage = false;
    try {
      const response = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, interval, locale }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || t("pricing.errors.subscribe"));
      if (body.url) {
        window.location.assign(body.url);
        leavingPage = true;
        return;
      }
      if (body.scheduled) {
        setScheduledChange(formatDate(body.effectiveAt));
        return;
      }
      window.dispatchEvent(new Event("credits:refresh"));
      refreshStatus();
    } catch (err) {
      setError(err?.message || t("pricing.errors.subscribe"));
    } finally {
      if (!leavingPage) setPendingPlan(null);
    }
  }

  async function manageBilling() {
    setError("");
    if (!session?.user) return requireSignIn();
    setPendingPortal(true);
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.url) throw new Error(body.error || t("pricing.errors.portal"));
      window.location.assign(body.url);
    } catch (err) {
      setError(err?.message || t("pricing.errors.portal"));
      setPendingPortal(false);
    }
  }

  function formatDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  }

  const activeSub = status?.subscription?.status === "active" ? status.subscription : null;
  const activeTier = activeSub ? PLANS.find((plan) => plan.id === activeSub.plan)?.tier ?? 0 : 0;
  const billingBusy = Boolean(pendingPlan || pendingPack || pendingPortal);

  function pendingButtonContent() {
    return <><Spinner size="sm" color="current" aria-label={t("pricing.processing")} />{t("pricing.processing")}</>;
  }

  function planAction(plan) {
    if (plan.id === "free") {
      if (session?.user && !activeSub) return <span className="plan-current-badge">{t("pricing.currentPlanBadge")}</span>;
      return <Link className="pricing-plan-link" href={session?.user ? path("/studio") : path("/login")}>{t("pricing.startFree")}</Link>;
    }
    if (activeSub && plan.id === activeSub.plan && interval === activeSub.interval) {
      return <span className="plan-current-badge">{t("pricing.currentPlanBadge")}</span>;
    }

    const schedulesChange = activeSub && (interval !== activeSub.interval || plan.tier < activeTier);
    return <Button
      className={plan.featured && !schedulesChange ? "primary-button" : "pricing-plan-button"}
      fullWidth
      variant={plan.featured && !schedulesChange ? undefined : "outline"}
      isPending={pendingPlan === plan.id}
      isDisabled={billingBusy && pendingPlan !== plan.id}
      onPress={() => subscribe(plan.id)}
    >
      {pendingPlan === plan.id
        ? pendingButtonContent()
        : schedulesChange
        ? t("pricing.scheduleNamedPlan", { plan: t(`pricing.plans.${plan.id}.label`) })
        : activeSub
          ? t("pricing.upgradeTo", { plan: t(`pricing.plans.${plan.id}.label`) })
          : t("pricing.chooseNamedPlan", { plan: t(`pricing.plans.${plan.id}.label`) })}
    </Button>;
  }

  return <main className="workspace-page pricing-page">
    <header className="pricing-hero">
      <span className="section-label">{t("pricing.section")}</span>
      <h1>{t("pricing.title")}</h1>
      <p>{t("pricing.subtitle")}</p>
    </header>

    {checkoutState === "success" && <p className="pricing-banner pricing-banner-success" role="status">{t("pricing.checkoutSuccess")}</p>}
    {checkoutState === "cancelled" && <p className="pricing-banner" role="status">{t("pricing.checkoutCancelled")}</p>}
    {scheduledChange && <p className="pricing-banner pricing-banner-success" role="status">{t("pricing.changeScheduled", { date: scheduledChange })}</p>}
    {error && <p className="inline-error" role="alert">{error}</p>}

    {activeSub && <Card className="current-plan-card"><Card.Content>
      <div className="current-plan-info">
        <span className="section-label">{t("pricing.currentPlanTitle")}</span>
        <strong>{t(`pricing.plans.${activeSub.plan}.label`)} · {t(`pricing.intervals.${activeSub.interval}`)}</strong>
        <span className="current-plan-credits"><CoinsIcon size={15} />{t("pricing.creditsRemaining", { count: status.credits.total })}</span>
        <span className="current-plan-renew">{activeSub.cancelAtPeriodEnd ? t("pricing.cancelsOn", { date: formatDate(activeSub.currentPeriodEnd) }) : t("pricing.nextCreditReset", { date: formatDate(status.credits.monthlyResetAt) })}</span>
      </div>
      <Button variant="outline" isPending={pendingPortal} isDisabled={billingBusy && !pendingPortal} onPress={manageBilling}>
        {pendingPortal ? pendingButtonContent() : t("pricing.manageSubscription")}
      </Button>
    </Card.Content></Card>}

    <section className="pricing-plans-section" aria-label={t("pricing.subscriptionSection")}>
      <div className="pricing-section-heading">
        <div className="billing-toggle" role="tablist" aria-label={t("pricing.billingPeriod")}>
          <button type="button" role="tab" aria-selected={interval === "month"} disabled={billingBusy} onClick={() => setInterval("month")}>{t("pricing.monthly")}</button>
          <button type="button" role="tab" aria-selected={interval === "year"} disabled={billingBusy} onClick={() => setInterval("year")}>{t("pricing.yearly")}<em>{t("pricing.twoMonthsFree")}</em></button>
        </div>
      </div>

      <div className="pricing-plan-grid">{PLANS.map((plan) => {
        const price = plan.id === "free" ? null : plan[interval];
        return <Card key={plan.id} className={`pricing-plan-card${plan.featured ? " featured" : ""}`}><Card.Content>
          {plan.featured && <span className="popular-badge">{t("pricing.popular")}</span>}
          <div className="plan-card-heading"><strong>{t(`pricing.plans.${plan.id}.label`)}</strong><p>{t(`pricing.plans.${plan.id}.audience`)}</p></div>
          <div className="plan-price"><span>{price?.price || "$0"}</span>{price && <small>{t(`pricing.priceUnits.${price.unit}`)}</small>}</div>
          {price?.equivalent ? <p className="annual-equivalent">{t("pricing.equivalent", { price: price.equivalent })}</p> : <p className="annual-equivalent">{t(plan.id === "free" ? "pricing.noCard" : "pricing.billedMonthly")}</p>}
          <div className="plan-credit-summary"><CoinsIcon size={17} /><strong>{t(plan.id === "free" ? "pricing.signupCredits" : "pricing.monthlyCredits", { count: plan.credits })}</strong></div>
          <ul className="plan-details">
            <li><CheckIcon size={15} />{t("pricing.zEstimate", { count: plan.zImages })}</li>
            <li><CheckIcon size={15} />{t("pricing.wanEstimate", { count: plan.wanImages })}</li>
            <li><CheckIcon size={15} />{t(plan.id === "free" ? "pricing.permanentCreditNote" : "pricing.monthlyResetNote")}</li>
          </ul>
          {plan.featured && <p className="plan-value-note">{t("pricing.proValue")}</p>}
          <div className="plan-card-action">{planAction(plan)}</div>
        </Card.Content></Card>;
      })}</div>
    </section>

    <section className="pricing-benefits" aria-label={t("pricing.includedTitle")}>{BENEFITS.map((key) => <div key={key}><span><CheckIcon size={15} /></span><div><strong>{t(`pricing.benefits.${key}.title`)}</strong><p>{t(`pricing.benefits.${key}.body`)}</p></div></div>)}</section>

    <section className="topup-section" aria-labelledby="topup-heading">
      <div className="topup-copy"><span className="section-label">{t("pricing.topupEyebrow")}</span><h2 id="topup-heading">{t("pricing.onetimeSection")}</h2><p>{t("pricing.topupBody")}</p></div>
      <div className="topup-grid">{PACKS.map((pack) => <Card key={pack.id} className={`topup-card${pack.best ? " best" : ""}`}><Card.Content>
        {pack.best && <span className="topup-best">{t("pricing.bestValue")}</span>}
        <span className="topup-price">{pack.price}</span><strong><CoinsIcon size={16} />{t("pricing.packCredits", { count: pack.credits })}</strong>
        <Button className={pack.best ? "primary-button" : "topup-button"} variant={pack.best ? undefined : "secondary"} fullWidth isPending={pendingPack === pack.id} isDisabled={billingBusy && pendingPack !== pack.id} onPress={() => buyPack(pack.id)}>
          {pendingPack === pack.id ? pendingButtonContent() : t("pricing.buyCredits", { count: pack.credits })}
        </Button>
      </Card.Content></Card>)}</div>
    </section>

    <section className="pricing-faq" aria-labelledby="faq-heading">
      <div className="pricing-faq-heading"><span className="section-label">{t("pricing.faqEyebrow")}</span><h2 id="faq-heading">{t("pricing.faqTitle")}</h2><p>{t("pricing.faqSubtitle")}</p></div>
      <Accordion className="pricing-accordion" variant="surface">{FAQS.map((key) => <Accordion.Item key={key} id={key}>
        <Accordion.Heading><Accordion.Trigger>{t(`pricing.faq.${key}.question`)}<Accordion.Indicator /></Accordion.Trigger></Accordion.Heading>
        <Accordion.Panel><Accordion.Body>{t(`pricing.faq.${key}.answer`)}</Accordion.Body></Accordion.Panel>
      </Accordion.Item>)}</Accordion>
    </section>
  </main>;
}
