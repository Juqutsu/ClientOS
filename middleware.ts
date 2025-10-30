import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/dashboard", "/projects", "/settings"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`)
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // Detect Supabase auth cookies set by @supabase/ssr
  const hasSupabaseSession =
    req.cookies.has("sb-access-token") ||
    req.cookies.has("sb-refresh-token") ||
    // Back-compat for older cookie names
    req.cookies.getAll().some(({ name }) =>
      name === "supabase.auth.token" || name.startsWith("supabase.auth.token.")
    );

  if (!hasSupabaseSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    const original = pathname + (req.nextUrl.search || "");
    url.searchParams.set("next", original);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/projects",
    "/projects/:path*",
    "/settings",
    "/settings/:path*",
  ],
};
