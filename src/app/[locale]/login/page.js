"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, FieldError, Form, Input, Label, Spinner, TextField } from "@heroui/react";
import { ArrowIcon, CheckIcon, GoogleIcon, Logo, SparkIcon } from "@/components/ui";
import LanguageSwitcher from "@/components/language-switcher";
import { useI18n } from "@/i18n/provider";
import { authClient } from "@/lib/auth-client";
import { loginPathWithRedirect, safeRedirectPath } from "@/lib/auth-redirect";
import TurnstileVerification from "@/components/turnstile-verification";

function isValidEmail(value) {
  const email = value.trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginPage() {
  const router = useRouter();
  const { locale, path, t } = useI18n();
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [error, setError] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileAttempt, setTurnstileAttempt] = useState(0);
  const { data: session, isPending } = authClient.useSession();
  const homePath = path("/");
  const loginPath = path("/login");
  const studioPath = path("/studio");
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  const updateTurnstileToken = useCallback((token) => setTurnstileToken(token), []);
  const emailIsValid = isValidEmail(email);
  const emailIsInvalid = emailTouched && !emailIsValid;

  useEffect(() => {
    if (isPending || !session) return;
    const requested = new URLSearchParams(window.location.search).get("redirect");
    router.replace(safeRedirectPath(requested, studioPath));
  }, [isPending, session, router, studioPath]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("error")) {
      params.delete("error");
      const query = params.toString();
      window.history.replaceState(null, "", `${loginPath}${query ? `?${query}` : ""}`);
      const timer = window.setTimeout(() => setError(t("auth.errors.invalidLink")), 0);
      return () => window.clearTimeout(timer);
    }
  }, [loginPath, t]);

  function redirectTarget() {
    const requested = new URLSearchParams(window.location.search).get("redirect");
    return safeRedirectPath(requested, studioPath);
  }

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const emailAddress = data.get("email")?.toString().trim() || "";
    const target = redirectTarget();

    if (!isValidEmail(emailAddress)) {
      setPending(false);
      setEmailTouched(true);
      return;
    }

    if (!turnstileToken) {
      setPending(false);
      setError(t("auth.errors.verification"));
      return;
    }

    try {
      const { error: authError } = await authClient.signIn.magicLink({
        email: emailAddress,
        callbackURL: target,
        newUserCallbackURL: target,
        errorCallbackURL: loginPathWithRedirect(loginPath, target),
        metadata: { locale },
      }, { headers: { "x-turnstile-token": turnstileToken } });
      if (authError) {
        setError(authError.code === "TURNSTILE_VERIFICATION_FAILED" ? t("auth.errors.verification") : t("auth.errors.magicLink"));
        setTurnstileToken("");
        setTurnstileAttempt((value) => value + 1);
        return;
      }
      setSentEmail(emailAddress);
    } catch {
      setError(t("auth.errors.generic"));
      setTurnstileToken("");
      setTurnstileAttempt((value) => value + 1);
    } finally {
      setPending(false);
    }
  }

  async function google() {
    setError("");
    setGooglePending(true);
    try {
      const { error: authError } = await authClient.signIn.social({ provider: "google", callbackURL: redirectTarget() });
      if (authError) {
        setError(t("auth.errors.google"));
        setGooglePending(false);
      }
    } catch {
      setError(t("auth.errors.generic"));
      setGooglePending(false);
    }
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
        <Button size="lg" fullWidth className="google-login-button" isPending={googlePending} isDisabled={googlePending || pending} onPress={google}>
          {googlePending ? <><Spinner size="sm" color="current" />{t("auth.googleLoading")}</> : <><GoogleIcon />{t("auth.google")}</>}
        </Button>
        <div className="auth-divider"><span>{t("auth.or")}</span></div>
        <Form aria-label={t("auth.title")} className="auth-form" onSubmit={submit}>
          <TextField isRequired isInvalid={emailIsInvalid} name="email" type="email" autoComplete="email">
            <Label>{t("auth.email")}</Label>
            <Input
              placeholder="name@example.com"
              value={email}
              onChange={(event) => {
                const nextEmail = event.target.value;
                setEmail(nextEmail);
                if (!isValidEmail(nextEmail)) setTurnstileToken("");
              }}
              onBlur={() => setEmailTouched(true)}
            />
            <FieldError>{email.trim() ? t("auth.errors.invalidEmail") : t("auth.errors.emailRequired")}</FieldError>
          </TextField>
          <TurnstileVerification
            active={emailIsValid}
            attempt={turnstileAttempt}
            siteKey={turnstileSiteKey}
            onChange={updateTurnstileToken}
          />
          <Button type="submit" size="lg" fullWidth variant="soft" isPending={pending} isDisabled={!turnstileToken || pending} className="email-link-button">{t("auth.sendLink")} <ArrowIcon /></Button>
        </Form>
      </>}
      <p className="legal-copy">{t("auth.legal")}</p>
    </div></section>
  </main>;
}
