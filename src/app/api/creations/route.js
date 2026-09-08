import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createCreation, listCreations } from "@/lib/creations";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user || null;
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(listCreations(user.id));
}

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

  const creation = createCreation(user.id, {
    id: body.id || crypto.randomUUID(),
    title: body.title || prompt.split(/\s+/).slice(0, 5).join(" "),
    prompt,
    style: body.style || null,
    ratio: body.ratio || null,
    image: body.image || null,
    createdAt: body.createdAt || new Date().toISOString(),
  });

  return NextResponse.json(creation, { status: 201 });
}
