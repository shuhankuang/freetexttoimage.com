import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createPortalSession } from "@/lib/billing";

// Customer Portal 入口：管理订阅、降级、取消（账期末生效）全部在 Portal 里完成，我们只负责跳转。
export async function POST(request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const origin = process.env.APP_URL || new URL(request.url).origin;
  try {
    const portalSession = await createPortalSession({
      userId: session.user.id,
      returnUrl: `${origin}/pricing`,
    });
    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    const status = err?.code === "CONFIG" ? 503 : err?.code === "NO_CUSTOMER" ? 400 : 502;
    return NextResponse.json({ error: err?.message || "Couldn't open billing portal." }, { status });
  }
}
