import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { uploadReferenceImage } from "@/lib/reference-images";
import { getProvider } from "@/lib/models";

export const runtime = "nodejs";

export async function POST(request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData;
  try { formData = await request.formData(); }
  catch { return NextResponse.json({ error: "Invalid upload." }, { status: 400 }); }

  try {
    const provider = getProvider(formData.get("model"));
    if (!provider.referenceImageLimit) {
      return NextResponse.json({ error: "This model does not support reference images." }, { status: 400 });
    }
    const token = await uploadReferenceImage(session.user.id, formData.get("image"));
    return NextResponse.json({ token }, { status: 201 });
  } catch (error) {
    if (error?.code === "INVALID_REFERENCE" || error?.code === "INVALID_MODEL") {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    if (error?.code === "REFERENCE_TOO_LARGE") {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 413 });
    }
    console.error("[reference-images] upload failed:", error?.message || error);
    const status = error?.code === "CONFIG" || error?.code === "KIE_CONFIG" ? 503 : 502;
    return NextResponse.json({ error: "Reference image upload is unavailable right now." }, { status });
  }
}
