"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Spinner } from "@heroui/react";
import { useI18n } from "@/i18n/provider";
import { authClient } from "@/lib/auth-client";
import { loginPathWithRedirect } from "@/lib/auth-redirect";
import { CoinsIcon } from "@/components/ui";

const PACKS = [
  { id: "credits_40", price: "$5", credits: 40 },
  { id: "credits_140", price: "$15", credits: 140 },
  { id: "credits_320", price: "$30", credits: 320, best: true },
];

export default function PricingTopups() {
  const router = useRouter();
  const { path, t } = useI18n();
  const { data: session } = authClient.useSession();
  const [pendingPack, setPendingPack] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    function resetPendingAfterHistoryRestore() {
      setPendingPack(null);
    }

    window.addEventListener("pageshow", resetPendingAfterHistoryRestore);
    return () => window.removeEventListener("pageshow", resetPendingAfterHistoryRestore);
  }, []);

  function requireSignIn() {
    router.push(loginPathWithRedirect(path("/login"), path("/pricing")));
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

  function pendingButtonContent() {
    return <><Spinner size="sm" color="current" aria-label={t("pricing.processing")} />{t("pricing.processing")}</>;
  }

  return <>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <div className="topup-grid">{PACKS.map((pack) => <Card key={pack.id} className={`topup-card${pack.best ? " best" : ""}`}><Card.Content>
      {pack.best && <span className="topup-best">{t("pricing.bestValue")}</span>}
      <span className="topup-price">{pack.price}</span><strong><CoinsIcon size={16} />{t("pricing.packCredits", { count: pack.credits })}</strong>
      <Button className={pack.best ? "primary-button" : "topup-button"} variant={pack.best ? undefined : "secondary"} fullWidth isPending={pendingPack === pack.id} isDisabled={Boolean(pendingPack) && pendingPack !== pack.id} onPress={() => buyPack(pack.id)}>
        {pendingPack === pack.id ? pendingButtonContent() : t("pricing.buyCredits", { count: pack.credits })}
      </Button>
    </Card.Content></Card>)}</div>
  </>;
}
