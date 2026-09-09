import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";

const sections = ["models", "templates", "styles"];

export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}

export async function generateMetadata({ params }) {
  const { locale, section } = await params;
  if (!sections.includes(section)) return {};
  const messages = await getDictionary(locale);
  return { title: `${messages.explore[section].title} — FreeTexttoImage` };
}

export default async function ExploreSectionPage({ params }) {
  const { locale, section } = await params;
  if (!sections.includes(section)) notFound();
  const messages = await getDictionary(locale);
  const copy = messages.explore[section];

  return <main className="workspace-page explore-section-page">
    <header className="page-title explore-section-heading">
      <div><span className="section-label">{messages.shell.explore}</span><h1>{copy.title}</h1><p>{copy.subtitle}</p></div>
    </header>
    <div className="explore-section-empty">{messages.explore.developing}</div>
  </main>;
}
