import "server-only";
import Image from "next/image";
import Hero from "@/components/blocks/hero";
import ModelShowcaseButton from "@/components/model-showcase-button";
import { getDictionary } from "@/i18n/dictionaries";
import { listProviders } from "@/lib/models";

const MODEL_FAMILIES = [
  { id: "openai", provider: "OpenAI", icon: "/icons/openai.png", preview: "/model-images/openai.webp", models: ["GPT Image 2.5"] },
  { id: "google", provider: "Google", icon: "/icons/google-color.png", preview: "/model-images/google.webp", models: ["Nano Banana 2", "Nano Banana Pro"] },
  { id: "bfl", provider: "Black Forest Labs", icon: "/icons/bfl.png", preview: "/model-images/bfl.webp", models: ["FLUX.2 Pro"] },
  { id: "bytedance", provider: "ByteDance", icon: "/icons/bytedance-color.png", preview: "/model-images/bytedance.webp", models: ["Seedream 4.5"] },
  { id: "qwen", provider: "Qwen", icon: "/icons/qwen-color.png", preview: "/model-images/qwen.webp", models: ["Z-Image", "Wan 2.7 Image"] },
  { id: "grok", provider: "Grok", icon: "/icons/grok.png", preview: "/model-images/grok.webp", models: ["Grok Imagine"] },
];

export default async function ImageModelShowcase({ locale }) {
  const messages = await getDictionary(locale);
  const modelIds = new Map(listProviders().map((model) => [model.label, model.id]));

  return <section className="model-showcase" aria-labelledby="model-showcase-title">
    <Hero headingId="model-showcase-title" className="section-heading model-showcase-heading" label={messages.modelShowcase.section} title={messages.modelShowcase.title} accent={messages.modelShowcase.titleAccent} subtitle={messages.modelShowcase.subtitle} />
    <ol className="model-showcase-grid">
      {MODEL_FAMILIES.map((family, index) => <li className="model-family" key={family.provider}>
        <span className="model-family-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <span className="model-family-preview"><Image src={family.preview} alt="" fill sizes="84px" /></span>
        <header className="model-family-heading">
          <Image src={family.icon} alt="" width={40} height={40} sizes="40px" />
          <strong style={{ fontSize: "0.85em" }}>{family.provider}</strong>
        </header>
        <p className="model-family-description">{messages.modelShowcase.descriptions[family.id]}</p>
        <div className="model-family-list">
          {family.models.map((model) => <ModelShowcaseButton key={model} modelId={modelIds.get(model)}>{model}</ModelShowcaseButton>)}
        </div>
      </li>)}
    </ol>
  </section>;
}
