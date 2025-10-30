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

  // Collect cookie names to aid debugging
  const cookieNames = req.cookies.getAll().map((c) => c.name);

  // Detect Supabase auth cookies set by @supabase/ssr (be liberal in what we accept)
  const hasSupabaseSession = cookieNames.some((name) => {
    // Standard helpers cookies
    if (name === "sb-access-token" || name === "sb-refresh-token") return true;

    // Project-ref prefixed cookies used by various @supabase/ssr versions
    // Examples:
    //   sb-<ref>-access-token
    //   sb-<ref>-refresh-token
    //   sb-<ref>-auth-token
    //   sb-<ref>-auth-token.0 / sb-<ref>-auth-token.1
    if (/^sb-[A-Za-z0-9]+-(access|refresh)-token$/.test(name)) return true;
    if (/^sb-[A-Za-z0-9]+-auth-token(\.\d+)?$/.test(name)) return true;

    // Back-compat
    if (name === "supabase.auth.token" || /^supabase\.auth\.token(\.\d+)?$/.test(name)) return true;
    return false;
  });

  // Lightweight logging for auth flow diagnostics
  try {
    console.log(
      JSON.stringify(
        {
          tag: "middleware/auth-check",
          path: pathname,
          hasSupabaseSession,
          cookies: cookieNames,
        },
        null,
        0
      )
    );
  } catch (_) {
    // ignore logging failures
  }

  if (!hasSupabaseSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    const original = pathname + (req.nextUrl.search || "");
    url.searchParams.set("next", original);

    try {
      console.log(
        JSON.stringify(
          {
            tag: "middleware/redirect-login",
            from: pathname,
            to: url.pathname,
            next: original,
          },
          null,
          0
        )
      );
    } catch (_) {}

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
