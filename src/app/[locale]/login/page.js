"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { ArrowIcon, CheckIcon, GoogleIcon, Logo, SparkIcon } from "@/components/ui";
import LanguageSwitcher from "@/components/language-switcher";
import { useI18n } from "@/i18n/provider";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const { locale, path, t } = useI18n();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const { data: session, isPending } = authClient.useSession();
  const homePath = path("/");
  const loginPath = path("/login");
  const studioPath = path("/studio");

  useEffect(() => {
    if (!isPending && session) router.replace(studioPath);
  }, [isPending, session, router, studioPath]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("error")) {
      setError(t("auth.errors.invalidLink"));
      window.history.replaceState(null, "", loginPath);
    }
  }, [loginPath, t]);

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const email = data.get("email")?.toString().trim() || "";

    try {
      const { error: authError } = await authClient.signIn.magicLink({
        email,
        callbackURL: studioPath,
        newUserCallbackURL: studioPath,
        errorCallbackURL: loginPath,
        metadata: { locale },
      });
      if (authError) {
        setError(t("auth.errors.magicLink"));
        return;
      }
      setSentEmail(email);
    } catch {
      setError(t("auth.errors.generic"));
    } finally {
      setPending(false);
    }
  }

  async function google() {
    setError("");
    const { error: authError } = await authClient.signIn.social({ provider: "google", callbackURL: studioPath });
    if (authError) setError(t("auth.errors.google"));
  }

  return <main className="auth-page">
    <LanguageSwitcher className="auth-language" />
    <section className="auth-story"><Logo href={homePath} label={t("shell.homeLabel")} /><div><span className="eyebrow"><SparkIcon /> {t("auth.eyebrow")}</span><h1>{t("auth.heroTitle")}<br /><em>{t("auth.heroAccent")}</em></h1><p>{t("auth.heroBody")}</p></div><span className="auth-note">{t("auth.note")}</span></section>
    <section className="auth-panel"><div className="auth-box"><Link href={homePath} className="back-link">{t("auth.back")}</Link>
      {sentEmail ? <div className="magic-link-sent" role="status">
        <span className="magic-link-icon"><CheckIcon size={22} /></span>
        <h2>{t("auth.sentTitle")}</h2>
        <p>{t("auth.sentBody", { email: sentEmail })}</p>
        <small>{t("auth.sentHint")}</small>
        <Button fullWidth variant="outline" onPress={() => { setSentEmail(""); setError(""); }}>{t("auth.useAnother")}</Button>
      </div> : <>
        <h2>{t("auth.title")}</h2>
        <p>{t("auth.body")}</p>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <Button size="lg" fullWidth className="google-login-button" onPress={google}><GoogleIcon />{t("auth.google")}</Button>
        <div className="auth-divider"><span>{t("auth.or")}</span></div>
        <Form aria-label={t("auth.title")} className="auth-form" onSubmit={submit}>
          <TextField isRequired name="email" type="email" autoComplete="email"><Label>{t("auth.email")}</Label><Input placeholder="you@example.com" /><FieldError /></TextField>
          <Button type="submit" size="lg" fullWidth variant="soft" isPending={pending} className="email-link-button">{t("auth.sendLink")} <ArrowIcon /></Button>
        </Form>
      </>}
      <p className="legal-copy">{t("auth.legal")}</p>
    </div></section>
  </main>;
}
