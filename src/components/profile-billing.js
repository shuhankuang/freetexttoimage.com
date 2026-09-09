"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button, Card, Spinner } from "@heroui/react";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/i18n/provider";
import { ArrowIcon, CoinsIcon, ImageIcon, UserIcon } from "@/components/ui";

const PAGE_SIZE = 20;
const INACTIVE_SUBSCRIPTION_STATUSES = new Set(["canceled", "incomplete_expired"]);

export default function ProfileBilling() {
  const { locale, path, t } = useI18n();
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const [billing, setBilling] = useState(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingError, setBillingError] = useState(false);
  const [billingVersion, setBillingVersion] = useState(0);
  const [portalPending, setPortalPending] = useState(false);
  const [portalError, setPortalError] = useState("");
  const [usage, setUsage] = useState([]);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState(false);
  const [usageVersion, setUsageVersion] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch("/api/billing/status")
      .then(async (response) => {
        if (!response.ok) throw new Error("billing-load-failed");
        return response.json();
      })
      .then((data) => { if (!cancelled) setBilling(data); })
      .catch(() => { if (!cancelled) setBillingError(true); })
      .finally(() => { if (!cancelled) setBillingLoading(false); });
    return () => { cancelled = true; };
  }, [user, billingVersion]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch(`/api/account/usage?limit=${PAGE_SIZE}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("usage-load-failed");
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        setUsage(data.items);
        setNextCursor(data.nextCursor);
      })
      .catch(() => { if (!cancelled) setUsageError(true); })
      .finally(() => { if (!cancelled) setUsageLoading(false); });
    return () => { cancelled = true; };
  }, [user, usageVersion]);

  useEffect(() => {
    function restorePage() {
      setPortalPending(false);
      setBillingVersion((version) => version + 1);
    }
    window.addEventListener("pageshow", restorePage);
    return () => window.removeEventListener("pageshow", restorePage);
  }, []);

  function formatDate(value, includeTime = false) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", includeTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" }).format(date);
  }

  async function openBillingPortal() {
    setPortalPending(true);
    setPortalError("");
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.url) throw new Error(body.error || t("profile.errors.portal"));
      window.location.assign(body.url);
    } catch (error) {
      setPortalError(error?.message || t("profile.errors.portal"));
      setPortalPending(false);
    }
  }

  function retryBilling() {
    setBillingLoading(true);
    setBillingError(false);
    setBillingVersion((version) => version + 1);
  }

  function retryUsage() {
    setUsageLoading(true);
    setUsageError(false);
    setUsage([]);
    setNextCursor(null);
    setUsageVersion((version) => version + 1);
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setUsageError(false);
    try {
      const response = await fetch(`/api/account/usage?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(nextCursor)}`);
      if (!response.ok) throw new Error("usage-load-failed");
      const data = await response.json();
      setUsage((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...current, ...data.items.filter((item) => !known.has(item.id))];
      });
      setNextCursor(data.nextCursor);
    } catch {
      setUsageError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  const subscription = billing?.subscription;
  const hasPaidPlan = Boolean(subscription && !INACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status));
  const plan = hasPaidPlan ? subscription.plan : "free";
  const statusKey = !hasPaidPlan
    ? "free"
    : subscription.cancelAtPeriodEnd
      ? "canceling"
      : subscription.status === "active"
        ? "active"
        : subscription.status === "past_due"
          ? "pastDue"
          : "attention";

  function planDetail() {
    if (!hasPaidPlan) return t("profile.billing.freeBody");
    if (subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd) {
      return t("profile.billing.endsOn", { date: formatDate(subscription.currentPeriodEnd) });
    }
    if (subscription.status === "past_due") return t("profile.billing.paymentIssue");
    if (subscription.currentPeriodEnd) {
      return t("profile.billing.renewsOn", { date: formatDate(subscription.currentPeriodEnd) });
    }
    return t("profile.billing.activeBody");
  }

  function creditText(item) {
    return t(`profile.usage.creditStates.${item.creditState}`, { count: item.credits });
  }

  return <main className="workspace-page profile-page">
    <header className="page-title profile-title">
      <div><span className="section-label">{t("profile.section")}</span><h1>{t("profile.title")}</h1><p>{t("profile.subtitle")}</p></div>
    </header>

    <Card className="profile-overview-card"><Card.Content>
      <section className="profile-identity" aria-labelledby="profile-account-heading">
        <div className="profile-avatar" aria-hidden="true">
          {user?.image ? <Image src={user.image} alt="" width={54} height={54} unoptimized /> : <UserIcon size={23} />}
        </div>
        <div>
          <span className="profile-kicker" id="profile-account-heading">{t("profile.account.title")}</span>
          <strong>{user?.name || t("shell.workspaceFallback")}</strong>
          <span>{user?.email}</span>
          {formatDate(user?.createdAt) && <small>{t("profile.account.joined", { date: formatDate(user.createdAt) })}</small>}
        </div>
      </section>

      <section className="profile-plan" aria-labelledby="profile-plan-heading">
        {billingLoading ? <div className="profile-inline-loading"><Spinner size="sm" /><span>{t("profile.loadingBilling")}</span></div> : billingError ? <div className="profile-inline-error"><span>{t("profile.errors.billing")}</span><Button size="sm" variant="ghost" onPress={retryBilling}>{t("profile.retry")}</Button></div> : <>
          <div className="profile-plan-heading"><div><span className="profile-kicker" id="profile-plan-heading">{t("profile.billing.title")}</span><strong>{t(`pricing.plans.${plan}.label`)}{hasPaidPlan && <small> · {t(`pricing.intervals.${subscription.interval}`)}</small>}</strong></div><span className={`subscription-status ${statusKey}`}>{t(`profile.billing.status.${statusKey}`)}</span></div>
          <p>{planDetail()}</p>
          {subscription ? <Button className="profile-manage-button" variant="outline" isPending={portalPending} onPress={openBillingPortal}>{portalPending ? <><Spinner size="sm" color="current" />{t("pricing.processing")}</> : t("profile.billing.manage")}</Button> : <Link className="profile-action-link profile-primary-action" href={path("/pricing")}>{t("profile.billing.viewPlans")}<ArrowIcon /></Link>}
        </>}
      </section>
    </Card.Content></Card>

    {portalError && <p className="inline-error" role="alert">{portalError}</p>}

    <section className="profile-credits" aria-labelledby="profile-credits-heading">
      <div className="profile-section-heading"><div><span className="section-label">{t("profile.credits.section")}</span><h2 id="profile-credits-heading">{t("profile.credits.title")}</h2></div><Link className="profile-primary-action" href={`${path("/pricing")}#topup-heading`}>{t("profile.credits.add")}<ArrowIcon /></Link></div>
      {billingLoading ? <div className="profile-block-loading"><Spinner /><span>{t("profile.loadingCredits")}</span></div> : billingError ? <div className="profile-block-error"><p>{t("profile.errors.credits")}</p><Button variant="soft" onPress={retryBilling}>{t("profile.retry")}</Button></div> : <div className="credit-overview-grid">
        <article className="credit-overview-item total"><span>{t("profile.credits.total")}</span><strong><CoinsIcon size={20} />{billing.credits.total}</strong><small>{t("profile.credits.available")}</small></article>
        <article className="credit-overview-item"><span>{t("profile.credits.monthly")}</span><strong>{billing.credits.monthlyBalance}</strong><small>{billing.credits.monthlyResetAt ? t("profile.credits.refreshes", { date: formatDate(billing.credits.monthlyResetAt) }) : t("profile.credits.noMonthly")}</small></article>
        <article className="credit-overview-item"><span>{t("profile.credits.permanent")}</span><strong>{billing.credits.permanentBalance}</strong><small>{t("profile.credits.neverExpires")}</small></article>
      </div>}
    </section>

    <section className="profile-usage" aria-labelledby="profile-usage-heading">
      <div className="profile-section-heading"><div><span className="section-label">{t("profile.usage.section")}</span><h2 id="profile-usage-heading">{t("profile.usage.title")}</h2><p>{t("profile.usage.subtitle")}</p></div></div>

      {usageLoading ? <div className="profile-block-loading"><Spinner /><span>{t("profile.usage.loading")}</span></div> : usageError && usage.length === 0 ? <div className="profile-block-error"><p>{t("profile.usage.loadError")}</p><Button variant="soft" onPress={retryUsage}>{t("profile.retry")}</Button></div> : usage.length === 0 ? <div className="profile-usage-empty"><ImageIcon size={23} /><strong>{t("profile.usage.emptyTitle")}</strong><p>{t("profile.usage.emptyBody")}</p><Link className="profile-action-link" href={path("/studio")}>{t("profile.usage.create")}<ArrowIcon /></Link></div> : <>
        <div className="usage-list" role="list" aria-label={t("profile.usage.listLabel")}>
          {usage.map((item) => <article className="usage-row" role="listitem" key={item.id}>
            <span className="usage-icon" aria-hidden="true"><ImageIcon size={17} /></span>
            <div className="usage-main"><strong>{item.model || t("profile.usage.unknownModel")}</strong><span>{formatDate(item.createdAt, true)}</span></div>
            <span className={`usage-status ${item.status}`}>{t(`profile.usage.status.${item.status}`)}</span>
            <strong className={`usage-credit ${item.creditState}`}>{creditText(item)}</strong>
          </article>)}
        </div>
        {usageError && <div className="usage-more-error" role="alert"><span>{t("profile.usage.moreError")}</span><Button size="sm" variant="ghost" onPress={nextCursor ? loadMore : retryUsage}>{t("profile.retry")}</Button></div>}
        {nextCursor && !usageError && <div className="profile-load-more"><Button variant="soft" isPending={loadingMore} onPress={loadMore}>{loadingMore ? <><Spinner size="sm" color="current" />{t("profile.usage.loadingMore")}</> : t("profile.usage.loadMore")}</Button></div>}
      </>}
    </section>
  </main>;
}
