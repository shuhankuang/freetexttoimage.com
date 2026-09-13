"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Dropdown, Modal, Spinner } from "@heroui/react";
import { authClient } from "@/lib/auth-client";
import { loginPathWithRedirect } from "@/lib/auth-redirect";
import LanguageSwitcher from "@/components/language-switcher";
import { useI18n } from "@/i18n/provider";
import { CoinsIcon, LogoutIcon, PromptCardsIcon, UserIcon } from "@/components/ui";

export default function AppShell({ children, footer, pageTitle: pageTitleOverride, publicView = false, showAdmin = false, sidebar }) {
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
  const creationsPath = path("/creations");
  const imageToPromptPath = path("/image-to-prompt");
  const pricingPath = path("/pricing");
  const profilePath = path("/profile");
  const explorePath = path("/explore");
  const promptsPath = path("/prompts");
  const loginPath = path("/login");
  const adminPath = path("/admin/prompts");
  const loginHref = loginPathWithRedirect(loginPath, pathname);

  useEffect(() => {
    if (!isPending && !user && !publicView && !signedOutRef.current) router.replace(loginHref);
  }, [router, loginHref, publicView, isPending, user]);

  // 顶栏积分余额：登录后拉一次；生成流程结束后 image-studio 会 dispatch "credits:refresh" 通知刷新。
  useEffect(() => {
    if (!user) return;
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

  const pageTitle = pageTitleOverride || (pathname === creationsPath
    ? t("shell.creations")
    : pathname === imageToPromptPath
      ? t("shell.imageToPrompt")
    : pathname === pricingPath
      ? t("shell.pricing")
      : pathname === profilePath
        ? t("shell.profileBilling")
        : pathname.startsWith(`${explorePath}/`)
          ? t("shell.explore")
          : pathname.startsWith(`${promptsPath}/`)
            ? t("modelPrompts.section")
          : pathname === adminPath
            ? "Prompt imports"
      : t("shell.imageStudio"));

  return <div className="app-frame">
    {sidebar}
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
                  onAction={(key) => {
                    if (key === "profile") router.push(profilePath);
                    if (key === "admin") router.push(adminPath);
                    if (key === "logout") setLogoutOpen(true);
                  }}
                >
                  <Dropdown.Item id="profile" textValue={t("shell.profileBilling")}>
                    <UserIcon /><span>{t("shell.profileBilling")}</span>
                  </Dropdown.Item>
                  {showAdmin && <Dropdown.Item id="admin" textValue="Prompt imports">
                    <PromptCardsIcon /><span>Prompt imports</span>
                  </Dropdown.Item>}
                  <Dropdown.Item id="logout" textValue={t("shell.signOut")}>
                    <LogoutIcon /><span>{t("shell.signOut")}</span>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          ) : (
            <div className="header-auth"><Link className="header-signin" href={loginHref}>{t("shell.signIn")}</Link><Link className="header-cta" href={loginHref}>{t("shell.getStarted")}{t("shell.free") && <em>{t("shell.free")}</em>}</Link></div>
          )}
        </div>
      </header>
      {children}
      {footer}
    </div>
    <Modal.Backdrop isOpen={logoutOpen} onOpenChange={(open) => { if (!open) setLogoutOpen(false); }}>
      <Modal.Container size="sm"><Modal.Dialog className="logout-dialog"><Modal.CloseTrigger aria-label={t("shell.cancel")} /><Modal.Body><Modal.Heading>{t("shell.logoutTitle")}</Modal.Heading><p>{t("shell.logoutBody")}</p><div className="logout-actions"><Button variant="danger" onPress={logout} className="rounded-xl">{t("shell.signOut")} <LogoutIcon /></Button><Button className="rounded-xl" variant="outline" slot="close">{t("shell.cancel")}</Button></div></Modal.Body></Modal.Dialog></Modal.Container>
    </Modal.Backdrop>
  </div>;
}
