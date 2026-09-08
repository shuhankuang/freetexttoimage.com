"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { ArrowIcon, GoogleIcon, Logo, SparkIcon } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => { if (!isPending && session) router.replace("/studio"); }, [isPending, session, router]);
  // 支持深链：/login?mode=signup 直达注册 tab（来自右上角 “Get started free”）。放在 effect 里避免 SSR 水合不一致。
  useEffect(() => { if (new URLSearchParams(window.location.search).get("mode") === "signup") setMode("signup"); }, []);

  function switchMode(next) { setMode(next); setError(""); window.history.replaceState(null, "", next === "signup" ? "/login?mode=signup" : "/login"); }

  async function submit(event) {
    event.preventDefault();
    setPending(true); setError("");
    const data = new FormData(event.currentTarget);
    const email = data.get("email")?.toString().trim() || "";
    const password = data.get("password")?.toString() || "";
    try {
      if (mode === "signin") {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) throw new Error(error.message || "Unable to sign in. Check your email and password.");
      } else {
        const name = data.get("name")?.toString().trim();
        const { error } = await authClient.signUp.email({ email, password, name: name || email.split("@")[0] });
        if (error) throw new Error(error.message || "Unable to create your account.");
      }
      router.replace("/studio");
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setPending(false);
    }
  }

  async function google() {
    setError("");
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: "/studio" });
    if (error) setError(error.message || "Google sign-in is not configured yet.");
  }

  return <main className="auth-page">
    <section className="auth-story"><Logo /><div><span className="eyebrow"><SparkIcon /> YOUR CREATIVE SPACE</span><h1>Make room for<br /><em>better ideas.</em></h1><p>A focused workspace for prompts, images, and everything you want to keep.</p></div><span className="auth-note">Your workspace · Sign in to pick up where you left off</span></section>
    <section className="auth-panel"><div className="auth-box"><Link href="/" className="back-link">← Back home</Link>
      <div className="auth-tabs" role="tablist" aria-label="Sign in or create an account">
        <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "selected" : ""} onClick={() => switchMode("signin")}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "selected" : ""} onClick={() => switchMode("signup")}>Create account</button>
      </div>
      <h2>{mode === "signin" ? "Welcome back" : "Join Forma"}</h2>
      <p>{mode === "signin" ? "Sign in to open your image workspace." : "Create your account to start creating."}</p>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <Form aria-label={mode === "signin" ? "Sign in" : "Create account"} className="auth-form" onSubmit={submit}>
        {mode === "signup" && <TextField name="name" autoComplete="name"><Label>Name</Label><Input placeholder="Your name" /></TextField>}
        <TextField isRequired name="email" type="email" autoComplete="email"><Label>Email address</Label><Input placeholder="you@example.com" /><FieldError /></TextField>
        <TextField isRequired minLength={8} name="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"}><Label>Password</Label><Input placeholder="At least 8 characters" /><FieldError /></TextField>
        <Button type="submit" size="lg" fullWidth isPending={pending} className="primary-button">{mode === "signin" ? "Sign in" : "Create account"} <ArrowIcon /></Button>
      </Form>
      <div className="auth-divider"><span>or</span></div>
      <Button size="lg" fullWidth variant="outline" onPress={google}><GoogleIcon />Continue with Google</Button>
      <p className="legal-copy">Your account and creations are stored securely. Passwords are hashed and never shared.</p>
    </div></section>
  </main>;
}
