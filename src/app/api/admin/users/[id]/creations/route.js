import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listCreationsPage } from "@/lib/creations";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  try {
    const page = await listCreationsPage(id, {
      limit: searchParams.get("limit"),
      cursor: searchParams.get("cursor"),
    });
    return NextResponse.json(page);
  } catch (error) {
    if (error?.code === "INVALID_CURSOR") return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
