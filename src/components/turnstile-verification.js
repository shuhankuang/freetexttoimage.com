"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const ACTION = "turnstile-spin-v1";

export default function TurnstileVerification({ active, attempt, siteKey, onChange }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active || !ready || !siteKey || !containerRef.current || !window.turnstile) return;

    onChange("");
    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action: ACTION,
      appearance: "always",
      execution: "execute",
      size: "normal",
      callback(token) {
        onChange(token);
      },
      "error-callback"() {
        onChange("");
      },
      "expired-callback"() {
        onChange("");
        window.turnstile.reset(widgetId);
        window.turnstile.execute(widgetId);
      },
    });
    widgetRef.current = widgetId;
    window.turnstile.execute(widgetId);

    return () => {
      if (window.turnstile && widgetRef.current !== null) window.turnstile.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, [active, attempt, onChange, ready, siteKey]);

  if (!active) return null;

  return <div className="turnstile-verification">
    <Script src={SCRIPT_URL} strategy="afterInteractive" onReady={() => setReady(true)} />
    <div ref={containerRef} className="turnstile-widget" data-action="turnstile-spin-v1" />
  </div>;
}
