import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if app is set up
  const isSetupComplete = process.env.SETUP_COMPLETE === "true";

  // Allow setup page always
  if (pathname.startsWith("/setup")) {
    if (isSetupComplete) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // Redirect to setup if not complete
  if (!isSetupComplete) {
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  // Protect admin routes
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const session = await auth();
    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/setup/:path*"],
};
