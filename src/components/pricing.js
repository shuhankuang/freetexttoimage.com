"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@heroui/react";
import { useI18n } from "@/i18n/provider";
import { authClient } from "@/lib/auth-client";
import { CoinsIcon } from "@/components/ui";

// 一次性积分包。credits 数量只用来展示——真正发多少积分由服务端 src/lib/billing.js 的
// CREDIT_PACKS 决定，这里改了如果服务端没同步改，只是文案对不上，不会多发/少发。
const PACKS = [
  { id: "credits_40", price: "$5", credits: 40 },
  { id: "credits_140", price: "$15", credits: 140 },
  { id: "credits_320", price: "$30", credits: 320 },
];

export default function Pricing() {
  const router = useRouter();
  const { path, t } = useI18n();
  const { data: session } = authClient.useSession();
  const [pendingPack, setPendingPack] = useState(null);
  const [error, setError] = useState("");
  // 懒初始化直接读，不在 effect 里 setState——用 window.location，不用 useSearchParams，
  // 跟登录页一致，省一个 Suspense 边界；SSR 阶段没有 window，兜底 null。
  const [checkoutState] = useState(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("checkout")
  ); // "success" | "cancelled" | null

  // 付款成功回跳：真正发积分靠 webhook，这里只负责让顶栏尽快看到新余额，不直接当成"已到账"。
  useEffect(() => {
    if (checkoutState !== "success") return;
    const ticks = [500, 2000, 4000, 8000];
    const timers = ticks.map((delay) => setTimeout(() => window.dispatchEvent(new Event("credits:refresh")), delay));
    return () => timers.forEach(clearTimeout);
  }, [checkoutState]);

  async function buy(packId) {
    setError("");
    if (!session?.user) {
      router.push(`${path("/login")}?redirect=${encodeURIComponent(path("/pricing"))}`);
      return;
    }
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

  return <main className="workspace-page pricing-page">
    <div className="page-title"><div><span className="section-label">{t("pricing.section")}</span><h1>{t("pricing.title")}</h1><p>{t("pricing.subtitle")}</p></div></div>
    {checkoutState === "success" && <p className="pricing-banner pricing-banner-success" role="status">{t("pricing.checkoutSuccess")}</p>}
    {checkoutState === "cancelled" && <p className="pricing-banner" role="status">{t("pricing.checkoutCancelled")}</p>}
    {error && <p className="inline-error" role="alert">{error}</p>}
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
              onPress={() => buy(pack.id)}
            >
              {t("pricing.buy")}
            </Button>
          </Card.Content>
        </Card>
      ))}
    </div>
  </main>;
}
