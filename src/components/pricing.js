"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@heroui/react";
import { useI18n } from "@/i18n/provider";
import { authClient } from "@/lib/auth-client";
import { CoinsIcon } from "@/components/ui";

// 展示用配置——真正扣多少钱、发多少积分一律服务端决定（一次性包见 billing.js CREDIT_PACKS，
// 订阅见 SUBSCRIPTION_PLANS）。这里改了如果服务端没同步改，只是文案对不上，不会多发/少发。
const PACKS = [
  { id: "credits_40", price: "$5", credits: 40 },
  { id: "credits_140", price: "$15", credits: 140 },
  { id: "credits_320", price: "$30", credits: 320 },
];

const PLANS = [
  { id: "basic", price: "$9", credits: 100, tier: 1 },
  { id: "pro", price: "$24", credits: 350, tier: 2 },
];

export default function Pricing() {
  const router = useRouter();
  const { locale, path, t } = useI18n();
  const { data: session } = authClient.useSession();
  const [pendingPack, setPendingPack] = useState(null);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [pendingPortal, setPendingPortal] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(null); // { subscription, credits } | null，未登录时留 null
  // 懒初始化直接读，不在 effect 里 setState——用 window.location，不用 useSearchParams，
  // 跟登录页一致，省一个 Suspense 边界；SSR 阶段没有 window，兜底 null。
  const [checkoutState] = useState(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("checkout")
  ); // "success" | "cancelled" | null

  function refreshStatus() {
    if (!session?.user) return;
    fetch("/api/billing/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setStatus(data); })
      .catch(() => {});
  }

  useEffect(() => { refreshStatus(); }, [session?.user]); // eslint-disable-line react-hooks/exhaustive-deps

  // 付款成功回跳：真正发积分/开通订阅靠 webhook，这里只负责让页面尽快看到新状态，不直接当成"已到账"。
  useEffect(() => {
    if (checkoutState !== "success") return;
    const ticks = [500, 2000, 4000, 8000];
    const timers = ticks.map((delay) =>
      setTimeout(() => { window.dispatchEvent(new Event("credits:refresh")); refreshStatus(); }, delay)
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutState]);

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
      window.location.assign(body.url); // 跳外部 Stripe 域名，next/link 处理不了跨域导航
    } catch (err) {
      setError(err?.message || t("pricing.errors.checkout"));
      setPendingPack(null);
    }
  }

  async function subscribe(planId) {
    setError("");
    if (!session?.user) return requireSignIn();
    setPendingPlan(planId);
    try {
      const response = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || t("pricing.errors.subscribe"));
      if (body.url) {
        window.location.assign(body.url); // 全新订阅：走 Checkout
        return;
      }
      window.dispatchEvent(new Event("credits:refresh")); // 升级：立即生效，没有要跳转的页面
      refreshStatus();
    } catch (err) {
      setError(err?.message || t("pricing.errors.subscribe"));
    } finally {
      setPendingPlan(null);
    }
  }

  async function manageBilling() {
    setError("");
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
  const activeTier = activeSub ? PLANS.find((p) => p.id === activeSub.plan)?.tier ?? 0 : 0;

  function planAction(plan) {
    if (activeSub && plan.id === activeSub.plan) {
      return <span className="plan-current-badge">{t("pricing.currentPlanBadge")}</span>;
    }
    if (activeSub && plan.tier < activeTier) return null; // 降级不走这个按钮，走下面的 Portal
    return (
      <Button
        className="primary-button"
        fullWidth
        isPending={pendingPlan === plan.id}
        onPress={() => subscribe(plan.id)}
      >
        {activeSub ? t("pricing.upgrade") : t("pricing.subscribe")}
      </Button>
    );
  }

  return <main className="workspace-page pricing-page">
    <div className="page-title"><div><span className="section-label">{t("pricing.section")}</span><h1>{t("pricing.title")}</h1><p>{t("pricing.subtitle")}</p></div></div>
    {checkoutState === "success" && <p className="pricing-banner pricing-banner-success" role="status">{t("pricing.checkoutSuccess")}</p>}
    {checkoutState === "cancelled" && <p className="pricing-banner" role="status">{t("pricing.checkoutCancelled")}</p>}
    {error && <p className="inline-error" role="alert">{error}</p>}

    {activeSub && <Card className="current-plan-card"><Card.Content>
      <div className="current-plan-info">
        <span className="section-label">{t("pricing.currentPlanTitle")}</span>
        <strong>{t(`pricing.plans.${activeSub.plan}.label`)}</strong>
        <span className="current-plan-credits"><CoinsIcon size={15} />{t("pricing.creditsRemaining", { count: status.credits.total })}</span>
        <span className="current-plan-renew">
          {activeSub.cancelAtPeriodEnd
            ? t("pricing.cancelsOn", { date: formatDate(activeSub.currentPeriodEnd) })
            : t("pricing.nextReset", { date: formatDate(activeSub.currentPeriodEnd) })}
        </span>
      </div>
      <Button variant="outline" isPending={pendingPortal} onPress={manageBilling}>{t("pricing.manageSubscription")}</Button>
    </Card.Content></Card>}

    <h2 className="pricing-subheading">{t("pricing.subscriptionSection")}</h2>
    <div className="pricing-packs">
      {PLANS.map((plan) => (
        <Card key={plan.id} className="pricing-pack">
          <Card.Content>
            <span className="pack-price">{plan.price}<small>{t("pricing.perMonth")}</small></span>
            <strong className="plan-label">{t(`pricing.plans.${plan.id}.label`)}</strong>
            <span className="pack-credits"><CoinsIcon size={16} />{t("pricing.planCredits", { count: plan.credits })}</span>
            {planAction(plan)}
          </Card.Content>
        </Card>
      ))}
    </div>

    <h2 className="pricing-subheading">{t("pricing.onetimeSection")}</h2>
    <div className="pricing-packs">
      {PACKS.map((pack) => (
        <Card key={pack.id} className="pricing-pack">
          <Card.Content>
            <span className="pack-price">{pack.price}</span>
            <span className="pack-credits"><CoinsIcon size={16} />{t("pricing.packCredits", { count: pack.credits })}</span>
            <Button
              className="primary-button"
              fullWidth
              isPending={pendingPack === pack.id}
              onPress={() => buyPack(pack.id)}
            >
              {t("pricing.buy")}
            </Button>
          </Card.Content>
        </Card>
      ))}
    </div>
  </main>;
}
