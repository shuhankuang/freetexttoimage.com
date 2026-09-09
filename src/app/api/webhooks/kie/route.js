import { NextResponse } from "next/server";
import { handleCallback } from "@/lib/generation";

// KIE 完成回调（快通道）。KIE 在任务结束时 POST 到 createTask 提交的 callBackUrl。
// 容错原则：坏 body / 未知 taskId / 已终态任务回 200；下载或落盘失败回 503，让 KIE 重试；
// 落盘逻辑全部收敛在 handleCallback → finalize（幂等），与轮询兜底不双写。
export async function POST(request) {
  let payload = {};
  try {
    payload = await request.json();
  } catch {
    // 坏 body：忽略，回 200
  }

  try {
    const result = await handleCallback(payload);
    if (result.reason === "retryable-error") {
      return NextResponse.json({ ok: false, ...result }, { status: 503 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[webhook/kie] error:", err?.message || err);
    return NextResponse.json({ ok: false, reason: "retryable-error" }, { status: 503 });
  }
}
