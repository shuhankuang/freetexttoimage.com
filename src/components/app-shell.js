"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Modal, Spinner } from "@heroui/react";
import { authClient } from "@/lib/auth-client";
import LanguageSwitcher from "@/components/language-switcher";
import { useI18n } from "@/i18n/provider";
import { ArrowIcon, CompassIcon, GridIcon, ImageIcon, Logo, LogoutIcon, SparklesIcon, UserIcon } from "@/components/ui";

export default function AppShell({ children, publicView = false }) {
  const rawPathname = usePathname();
  const pathname = rawPathname.replace(/^\/en(?=\/|$)/, "") || "/";
  const router = useRouter();
  const { path, t } = useI18n();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user || null;
  const [logoutOpen, setLogoutOpen] = useState(false);
  const signedOutRef = useRef(false);
  const homePath = path("/");
  const studioPath = path("/studio");
  const creationsPath = path("/creations");
  const loginPath = path("/login");

  useEffect(() => {
    if (!isPending && !user && !publicView && !signedOutRef.current) router.replace(loginPath);
  }, [router, loginPath, publicView, isPending, user]);

  if (!publicView && (isPending || !user)) {
    return <div className="screen-loader"><Spinner /><span>{t("shell.opening")}</span></div>;
  }

  async function logout() {
    setLogoutOpen(false);
    signedOutRef.current = true;
    try { await authClient.signOut(); } finally { router.replace(homePath); }
  }

  const pageTitle = pathname === creationsPath ? t("shell.creations") : t("shell.imageStudio");

  return <div className="app-frame">
    <aside className="app-sidebar">
      <Logo href={homePath} label={t("shell.homeLabel")} />
      <span className="sidebar-eyebrow">{t("shell.eyebrow")}</span>
      <nav aria-label={t("shell.navigation")}>
        <Link className={pathname === homePath ? "active" : ""} href={homePath}><CompassIcon />{t("shell.explore")}</Link>
        <Link className={pathname === studioPath ? "active" : ""} href={studioPath}><ImageIcon />{t("shell.create")}</Link>
        <Link className={pathname === creationsPath ? "active" : ""} href={creationsPath}><GridIcon />{t("shell.creations")}</Link>
      </nav>
      <div className="sidebar-note">
        <span><SparklesIcon /></span>
        <div className="note-title">{t("shell.noteStart")}<br /><em>{t("shell.noteEnd")}</em></div>
        <p>{t("shell.noteBody").split("\n").map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</p>
        <Link href={user ? studioPath : loginPath}>{t("shell.startCreating")} <span>→</span></Link>
      </div>
      {user ? <div className="sidebar-account"><span className="account-avatar"><UserIcon /></span><div><strong>{user.name || t("shell.workspaceFallback")}</strong><span>{user.email}</span></div><Button isIconOnly variant="ghost" aria-label={t("shell.signOut")} onPress={() => setLogoutOpen(true)}><LogoutIcon /></Button></div> : <Link className="sidebar-account account-guest" href={loginPath}><span className="account-avatar"><UserIcon /></span><div><strong>{t("shell.signIn")}</strong><span>{t("shell.saveEvery")}</span></div><ArrowIcon /></Link>}
    </aside>
    <div className="app-main">
      <header className="app-header">
        <span className="header-trail">{t("shell.workspace")} <i>/</i> <strong>{pageTitle}</strong></span>
        <div className="header-actions">
          <LanguageSwitcher />
          {user ? <Button isIconOnly variant="ghost" aria-label={t("shell.signOut")} onPress={() => setLogoutOpen(true)}><LogoutIcon /></Button> : <div className="header-auth"><Link className="header-signin" href={loginPath}>{t("shell.signIn")}</Link><Link className="header-cta" href={loginPath}>{t("shell.getStarted")}{t("shell.free") && <em>{t("shell.free")}</em>}</Link></div>}
        </div>
      </header>
      {children}
    </div>
    <Modal.Backdrop isOpen={logoutOpen} onOpenChange={(open) => { if (!open) setLogoutOpen(false); }}>
      <Modal.Container size="sm"><Modal.Dialog className="logout-dialog"><Modal.CloseTrigger aria-label={t("shell.cancel")} /><Modal.Body><Modal.Heading>{t("shell.logoutTitle")}</Modal.Heading><p>{t("shell.logoutBody")}</p><div className="logout-actions"><Button variant="danger" onPress={logout} className="rounded-xl">{t("shell.signOut")} <LogoutIcon /></Button><Button className="rounded-xl" variant="outline" slot="close">{t("shell.cancel")}</Button></div></Modal.Body></Modal.Dialog></Modal.Container>
    </Modal.Backdrop>
  </div>;
}
