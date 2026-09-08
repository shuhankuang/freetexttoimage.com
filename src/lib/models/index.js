// 模型 provider 注册表。
// 所有图像生成服务都实现同一接口：
//   { id, label,
//     async createTask(input) => externalTaskId,        // 提交异步任务
//     async getTask(externalTaskId) => { status, resultUrls, error } }  // 查询状态
// 以后再接新模型 = 新建一个 xxx.js 实现该接口，再在这里注册一行。
import { kieWanImage, kieZImage } from "./kie.js";

const providers = {
  "z-image": kieZImage,
  "wan/2-7-image": kieWanImage,
};

// 默认模型：Z-Image（更快更省）。
// 想换回 Wan 2.7 时把下面改成 "wan/2-7-image" 即可，或让前端可选。
export const DEFAULT_MODEL = "z-image";

export function getProvider(model) {
  const provider = providers[model || DEFAULT_MODEL];
  if (!provider) throw new Error(`Unknown model provider: ${model}`);
  return provider;
}

export function listProviders() {
  return Object.values(providers).map(({ id, label }) => ({ id, label }));
}
