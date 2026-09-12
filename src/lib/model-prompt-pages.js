export const MODEL_PROMPT_PAGES = [
  { slug: "gpt-image-2-5", key: "gptImage25", labels: ["ChatGPT Image 2.5", "GPT Image 2.5"], dataFile: "img-20260911-GPT2.5-86-items.json", icon: "/icons/openai.png" },
  { slug: "nano-banana-pro", key: "nanoBananaPro", labels: ["Nano Banana Pro"], icon: "/icons/google.png" },
  { slug: "nano-banana-2", key: "nanoBanana2", labels: ["Nano Banana 2"], icon: "/icons/google.png" },
];

export function getModelPromptPage(slug) {
  return MODEL_PROMPT_PAGES.find((model) => model.slug === slug);
}

export function resolveModelPromptPage(label) {
  const normalized = String(label || "").trim().toLowerCase();
  return MODEL_PROMPT_PAGES.find((model) => model.labels.some((item) => item.toLowerCase() === normalized));
}
