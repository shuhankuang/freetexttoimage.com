"use client";

import Image from "next/image";
import { ArrowIcon } from "@/components/ui";
import { useI18n } from "@/i18n/provider";

const inspiration = [
  { id: "anime", category: "anime", ratio: "4 / 5", src: "/gallery/examples/01-futuristic-anime-character.webp", alt: "AI-generated anime character in a futuristic city", prompt: "A young space explorer standing in a futuristic city at sunset, detailed anime illustration, glowing signs, cinematic lighting, expressive character design." },
  { id: "product", category: "product", ratio: "1 / 1", src: "/gallery/examples/02-luxury-product-photography.webp", alt: "AI-generated luxury perfume product photography", prompt: "A luxury perfume bottle on polished black stone, dramatic studio lighting, soft reflections, dark elegant background, premium commercial product photography." },
  { id: "interior", category: "interior", ratio: "16 / 9", src: "/gallery/examples/03-modern-interior.webp", alt: "AI-generated minimalist modern living room interior", prompt: "A warm minimalist living room with floor-to-ceiling windows, natural wood furniture, soft morning sunlight, neutral colors, modern architecture, realistic interior photography." },
  { id: "fantasy", category: "fantasy", ratio: "16 / 9", src: "/gallery/examples/04-floating-fantasy-city.webp", alt: "AI-generated fantasy floating city above the clouds", prompt: "An ancient floating city above the clouds, giant waterfalls falling into the sky, golden sunset, dramatic atmosphere, epic fantasy concept art, highly detailed." },
  { id: "food", category: "food", ratio: "4 / 5", src: "/gallery/examples/05-editorial-food-photography.webp", alt: "AI-generated strawberry cake food photography", prompt: "A strawberry cake on a handmade ceramic plate inside a quiet Japanese cafe, soft window light, natural shadows, shallow depth of field, editorial food photography." },
  { id: "poster", category: "poster", ratio: "4 / 5", src: "/gallery/examples/06-futuristic-music-poster.webp", alt: "AI-generated futuristic music festival poster design", prompt: "A futuristic electronic music festival poster, bold geometric typography, abstract glowing shapes, dark atmospheric background, modern editorial graphic design." },
  { id: "trending", category: "trending", ratio: "4 / 5", src: "/gallery/examples/07-trending-visual.webp", alt: "AI-generated festive European street at Christmas", prompt: "A charming European street at Christmas, warm shop windows, festive wreaths and string lights, softly falling snow, reflections on wet cobblestones, people strolling through the market, cozy cinematic atmosphere, highly detailed." },
];

export default function InspirationGallery({ onChoose }) {
  const { locale, t } = useI18n();

  // 新版图库文案确认后再同步日语；旧图库不再作为回退。
  if (locale !== "en") return null;

  return <section className="inspiration-section" aria-labelledby="inspiration-title">
    <header className="inspiration-heading inspiration-heading--hero"><span className="section-label">{t("inspiration.section")}</span><h2 id="inspiration-title">{t("inspiration.title")}</h2></header>
    <div className="inspiration-masonry">{inspiration.map((item, index) => {
      const title = t(`inspiration.items.${item.id}`);
      return <button key={item.id} className="inspiration-tile ratio-tile" style={{ "--tile-ratio": item.ratio }} onClick={() => onChoose(item.prompt)} aria-label={t("inspiration.usePromptLabel", { title })}><Image src={item.src} alt={item.alt} fill sizes="(max-width: 620px) 45vw, (max-width: 1100px) 28vw, 30vw" priority={index < 4} /><span className="tile-arrow"><ArrowIcon /></span><span className="tile-caption"><span>{t(`inspiration.categories.${item.category}`)}</span><strong>{title}</strong><span className="tile-action">{t("inspiration.usePrompt")} <ArrowIcon /></span></span></button>;
    })}</div>
  </section>;
}
