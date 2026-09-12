import { NextResponse } from "next/server";
import { getModelPromptPage } from "@/lib/model-prompt-pages";
import { listModelPromptItems } from "@/lib/model-prompt-data";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const model = searchParams.get("model") || "";
  if (!getModelPromptPage(model)) return NextResponse.json({ error: "Unknown model" }, { status: 400 });
  try {
    const result = await listModelPromptItems(model, { cursor: searchParams.get("cursor") || undefined });
    return NextResponse.json(result, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600" } });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid cursor") return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
