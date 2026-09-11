import "server-only";

import Hero from "@/components/blocks/hero";
import ImagePromptExamplesGallery from "@/components/image-prompt-examples-gallery";

const EXAMPLE_IMAGES = [
  "/gallery/examples/01-futuristic-anime-character.webp",
  "/gallery/examples/02-luxury-product-photography.webp",
  "/gallery/examples/03-modern-interior.webp",
  "/gallery/examples/04-floating-fantasy-city.webp",
];

export default function ImagePromptExamples({ copy }) {
  return <section className="image-prompt-examples" aria-labelledby="image-prompt-examples-title">
    <Hero
      headingId="image-prompt-examples-title"
      className="section-heading image-prompt-examples-heading"
      label={copy.section}
      title={copy.title}
      accent={copy.titleAccent}
      subtitle={copy.count}
    />
    <ImagePromptExamplesGallery
      copy={copy}
      items={copy.items.map((item, index) => ({ ...item, src: EXAMPLE_IMAGES[index] }))}
    />
  </section>;
}
