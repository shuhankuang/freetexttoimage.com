// KIE 图像生成 provider 族（同一 HTTP 管道，按模型配置入参与前端能力声明）。
// 通用异步任务模型：
//   createTask → 拿 taskId（可注册 KIE 主动回调 callBackUrl）
//   轮询 getTask → GET recordInfo?taskId=…（回调丢失 / 本地开发时的兜底）
// 文档: https://docs.kie.ai ｜ 已核实字段见项目记忆 kie-api-interface。
//
// 每个 KIE 模型 = 这里一次 makeKieProvider(...) 调用，字段即“配置文件”：
//   fixedInput   生成时固定传给模型的 input 参数（服务端写死，不开放给用户选）
//   nsfw         是否开启 nsfw_checker（安全过滤）——故意不放前端，只在此处控制
//   promptMax    该模型 prompt 上限 → 前端输入框 maxLength 跟着走
//   aspectRatios 该模型支持的比例枚举 → 前端下拉选项跟着走（切模型自动复位）
const BASE = process.env.KIE_BASE || "https://api.kie.ai";

function key() {
  const k = process.env.KIE_API_KEY;
  if (!k) {
    const err = new Error("KIE_API_KEY is not set. Add it to .env.local to enable real image generation.");
    err.code = "KIE_CONFIG";
    throw err;
  }
  return k;
}

async function request(path, init = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${key()}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });
  } catch (err) {
    // 网络层失败：抛给上层按“瞬时错误”退避重试
    const wrapped = new Error(`KIE request failed (network): ${err?.message || err}`);
    wrapped.transient = true;
    throw wrapped;
  }
  let body = null;
  try { body = await res.json(); } catch { /* 非 JSON 响应，按 res.ok 兜底 */ }
  if (!res.ok) {
    const err = new Error(
      `KIE request failed (${res.status}): ${body?.msg || body?.message || res.statusText}`
    );
    err.transient = res.status >= 500; // 5xx 瞬时，4xx 多半是参数/鉴权问题，别反复重试
    throw err;
  }
  return body;
}

// resultJson 可能是「对象」也可能是「JSON 字符串」——两种都容
function extractResultUrls(resultJson) {
  let urls = [];
  if (!resultJson) return urls;
  let parsed = resultJson;
  if (typeof resultJson === "string") {
    try { parsed = JSON.parse(resultJson); } catch { return urls; }
  }
  if (Array.isArray(parsed)) urls = parsed;
  else if (parsed && Array.isArray(parsed.resultUrls)) urls = parsed.resultUrls;
  else if (parsed && Array.isArray(parsed.urls)) urls = parsed.urls;
  return urls.filter((u) => typeof u === "string" && u.length > 0);
}

// 工厂：共享 createTask/getTask 管道；每模型声明自己的 input 与 UI 能力。
function makeKieProvider({ id, label, fixedInput = {}, nsfw = false, promptMax, aspectRatios, creditCost = 1 }) {
  return {
    id,
    label,
    // —— 前端会用到的能力元数据（listProviders 透传给 /studio）——
    promptMax,
    aspectRatios,
    creditCost, // 生成成功扣多少积分，createJob（generation.js）用它去扣款

    async createTask({ prompt, aspectRatio, callBackUrl }) {
      const body = await request("/api/v1/jobs/createTask", {
        method: "POST",
        body: JSON.stringify({
          model: id,
          ...(callBackUrl ? { callBackUrl } : {}),
          input: {
            prompt,
            aspect_ratio: aspectRatio || "1:1",
            ...(nsfw ? { nsfw_checker: true } : {}),
            ...fixedInput,
          },
        }),
      });
      const taskId = body?.data?.taskId || body?.taskId;
      if (!taskId) {
        const err = new Error("KIE did not return a taskId.");
        err.code = "KIE_NO_TASK";
        throw err;
      }
      return taskId;
    },

    // 查询任务状态 → 统一形态 { status: processing|succeeded|failed, resultUrls, error }
    async getTask(externalTaskId) {
      const body = await request(`/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(externalTaskId)}`);
      const data = body?.data || {};
      const state = data?.state;
      if (state === "success") {
        return { status: "succeeded", resultUrls: extractResultUrls(data?.resultJson) };
      }
      if (state === "fail") {
        return { status: "failed", resultUrls: [], error: data?.failMsg || "The image generation failed." };
      }
      // waiting / queuing / generating（以及任何未知状态）一律视为仍在处理，不轻易判死
      return { status: "processing", resultUrls: [], error: null };
    },
  };
}

// —— 各模型（id 即 KIE createTask 的 model 字段）——

export const kieZImage = makeKieProvider({
  id: "z-image",
  label: "Z-Image",
  // 官方参数：prompt ≤1000；aspect_ratio ∈ [1:1,4:3,3:4,16:9,9:16]；nsfw_checker 可选。
  // nsfw_checker：安全内容过滤。官方默认关。我们是公众产品，建议开；要开改 nsfw: true。
  nsfw: false,
  promptMax: 1000,
  aspectRatios: ["1:1", "4:3", "3:4", "16:9", "9:16"],
  creditCost: 1,
});

export const kieWanImage = makeKieProvider({
  id: "wan/2-7-image",
  label: "Wan 2.7 Image",
  fixedInput: {
    resolution: "2K",
    n: 1,
    watermark: false,
    seed: 0,
  },
  promptMax: 2000,
  aspectRatios: ["1:1", "4:3", "16:9", "9:16"],
  creditCost: 4,
});
