"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Spinner } from "@heroui/react";
import { signOut } from "@/lib/store";
import { useLocalData } from "@/components/use-local-data";
import { GridIcon, ImageIcon, Logo, LogoutIcon, UserIcon } from "@/components/ui";

export default function AppShell({ children, publicView = false }) {
  const pathname = usePathname(); const router = useRouter();
  const { value: user, ready } = useLocalData("forma.session");
  useEffect(() => { if (ready && !user && !publicView) router.replace("/login"); }, [router, publicView, ready, user]);
  if (!publicView && (!ready || !user)) return <div className="screen-loader"><Spinner /><span>Opening your workspace…</span></div>;
  const logout = () => { signOut(); router.replace("/login"); };
  return <div className="app-frame">
    <aside className="app-sidebar"><Logo /><span className="sidebar-eyebrow">YOUR CREATIVE SPACE</span><nav aria-label="Workspace navigation">
      <Link className={pathname === "/" ? "active" : ""} href="/"><GridIcon />Explore</Link>
      <Link className={pathname === "/studio" ? "active" : ""} href="/studio"><ImageIcon />Create</Link>
      <Link className={pathname === "/creations" ? "active" : ""} href="/creations"><GridIcon />My creations</Link>
    </nav><div className="sidebar-note"><span>✳</span><h3>Big ideas start small.</h3><p>A word. A thought. A what if.<br />Make something only you can.</p><Link href={user ? "/studio" : "/login"}>Start creating <span>→</span></Link></div><div className="sidebar-account"><span className="account-avatar"><UserIcon /></span><div><strong>{user?.name || "Personal workspace"}</strong><span>{user?.email || "Let your ideas run free"}</span></div>{user ? <Button isIconOnly variant="ghost" aria-label="Sign out" onPress={logout}><LogoutIcon /></Button> : <Link href="/login" aria-label="Sign in">→</Link>}</div></aside>
    <div className="app-main"><header className="app-header"><span className="header-trail">Workspace <i>/</i> <strong>{pathname === "/creations" ? "My creations" : "Image studio"}</strong></span><div><span className="credit-dot" /> Demo workspace</div>{user ? <Button isIconOnly variant="ghost" aria-label="Sign out" onPress={logout}><LogoutIcon /></Button> : <Link className="header-signin" href="/login">Sign in <span>↗</span></Link>}</header>{children}</div>
  </div>;
}
