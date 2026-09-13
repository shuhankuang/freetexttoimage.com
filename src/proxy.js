import { NextResponse } from "next/server";
import { defaultLocale } from "@/i18n/config";

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const segment = pathname.split("/")[1];

  if (segment === "ja") return NextResponse.next();

  if (segment === defaultLocale) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/en(?=\/|$)/, "") || "/";
    return NextResponse.redirect(url, 308);
  }

  const url = request.nextUrl.clone();
  url.pathname = `/en${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
