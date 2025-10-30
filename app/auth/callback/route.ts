import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const nextRaw = url.searchParams.get("next");
  const next = nextRaw && nextRaw.startsWith("/") ? nextRaw : null;
  const supabase = getSupabaseServer();

  try {
    const code = url.searchParams.get("code");
    if (!code) {
      return NextResponse.redirect(
        new URL(
          `/auth/login?error=${encodeURIComponent("Kein Code")}`,
          url.origin
        )
      );
    }
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(
          `/auth/login?error=${encodeURIComponent(error.message)}`,
          url.origin
        )
      );
    }
    const destination =
      next ||
      (url.searchParams.get("type") === "recovery"
        ? "/auth/reset"
        : "/dashboard");
    return NextResponse.redirect(new URL(destination, url.origin));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(message)}`, url.origin)
    );
  }
}
