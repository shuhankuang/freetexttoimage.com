import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { listGenerationUsage } from "@/lib/account-usage";

export async function GET(request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  try {
    return NextResponse.json(await listGenerationUsage(session.user.id, {
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
