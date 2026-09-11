import "server-only";
import Link from "next/link";
import { Logo } from "@/components/ui";
import { localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function AppFooter({ locale }) {
  const messages = await getDictionary(locale);
  const path = (pathname) => localePath(locale, pathname);

  return <footer className="app-footer">
    <span className="footer-brand"><Logo href={path("/")} label={messages.shell.homeLabel} /><span>{messages.inspiration.footer}</span></span>
    <nav aria-label={messages.legal.navigation}>
      <Link href={path("/pricing")}>{messages.shell.pricing}</Link>
      <Link href={path("/terms")}>{messages.legal.terms}</Link>
      <Link href={path("/privacy")}>{messages.legal.privacy}</Link>
    </nav>
  </footer>;
}
