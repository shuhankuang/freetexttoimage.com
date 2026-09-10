import "server-only";
import Image from "next/image";
import { getDictionary } from "@/i18n/dictionaries";

const MODEL_FAMILIES = [
  { provider: "Qwen", icon: "/icons/qwen-color.png", models: ["Z-Image", "Wan 2.7 Image"] },
  { provider: "Black Forest Labs", icon: "/icons/bfl.png", models: ["FLUX.2 Pro"] },
  { provider: "Google", icon: "/icons/google-color.png", models: ["Nano Banana 2", "Nano Banana Pro"] },
  { provider: "ByteDance", icon: "/icons/bytedance-color.png", models: ["Seedream 5.0 Lite", "Seedream 4.5"] },
  { provider: "OpenAI", icon: "/icons/openai.png", models: ["GPT Image 2", "GPT Image 1.5"] },
  { provider: "Grok", icon: "/icons/grok.png", models: ["Grok Imagine"] },
];

export default async function ImageModelShowcase({ locale }) {
  const messages = await getDictionary(locale);

  return <section className="model-showcase" aria-labelledby="model-showcase-title">
    <header className="model-showcase-heading">
      <span className="section-label">{messages.modelShowcase.section}</span>
      <h2 id="model-showcase-title">{messages.modelShowcase.title}</h2>
    </header>
    <ol className="model-showcase-grid">
      {MODEL_FAMILIES.map((family, index) => <li className="model-family" key={family.provider}>
        <span className="model-family-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <header className="model-family-heading">
          <Image src={family.icon} alt="" width={40} height={40} sizes="40px" />
          <strong>{family.provider}</strong>
        </header>
        <div className="model-family-list">
          {family.models.map((model) => <span key={model}>{model}</span>)}
        </div>
      </li>)}
    </ol>
  </section>;
}
