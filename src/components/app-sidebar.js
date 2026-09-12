import "server-only";

import Link from "next/link";
import { getDictionary } from "@/i18n/dictionaries";
import { localePath } from "@/i18n/config";
import { MODEL_PROMPT_PAGES } from "@/lib/model-prompt-pages";
import { getModelPromptCount } from "@/lib/model-prompt-data";
import {
  GemIcon, GridIcon, ImageIcon, ImagePromptIcon, Logo, ModelsIcon, PaletteIcon,
  PromptCardsIcon, SparklesIcon, TemplateIcon,
} from "@/components/ui";

const SHOW_EXPLORE_NAV = false;

export default async function AppSidebar({ activePath = "/", locale, showMyCreations = false }) {
  const messages = await getDictionary(locale);
  const copy = messages.shell;
  const path = (pathname) => localePath(locale, pathname);
  const activeClass = (pathname) => activePath === pathname ? "active" : undefined;
  const modelPromptCounts = await Promise.all(MODEL_PROMPT_PAGES.map((model) => getModelPromptCount(model)));

  return <aside className="app-sidebar">
    <Logo href={path("/")} label={copy.homeLabel} />
    <nav aria-label={copy.navigation}>
      <span className="sidebar-nav-label">{copy.workspace}</span>
      <div className="sidebar-nav-group">
        <Link className={activePath === "/" || activePath === "/studio" ? "active" : undefined} href={path("/")}><ImageIcon />{copy.create}</Link>
        <Link className={activeClass("/image-to-prompt")} href={path("/image-to-prompt")}><ImagePromptIcon />{copy.imageToPrompt}</Link>
        {showMyCreations && <Link className={activeClass("/creations")} href={path("/creations")}><GridIcon />{copy.creations}</Link>}
        <Link className={activeClass("/pricing")} href={path("/pricing")}><GemIcon />{copy.pricing}</Link>
      </div>

      <span className="sidebar-nav-label">{messages.modelPrompts.section}</span>
      <div className="sidebar-nav-group">
        {MODEL_PROMPT_PAGES.map((model, index) => {
          const href = `/prompts/${model.slug}`;
          return <Link className={activeClass(href)} href={path(href)} key={model.slug}>
            <PromptCardsIcon />
            {messages.modelPrompts.models[model.key]}
            <span className="sidebar-nav-badge">{modelPromptCounts[index]}</span>
          </Link>;
        })}
      </div>

      {SHOW_EXPLORE_NAV && <>
        <span className="sidebar-nav-label">{copy.explore}</span>
        <div className="sidebar-nav-group">
          <Link className={activeClass("/explore/models")} href={path("/explore/models")}><ModelsIcon />{copy.exploreModels}</Link>
          <Link className={activeClass("/explore/styles")} href={path("/explore/styles")}><PaletteIcon />{copy.exploreStyles}</Link>
          <Link className={activeClass("/explore/templates")} href={path("/explore/templates")}><TemplateIcon />{copy.exploreTemplates}</Link>
        </div>
      </>}
    </nav>
    <div className="sidebar-note">
      <span><SparklesIcon /></span>
      <div className="note-title">{copy.noteStart}<br /><em>{copy.noteEnd}</em></div>
      <p>{copy.noteBody.split("\n").map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</p>
      <Link href={path("/")}>{copy.backHome} <span>→</span></Link>
    </div>
  </aside>;
}
