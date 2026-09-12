export const MODEL_PROMPT_PAGES = [
  {
    slug: "gpt-image",
    key: "gptImage",
    label: "GPT Image",
    icon: "/icons/openai.png",
    sourceModels: [
      { key: "gpt-image-2-5", label: "GPT Image 2.5", aliases: ["ChatGPT Image 2.5", "GPT Image 2.5"] },
      { key: "gpt-image-2", label: "GPT Image 2", aliases: ["ChatGPT Image 2", "GPT Image 2"] },
    ],
  },
  {
    slug: "nano-banana",
    key: "nanoBanana",
    label: "Nano Banana",
    icon: "/icons/google-color.png",
    sourceModels: [
      { key: "nano-banana-2", label: "Nano Banana 2", aliases: ["Nano Banana 2"] },
      { key: "nano-banana-pro", label: "Nano Banana Pro", aliases: ["Nano Banana Pro", "Nano-Banana", "Nano-Banana-Pro"] },
    ],
  },
];

export function getModelPromptPage(slug) {
  return MODEL_PROMPT_PAGES.find((model) => model.slug === slug);
}

export function resolveModelPromptPage(label) {
  const normalized = String(label || "").trim().toLowerCase();
  for (const page of MODEL_PROMPT_PAGES) {
    const source = page.sourceModels.find((model) => model.aliases.some((alias) => alias.toLowerCase() === normalized));
    if (source) return { ...page, sourceKey: source.key, sourceLabel: source.label };
  }
  return undefined;
}
