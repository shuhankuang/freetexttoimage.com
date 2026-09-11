import Link from "next/link";
import AppFooter from "@/components/app-footer";
import LanguageSwitcher from "@/components/language-switcher";
import { Logo } from "@/components/ui";
import { legalContent } from "@/content/legal";
import { localePath } from "@/i18n/config";

export default function LegalPage({ locale, page }) {
  const content = legalContent[locale] || legalContent.en;
  const document = content[page];
  const path = (pathname) => localePath(locale, pathname);

  return (
    <div className="legal-page">
      <header className="legal-header">
        <Logo href={path("/")} label="FreeTexttoImage home" />
        <nav aria-label="Legal">
          <Link className={page === "terms" ? "active" : ""} href={path("/terms")}>{content.common.terms}</Link>
          <Link className={page === "privacy" ? "active" : ""} href={path("/privacy")}>{content.common.privacy}</Link>
          <LanguageSwitcher />
        </nav>
      </header>

      <main className="legal-main">
        <Link className="legal-back" href={path("/")}>← {content.common.back}</Link>
        <h1>{document.title}</h1>
        <p className="legal-intro">{document.intro}</p>
        <p className="legal-updated">{content.common.updated}</p>

        <div className="legal-document">
          {document.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
      </main>

      <AppFooter locale={locale} />
    </div>
  );
}
