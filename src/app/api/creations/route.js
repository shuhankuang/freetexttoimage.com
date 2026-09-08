import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { listCreations } from "@/lib/creations";
import { createJob } from "@/lib/generation";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user || null;
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(listCreations(user.id));
}

// 提交一次真实生成：调模型服务拿任务 → 落一条 status=processing 的 creation + job，
// 返回给前端，前端再轮询 GET /api/creations/[id] 直到 succeeded/failed。
export async function POST(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = typeof body?.prompt === "string" ? body.prompt.trim().slice(0, 2000) : "";
  if (!prompt) return NextResponse.json({ error: "prompt is required" }, { status: 400 });

  try {
    const creation = await createJob(user, {
      prompt,
      style: body?.style || null,
      ratio: body?.ratio || null,
      model: body?.model || undefined,
    });
    return NextResponse.json(creation, { status: 201 });
  } catch (err) {
    // 缺配置（KIE_API_KEY / S3_*）→ 503；模型服务侧失败 → 502
    const status = err?.code === "CONFIG" ? 503 : 502;
    return NextResponse.json(
      { error: err?.message || "Generation service is unavailable. Please try again." },
      { status }
    );
  }
}
