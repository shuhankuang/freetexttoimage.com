import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { listCreationsPage } from "@/lib/creations";
import { createJob } from "@/lib/generation";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user || null;
}

export async function GET(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  try {
    return NextResponse.json(await listCreationsPage(user.id, {
      limit: searchParams.get("limit"),
      cursor: searchParams.get("cursor"),
    }));
  } catch (error) {
    if (error?.code === "INVALID_CURSOR") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
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

  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
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
    // 积分不足 → 402；缺配置（KIE_API_KEY / S3_*）→ 503；模型服务侧失败 → 502
    if (err?.code === "INVALID_INPUT" || err?.code === "INVALID_MODEL") {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    if (err?.code === "INSUFFICIENT_CREDITS") {
      return NextResponse.json(
        { error: err.message, code: "INSUFFICIENT_CREDITS", cost: err.cost, balance: err.balance },
        { status: 402 }
      );
    }
    const status = err?.code === "CONFIG" || err?.code === "KIE_CONFIG" ? 503 : 502;
    return NextResponse.json(
      { error: err?.message || "Generation service is unavailable. Please try again." },
      { status }
    );
  }
}
