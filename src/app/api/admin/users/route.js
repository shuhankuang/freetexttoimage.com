import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listUsersPage } from "@/lib/admin-users";

export const runtime = "nodejs";

export async function GET(request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit");
  const cursor = searchParams.get("cursor");
  const search = searchParams.get("search") || "";
  const paidOnly = searchParams.get("paid") === "1";

  try {
    const page = await listUsersPage({ limit, cursor, search, paidOnly });
    return NextResponse.json(page);
  } catch (error) {
    if (error?.code === "INVALID_CURSOR") return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
