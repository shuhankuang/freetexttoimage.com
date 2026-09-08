"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@heroui/react";
import { ArrowIcon, GridIcon, SparkIcon } from "@/components/ui";

const inspiration = [
  { id: "dunes", title: "Where silence takes shape", category: "Landscape", height: 340, prompt: "Sculptural terracotta desert formations beneath a pale blue sky, warm afternoon light, minimalist cinematic landscape photography." },
  { id: "portrait", title: "A moment, a thousand stories", category: "Portrait", height: 270, prompt: "An intimate editorial portrait in soft blue studio light, warm skin tones, shallow depth of field, fine film grain." },
  { id: "architecture", title: "Room to dream", category: "Architecture", height: 290, prompt: "A serene contemporary living space, natural linen, sculptural furniture, sunlit neutral tones, architectural photography." },
  { id: "mountain", title: "Above it all", category: "Landscape", height: 330, prompt: "A dramatic alpine mountain peak rising into clouds, rugged rock textures, cool blue shadows, epic adventure photography." },
  { id: "flowers", title: "A little wild, a little wonderful", category: "Nature", height: 360, prompt: "Delicate wildflowers against a blue sky, dreamy botanical photography, diffused morning light, poetic atmosphere." },
  { id: "coast", title: "Somewhere beyond the blue", category: "Landscape", height: 270, prompt: "Endless turquoise ocean waves, misty horizon, textured water, dreamy coastal landscape, cinematic color grading." },
  { id: "forest", title: "Into the quiet", category: "Nature", height: 315, prompt: "Sunlight filtering through an ancient woodland, towering trees, emerald green moss, atmospheric forest photography." },
];

export default function InspirationGallery({ onChoose }) {
  const [category, setCategory] = useState("All inspiration");
  const filtered = inspiration.filter(item => category === "All inspiration" || item.category === category);
  return <section className="inspiration-section" aria-labelledby="inspiration-title">
    <div className="inspiration-heading"><div><span className="section-label">THE START OF SOMETHING GOOD</span><h2 id="inspiration-title">A spark for your next idea.</h2></div><span className="gallery-caption">Curated visual inspiration <SparkIcon /></span></div>
    <div className="inspiration-toolbar"><div className="inspiration-filters">{["All inspiration", "Landscape", "Portrait", "Architecture", "Nature"].map(item => <Button key={item} variant="ghost" aria-pressed={category === item} className={category === item ? "selected" : ""} onPress={() => setCategory(item)}>{item === "All inspiration" && <GridIcon />}{item}</Button>)}</div><span>{filtered.length} inspirations</span></div>
    <div className="inspiration-masonry">{filtered.map((item, index) => <button key={item.id} className="inspiration-tile" style={{ "--tile-height": `${item.height}px` }} onClick={() => onChoose(item.prompt)} aria-label={`Use prompt: ${item.title}`}><Image src={`/gallery/${item.id}.jpg`} alt={item.title} fill sizes="(max-width: 620px) 45vw, (max-width: 1100px) 28vw, 22vw" priority={index < 4} /><span className="tile-arrow"><ArrowIcon /></span><span className="tile-caption"><span>{item.category}</span><strong>{item.title}</strong><span className="tile-action">Use this prompt <ArrowIcon /></span></span></button>)}</div>
    <footer className="studio-footer"><span><strong>forma.</strong> A little imagination goes a long way.</span><span>Inspiration photography via Unsplash</span></footer>
  </section>;
}
