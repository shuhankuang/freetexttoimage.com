"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Modal, Spinner } from "@heroui/react";
import { authClient } from "@/lib/auth-client";
import { ArrowIcon, CompassIcon, GridIcon, ImageIcon, Logo, LogoutIcon, SparklesIcon, UserIcon } from "@/components/ui";

export default function AppShell({ children, publicView = false }) {
  const pathname = usePathname(); const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user || null;
  const [logoutOpen, setLogoutOpen] = useState(false);
  const signedOutRef = useRef(false);
  useEffect(() => { if (!isPending && !user && !publicView && !signedOutRef.current) router.replace("/login"); }, [router, publicView, isPending, user]);
  if (!publicView && (isPending || !user)) return <div className="screen-loader"><Spinner /><span>Opening your workspace…</span></div>;
  // 主动登出：先置 ref 让守卫不拦截，signOut 完成后跳回首页（publicView，无守卫）。
  // 若不做 ref，/studio 等受保护页的守卫会在 user 变 null 时抢先跳 /login，与回首页冲突。
  async function logout() {
    setLogoutOpen(false);
    signedOutRef.current = true;
    try { await authClient.signOut(); } finally { router.replace("/"); }
  }
  return <div className="app-frame">
    <aside className="app-sidebar"><Logo /><span className="sidebar-eyebrow">YOUR CREATIVE SPACE</span><nav aria-label="Workspace navigation">
      <Link className={pathname === "/" ? "active" : ""} href="/"><CompassIcon />Explore</Link>
      <Link className={pathname === "/studio" ? "active" : ""} href="/studio"><ImageIcon />Create</Link>
      <Link className={pathname === "/creations" ? "active" : ""} href="/creations"><GridIcon />My creations</Link>
    </nav><div className="sidebar-note"><span><SparklesIcon /></span><div className="note-title">Big ideas start<br /><em>small</em>.</div><p>A word. A thought. A what if.<br />Make something only you can.</p><Link href={user ? "/studio" : "/login"}>Start creating <span>→</span></Link></div>{user ? <div className="sidebar-account"><span className="account-avatar"><UserIcon /></span><div><strong>{user.name || "Your workspace"}</strong><span>{user.email}</span></div><Button isIconOnly variant="ghost" aria-label="Sign out" onPress={() => setLogoutOpen(true)}><LogoutIcon /></Button></div> : <Link className="sidebar-account account-guest" href="/login"><span className="account-avatar"><UserIcon /></span><div><strong>Sign in</strong><span>Save every creation you make</span></div><ArrowIcon /></Link>}</aside>
    <div className="app-main"><header className="app-header"><span className="header-trail">Workspace <i>/</i> <strong>{pathname === "/creations" ? "My creations" : "Image studio"}</strong></span>{user ? <Button isIconOnly variant="ghost" aria-label="Sign out" onPress={() => setLogoutOpen(true)}><LogoutIcon /></Button> : <div className="header-auth"><Link className="header-signin" href="/login">Sign in</Link><Link className="header-cta" href="/login?mode=signup">Get started <em>free</em></Link></div>}</header>{children}</div>
    <Modal.Backdrop isOpen={logoutOpen} onOpenChange={(open) => { if (!open) setLogoutOpen(false); }}><Modal.Container size="sm"><Modal.Dialog className="logout-dialog"><Modal.CloseTrigger /><Modal.Body><Modal.Heading>Sign out of Forma?</Modal.Heading><p>Your creations stay saved in this workspace. You&apos;ll just need to sign in again to create or edit.</p><div className="logout-actions"><Button variant="danger" onPress={logout}>Sign out <LogoutIcon /></Button><Button variant="outline" slot="close">Cancel</Button></div></Modal.Body></Modal.Dialog></Modal.Container></Modal.Backdrop>
  </div>;
}
