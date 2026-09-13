import "server-only";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Logo } from "@/components/ui";
import { localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function AppFooter({ locale }) {
  const messages = await getDictionary(locale);
  const path = (pathname) => localePath(locale, pathname);
  const copy = messages.footer;
  const groups = [
    {
      title: copy.tools,
      label: copy.toolsNavigation,
      links: [
        { href: path("/"), label: copy.textToImage },
        { href: path("/image-to-prompt"), label: copy.imageToPrompt },
      ],
    },
    {
      title: copy.product,
      label: copy.productNavigation,
      links: [{ href: path("/pricing"), label: messages.shell.pricing }],
    },
    {
      title: copy.legal,
      label: messages.legal.navigation,
      links: [
        { href: path("/terms"), label: messages.legal.terms },
        { href: path("/privacy"), label: messages.legal.privacy },
      ],
    },
  ];

  return <footer className="app-footer">
    <div className="footer-inner">
      <div className="footer-brand">
        <Logo href={path("/")} label={messages.shell.homeLabel} />
        <p>{copy.tagline}</p>
        <Link className="footer-email" href="mailto:hi@freetexttoimage.com">
          <Mail aria-hidden="true" size={15} strokeWidth={1.8} />
          <span>hi@freetexttoimage.com</span>
        </Link>
        <small>{copy.copyright.replace("{year}", String(new Date().getFullYear()))}</small>
      </div>
      <div className="footer-columns">
        {groups.map((group) => <section className="footer-column" key={group.title}>
          <strong>{group.title}</strong>
          <nav aria-label={group.label}>
            {group.links.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
          </nav>
        </section>)}
      </div>
    </div>
  </footer>;
}
