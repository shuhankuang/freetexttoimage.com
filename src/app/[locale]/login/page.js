"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { ArrowIcon, GoogleIcon, Logo, SparkIcon } from "@/components/ui";
import LanguageSwitcher from "@/components/language-switcher";
import { useI18n } from "@/i18n/provider";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const { path, t } = useI18n();
  const [mode, setMode] = useState("signin");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const { data: session, isPending } = authClient.useSession();
  const homePath = path("/");
  const loginPath = path("/login");
  const studioPath = path("/studio");

  useEffect(() => { if (!isPending && session) router.replace(studioPath); }, [isPending, session, router, studioPath]);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("mode") === "signup") setMode("signup"); }, []);

  function switchMode(next) {
    setMode(next);
    setError("");
    window.history.replaceState(null, "", next === "signup" ? `${loginPath}?mode=signup` : loginPath);
  }

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const email = data.get("email")?.toString().trim() || "";
    const password = data.get("password")?.toString() || "";
    try {
      if (mode === "signin") {
        const { error: authError } = await authClient.signIn.email({ email, password });
        if (authError) throw new Error(t("auth.errors.signIn"));
      } else {
        const name = data.get("name")?.toString().trim();
        const { error: authError } = await authClient.signUp.email({ email, password, name: name || email.split("@")[0] });
        if (authError) throw new Error(t("auth.errors.signUp"));
      }
      router.replace(studioPath);
    } catch (err) {
      const knownErrors = [t("auth.errors.signIn"), t("auth.errors.signUp")];
      setError(knownErrors.includes(err?.message) ? err.message : t("auth.errors.generic"));
      setPending(false);
    }
  }

  async function google() {
    setError("");
    const { error: authError } = await authClient.signIn.social({ provider: "google", callbackURL: studioPath });
    if (authError) setError(t("auth.errors.google"));
  }

  const isSignIn = mode === "signin";

  return <main className="auth-page">
    <LanguageSwitcher className="auth-language" />
    <section className="auth-story"><Logo href={homePath} label={t("shell.homeLabel")} /><div><span className="eyebrow"><SparkIcon /> {t("auth.eyebrow")}</span><h1>{t("auth.heroTitle")}<br /><em>{t("auth.heroAccent")}</em></h1><p>{t("auth.heroBody")}</p></div><span className="auth-note">{t("auth.note")}</span></section>
    <section className="auth-panel"><div className="auth-box"><Link href={homePath} className="back-link">{t("auth.back")}</Link>
      <div className="auth-tabs" role="tablist" aria-label={t("auth.tabsLabel")}>
        <button type="button" role="tab" aria-selected={isSignIn} className={isSignIn ? "selected" : ""} onClick={() => switchMode("signin")}>{t("auth.signIn")}</button>
        <button type="button" role="tab" aria-selected={!isSignIn} className={!isSignIn ? "selected" : ""} onClick={() => switchMode("signup")}>{t("auth.createAccount")}</button>
      </div>
      <h2>{isSignIn ? t("auth.welcome") : t("auth.join")}</h2>
      <p>{isSignIn ? t("auth.signInBody") : t("auth.signUpBody")}</p>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <Form aria-label={isSignIn ? t("auth.signIn") : t("auth.createAccount")} className="auth-form" onSubmit={submit}>
        {!isSignIn && <TextField name="name" autoComplete="name"><Label>{t("auth.name")}</Label><Input placeholder={t("auth.namePlaceholder")} /></TextField>}
        <TextField isRequired name="email" type="email" autoComplete="email"><Label>{t("auth.email")}</Label><Input placeholder="you@example.com" /><FieldError /></TextField>
        <TextField isRequired minLength={8} name="password" type="password" autoComplete={isSignIn ? "current-password" : "new-password"}><Label>{t("auth.password")}</Label><Input placeholder={t("auth.passwordPlaceholder")} /><FieldError /></TextField>
        <Button type="submit" size="lg" fullWidth isPending={pending} className="primary-button">{isSignIn ? t("auth.signIn") : t("auth.createAccount")} <ArrowIcon /></Button>
      </Form>
      <div className="auth-divider"><span>{t("auth.or")}</span></div>
      <Button size="lg" fullWidth variant="outline" onPress={google}><GoogleIcon />{t("auth.google")}</Button>
      <p className="legal-copy">{t("auth.legal")}</p>
    </div></section>
  </main>;
}
