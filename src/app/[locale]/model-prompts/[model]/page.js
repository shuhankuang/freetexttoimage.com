import { notFound } from "next/navigation";
import ServerAppShell from "@/components/server-app-shell";
import Hero from "@/components/blocks/hero";
import ModelPromptGallery from "@/components/model-prompt-gallery";
import { getDictionary } from "@/i18n/dictionaries";
import { getModelPromptItems } from "@/lib/model-prompt-data";
import { getModelPromptPage, MODEL_PROMPT_PAGES } from "@/lib/model-prompt-pages";
import { buildPrivateMetadata } from "@/lib/metadata";

export function generateStaticParams() {
  return MODEL_PROMPT_PAGES.map(({ slug }) => ({ model: slug }));
}

export async function generateMetadata({ params }) {
  const { locale, model: slug } = await params;
  const model = getModelPromptPage(slug);
  if (!model) return {};
  const messages = await getDictionary(locale);
  const name = messages.modelPrompts.models[model.key];
  return buildPrivateMetadata({
    title: messages.modelPrompts.metaTitle.replace("{model}", name),
    description: messages.modelPrompts.description.replace("{model}", name),
    follow: true,
  });
}

export default async function ModelPromptPage({ params }) {
  const { locale, model: slug } = await params;
  const model = getModelPromptPage(slug);
  if (!model) notFound();
  const messages = await getDictionary(locale);
  const copy = messages.modelPrompts;
  const name = copy.models[model.key];
  const activePath = `/model-prompts/${model.slug}`;
  const items = await getModelPromptItems(model);

  return <ServerAppShell activePath={activePath} publicView locale={locale}>
    <main className="workspace-page model-prompts-page">
      <Hero
        headingLevel="h1"
        className="section-heading model-prompts-heading"
        label={copy.section}
        title={copy.pageTitle.replace("{model}", name)}
        subtitle={copy.description.replace("{model}", name)}
      />
      {items.length > 0
        ? <ModelPromptGallery items={items} copy={copy.gallery} />
        : <div className="explore-section-empty">{copy.developing}</div>}
    </main>
  </ServerAppShell>;
}
