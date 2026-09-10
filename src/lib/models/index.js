// 模型 provider 注册表 —— 加模型的唯一入口。
// 所有 provider 都实现同一接口：
//   { id, label, promptMax, aspectRatios,
//     async createTask(input) => externalTaskId,        // 提交异步任务
//     async getTask(externalTaskId) => { status, resultUrls, error } }  // 查询状态
//
// 以后再接新模型：新建一个 xxx.js 实现该接口，再在下面对应的 map 里加一行即可。
// /studio 的下拉、输入框长度、比例选项都会自动跟随（走 listProviders()）。
import {
  kieFlux2Pro,
  kieGptImage25,
  kieGrokImagine,
  kieNanoBananaPro,
  kieNanoBanana2,
  kieSeedream45,
  kieWanImage,
  kieZImage,
} from "./kie.js";

const providers = {
  "z-image": kieZImage,
  "wan/2-7-image": kieWanImage,
  "gpt-image-2-5-flare-text-to-image": kieGptImage25,
  "grok-imagine/text-to-image": kieGrokImagine,
  "nano-banana-2": kieNanoBanana2,
  "flux-2/pro-text-to-image": kieFlux2Pro,
  "nano-banana-pro": kieNanoBananaPro,
  "seedream/4.5-text-to-image": kieSeedream45,
};

// 默认模型：Z-Image（更快更省）。想换默认就改这里。
export const DEFAULT_MODEL = "z-image";

// provider 未声明时的兜底比例（前端极少用，仅防御）。
const FALLBACK_ASPECT_RATIOS = ["1:1", "4:3", "3:4", "16:9", "9:16"];

export function getProvider(model) {
  const provider = providers[model || DEFAULT_MODEL];
  if (!provider) {
    const error = new Error(`Unknown model provider: ${model}`);
    error.code = "INVALID_MODEL";
    throw error;
  }
  return provider;
}

// 返回可序列化的模型清单，供 /studio 渲染生成器控件。
export function listProviders() {
  return Object.values(providers).map(({ id, label, icon, promptMax, aspectRatios, qualityLabel, creditCost }) => ({
    id,
    label,
    icon,
    promptMax: promptMax || 2000,
    aspectRatios: aspectRatios?.length ? aspectRatios : FALLBACK_ASPECT_RATIOS,
    qualityLabel: qualityLabel || "Standard",
    creditCost: creditCost || 1,
  }));
}
