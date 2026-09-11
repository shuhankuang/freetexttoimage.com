export const MODEL_PROMPT_PAGES = [
  { slug: "gpt-image-2-5", key: "gptImage25", dataFile: "img-20260911-GPT2.5-86-items.json", icon: "/icons/openai.png" },
  { slug: "nano-banana-pro", key: "nanoBananaPro" },
  { slug: "nano-banana-2", key: "nanoBanana2" },
];

export function getModelPromptPage(slug) {
  return MODEL_PROMPT_PAGES.find((model) => model.slug === slug);
}
