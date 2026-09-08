"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { ArrowIcon, Logo, SparkIcon } from "@/components/ui";
import { getSession, signIn } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter(); const [pending, setPending] = useState(false);
  useEffect(() => { if (getSession()) router.replace("/studio"); }, [router]);
  function submit(event) {
    event.preventDefault(); setPending(true);
    const email = new FormData(event.currentTarget).get("email").toString();
    signIn(email); router.push("/studio");
  }
  function demo() { setPending(true); signIn("demo@forma.studio"); router.push("/studio"); }
  return <main className="auth-page">
    <section className="auth-story"><Logo /><div><span className="eyebrow"><SparkIcon /> YOUR CREATIVE SPACE</span><h1>Make room for<br /><em>better ideas.</em></h1><p>A focused workspace for prompts, images, and everything you want to keep.</p></div><span className="auth-note">Interactive product demo · Data stays in this browser</span></section>
    <section className="auth-panel"><div className="auth-box"><Link href="/" className="back-link">← Back home</Link><h2>Welcome to Forma</h2><p>Sign in to open your image workspace.</p>
      <Form aria-label="Sign in" className="auth-form" onSubmit={submit}>
        <TextField isRequired name="email" type="email"><Label>Email address</Label><Input placeholder="you@example.com" /><FieldError /></TextField>
        <TextField isRequired minLength={8} name="password" type="password"><Label>Password</Label><Input placeholder="At least 8 characters" /><FieldError /></TextField>
        <Button type="submit" size="lg" fullWidth isPending={pending} className="primary-button">Continue <ArrowIcon /></Button>
      </Form>
      <div className="auth-divider"><span>or</span></div>
      <Button size="lg" fullWidth variant="outline" onPress={demo}>Continue with demo account</Button>
      <p className="legal-copy">This prototype stores your session and creations locally. It does not send your password anywhere.</p>
    </div></section>
  </main>;
}
