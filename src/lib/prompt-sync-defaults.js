export const PROMPT_SYNC_DEFAULTS = [
  {
    id: "gpt_image",
    name: "GPT Image",
    query: '("prompt" OR "prompt:") ("GPT Image" OR "GPT Image 2" OR "gpt-image-1") filter:images',
    enabled: true,
  },
  {
    id: "nano_banana",
    name: "Nano Banana",
    query: '("prompt" OR "prompt:") ("Nano Banana" OR "Nano Banana Pro") filter:images',
    enabled: true,
  },
  {
    id: "flux",
    name: "FLUX",
    query: '("prompt" OR "prompt:") (Flux OR "Flux.2") filter:images',
    enabled: false,
  },
  {
    id: "seedream",
    name: "Seedream",
    query: '("prompt" OR "prompt:") (Seedream OR "Seedream 5") filter:images',
    enabled: false,
  },
  {
    id: "qwen",
    name: "Qwen",
    query: '("prompt" OR "prompt:") (Qwen OR "Qwen Image") filter:images',
    enabled: false,
  },
  {
    id: "grok_imagine",
    name: "Grok Imagine",
    query: '("prompt" OR "prompt:") ("Grok Imagine" OR "Grok Image") filter:images',
    enabled: true,
  },
];

export const PROMPT_SYNC_DEFAULTS_BY_ID = new Map(
  PROMPT_SYNC_DEFAULTS.map((source) => [source.id, source])
);
