import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/dashboard", "/projects", "/settings", "/clients"];

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

  const hasSupabaseSession = req.cookies.getAll().some(
    ({ name }) =>
      // Supabase persists the session in chunked cookies prefixed with this key
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
    "/clients",
    "/clients/:path*",
  ],
};
