import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request) {
  const secret = process.env.PROMPT_IMPORT_WORKER_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  revalidateTag("prompt-gallery", { expire: 0 });
  return NextResponse.json({ revalidated: true });
}
