"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@heroui/react";
import { ArrowIcon, GridIcon, SparkIcon } from "@/components/ui";
import { useI18n } from "@/i18n/provider";
import { BRAND_NAME } from "@/lib/brand";

const inspiration = [
  { id: "dunes", category: "landscape", height: 340, prompt: "Sculptural terracotta desert formations beneath a pale blue sky, warm afternoon light, minimalist cinematic landscape photography." },
  { id: "portrait", category: "portrait", height: 270, prompt: "An intimate editorial portrait in soft blue studio light, warm skin tones, shallow depth of field, fine film grain." },
  { id: "architecture", category: "architecture", height: 290, prompt: "A serene contemporary living space, natural linen, sculptural furniture, sunlit neutral tones, architectural photography." },
  { id: "mountain", category: "landscape", height: 330, prompt: "A dramatic alpine mountain peak rising into clouds, rugged rock textures, cool blue shadows, epic adventure photography." },
  { id: "flowers", category: "nature", height: 360, prompt: "Delicate wildflowers against a blue sky, dreamy botanical photography, diffused morning light, poetic atmosphere." },
  { id: "coast", category: "landscape", height: 270, prompt: "Endless turquoise ocean waves, misty horizon, textured water, dreamy coastal landscape, cinematic color grading." },
  { id: "forest", category: "nature", height: 315, prompt: "Sunlight filtering through an ancient woodland, towering trees, emerald green moss, atmospheric forest photography." },
];

const categories = ["all", "landscape", "portrait", "architecture", "nature"];

export default function InspirationGallery({ onChoose }) {
  const { t } = useI18n();
  const [category, setCategory] = useState("all");
  const filtered = inspiration.filter((item) => category === "all" || item.category === category);
  const categoryLabel = (value) => value === "all" ? t("inspiration.all") : t(`inspiration.categories.${value}`);

  return <section className="inspiration-section" aria-labelledby="inspiration-title">
    <div className="inspiration-heading"><div><span className="section-label">{t("inspiration.section")}</span><h2 id="inspiration-title">{t("inspiration.title")}</h2></div><span className="gallery-caption">{t("inspiration.caption")} <SparkIcon /></span></div>
    <div className="inspiration-toolbar"><div className="inspiration-filters">{categories.map((item) => <Button key={item} variant="ghost" aria-pressed={category === item} className={category === item ? "selected" : ""} onPress={() => setCategory(item)}>{item === "all" && <GridIcon />}{categoryLabel(item)}</Button>)}</div><span>{t("inspiration.count", { count: filtered.length })}</span></div>
    <div className="inspiration-masonry">{filtered.map((item, index) => {
      const title = t(`inspiration.items.${item.id}`);
      return <button key={item.id} className="inspiration-tile" style={{ "--tile-height": `${item.height}px` }} onClick={() => onChoose(item.prompt)} aria-label={t("inspiration.usePromptLabel", { title })}><Image src={`/gallery/${item.id}.jpg`} alt={title} fill sizes="(max-width: 620px) 45vw, (max-width: 1100px) 28vw, 22vw" priority={index < 4} /><span className="tile-arrow"><ArrowIcon /></span><span className="tile-caption"><span>{categoryLabel(item.category)}</span><strong>{title}</strong><span className="tile-action">{t("inspiration.usePrompt")} <ArrowIcon /></span></span></button>;
    })}</div>
    <footer className="studio-footer"><span><strong>{BRAND_NAME}</strong> {t("inspiration.footer")}</span><span>{t("inspiration.credit")}</span></footer>
  </section>;
}
