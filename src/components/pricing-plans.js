"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Spinner } from "@heroui/react";
import { useI18n } from "@/i18n/provider";
import { authClient } from "@/lib/auth-client";
import { loginPathWithRedirect } from "@/lib/auth-redirect";
import { CheckIcon, CoinsIcon } from "@/components/ui";

const PLANS = [
  { id: "free", credits: 10, images: 5, tier: 0 },
  {
    id: "pro", credits: 400, images: 200, tier: 2, featured: true,
    month: { price: "$24", unit: "month" },
    year: { price: "$20", unit: "month", total: "$240" },
  },
  {
    id: "basic", credits: 120, images: 60, tier: 1,
    month: { price: "$9", unit: "month" },
    year: { price: "$7.50", unit: "month", total: "$90" },
  },
];

const PLAN_FEATURES = ["images", "models", "generation", "output", "support"];

export default function PricingPlans() {
  const router = useRouter();
  const { locale, path, t } = useI18n();
  const { data: session } = authClient.useSession();
  const [interval, setInterval] = useState("month");
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
      setPendingPlan(null);
      setPendingPortal(false);
    }

    window.addEventListener("pageshow", resetPendingAfterHistoryRestore);
    return () => window.removeEventListener("pageshow", resetPendingAfterHistoryRestore);
  }, []);

  function requireSignIn() {
    router.push(loginPathWithRedirect(path("/login"), path("/pricing")));
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
  const billingBusy = Boolean(pendingPlan || pendingPortal);

  function pendingButtonContent() {
    return <><Spinner size="sm" color="current" aria-label={t("pricing.processing")} />{t("pricing.processing")}</>;
  }

  function planAction(plan) {
    if (plan.id === "free") {
      if (session?.user && !activeSub) return <span className="plan-current-badge">{t("pricing.currentPlanBadge")}</span>;
      return <Link className="pricing-plan-link" href={session?.user ? path("/studio") : loginPathWithRedirect(path("/login"), path("/pricing"))}>{t("pricing.startFree")}</Link>;
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

  return <>
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
          {price?.total ? <p className="annual-equivalent">{t("pricing.billedYearly", { price: price.total })}</p> : <p className="annual-equivalent">{t(plan.id === "free" ? "pricing.noCard" : "pricing.billedMonthly")}</p>}
          <div className="plan-credit-summary"><CoinsIcon size={17} /><strong>{t(plan.id === "free" ? "pricing.signupCredits" : "pricing.monthlyCredits", { count: plan.credits })}</strong></div>
          <ul className="plan-details">
            {PLAN_FEATURES.map((feature) => <li key={feature}><CheckIcon size={15} />{t(`pricing.planFeatures.${plan.id}.${feature}`, { count: plan.images })}</li>)}
          </ul>
          <div className="plan-card-action">{planAction(plan)}</div>
        </Card.Content></Card>;
      })}</div>
    </section>
  </>;
}
