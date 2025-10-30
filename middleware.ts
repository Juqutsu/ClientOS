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
    // New helpers
    if (name === "sb-access-token" || name === "sb-refresh-token") return true;
    // Some setups prefix cookies with project ref, e.g. sb-xxxx-access-token
    if (name.startsWith("sb-") && (name.endsWith("-access-token") || name.endsWith("-refresh-token"))) return true;
    // Back-compat for older cookie names
    if (name === "supabase.auth.token" || name.startsWith("supabase.auth.token.")) return true;
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
