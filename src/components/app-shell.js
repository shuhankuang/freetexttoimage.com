"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Dropdown, Modal, Spinner } from "@heroui/react";
import { authClient } from "@/lib/auth-client";
import LanguageSwitcher from "@/components/language-switcher";
import { useI18n } from "@/i18n/provider";
import { ArrowIcon, CoinsIcon, CompassIcon, GridIcon, ImageIcon, Logo, LogoutIcon, SparklesIcon, UserIcon } from "@/components/ui";

export default function AppShell({ children, publicView = false }) {
  const rawPathname = usePathname();
  const pathname = rawPathname.replace(/^\/en(?=\/|$)/, "") || "/";
  const router = useRouter();
  const { path, t } = useI18n();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user || null;
  const [credits, setCredits] = useState(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const signedOutRef = useRef(false);
  const homePath = path("/");
  const studioPath = path("/studio");
  const creationsPath = path("/creations");
  const pricingPath = path("/pricing");
  const loginPath = path("/login");

  useEffect(() => {
    if (!isPending && !user && !publicView && !signedOutRef.current) router.replace(loginPath);
  }, [router, loginPath, publicView, isPending, user]);

  // 顶栏积分余额：登录后拉一次；生成流程结束后 image-studio 会 dispatch "credits:refresh" 通知刷新。
  useEffect(() => {
    if (!user) return; // 未登录时 sidebar-account 走 guest 分支，不渲染积分，credits 状态留着无妨
    let cancelled = false;
    function refresh() {
      fetch("/api/credits")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => { if (!cancelled && data) setCredits(data.total); })
        .catch(() => {});
    }
    refresh();
    window.addEventListener("credits:refresh", refresh);
    return () => { cancelled = true; window.removeEventListener("credits:refresh", refresh); };
  }, [user]);

  if (!publicView && (isPending || !user)) {
    return <div className="screen-loader"><Spinner /><span>{t("shell.opening")}</span></div>;
  }

  async function logout() {
    setLogoutOpen(false);
    signedOutRef.current = true;
    try { await authClient.signOut(); } finally { router.replace(homePath); }
  }

  const pageTitle = pathname === creationsPath
    ? t("shell.creations")
    : pathname === pricingPath
      ? t("shell.pricing")
      : t("shell.imageStudio");

  return <div className="app-frame">
    <aside className="app-sidebar">
      <Logo href={homePath} label={t("shell.homeLabel")} />
      <span className="sidebar-eyebrow">{t("shell.eyebrow")}</span>
      <nav aria-label={t("shell.navigation")}>
        <Link className={pathname === homePath ? "active" : ""} href={homePath}><CompassIcon />{t("shell.explore")}</Link>
        <Link className={pathname === studioPath ? "active" : ""} href={studioPath}><ImageIcon />{t("shell.create")}</Link>
        <Link className={pathname === creationsPath ? "active" : ""} href={creationsPath}><GridIcon />{t("shell.creations")}</Link>
        <Link className={pathname === pricingPath ? "active" : ""} href={pricingPath}><CoinsIcon />{t("shell.pricing")}</Link>
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
          {user && credits !== null && <span className="header-credits"><CoinsIcon size={14} />{t("shell.credits", { count: credits })}</span>}
          {user ? (
            <Dropdown>
              <Dropdown.Trigger className="user-menu-trigger" aria-label={t("shell.account")}>
                <UserIcon />
              </Dropdown.Trigger>
              <Dropdown.Popover placement="bottom end" className="user-menu-popover">
                <Dropdown.Menu
                  aria-label={t("shell.account")}
                  onAction={(key) => { if (key === "logout") setLogoutOpen(true); }}
                >
                  <Dropdown.Item id="logout" textValue={t("shell.signOut")}>
                    <LogoutIcon /><span>{t("shell.signOut")}</span>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          ) : (
            <div className="header-auth"><Link className="header-signin" href={loginPath}>{t("shell.signIn")}</Link><Link className="header-cta" href={loginPath}>{t("shell.getStarted")}{t("shell.free") && <em>{t("shell.free")}</em>}</Link></div>
          )}
        </div>
      </header>
      {children}
    </div>
    <Modal.Backdrop isOpen={logoutOpen} onOpenChange={(open) => { if (!open) setLogoutOpen(false); }}>
      <Modal.Container size="sm"><Modal.Dialog className="logout-dialog"><Modal.CloseTrigger aria-label={t("shell.cancel")} /><Modal.Body><Modal.Heading>{t("shell.logoutTitle")}</Modal.Heading><p>{t("shell.logoutBody")}</p><div className="logout-actions"><Button variant="danger" onPress={logout} className="rounded-xl">{t("shell.signOut")} <LogoutIcon /></Button><Button className="rounded-xl" variant="outline" slot="close">{t("shell.cancel")}</Button></div></Modal.Body></Modal.Dialog></Modal.Container>
    </Modal.Backdrop>
  </div>;
}
