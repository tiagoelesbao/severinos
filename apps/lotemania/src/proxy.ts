import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";

const PROTECTED_PREFIX = "/dashboard";

export async function proxy(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith(PROTECTED_PREFIX)) {
    return NextResponse.next();
  }

  const accessToken = req.cookies.get("access_token")?.value;
  const payload = accessToken ? await verifyAccessToken(accessToken) : null;

  if (!payload) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
