import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureWorkspaceSubscription } from "@/lib/billing/subscriptions";

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
    // After establishing the session, ensure the user has a profile row and at least one workspace
    const {
      data: { user },
    } = await supabase.auth.getUser();

    try {
      if (user) {
        const admin = getSupabaseAdmin();

        // Ensure application user row exists
        await admin
          .from("users")
          .upsert({
            id: user.id,
            email: user.email,
            full_name:
              (user.user_metadata &&
                (user.user_metadata.full_name || user.user_metadata.name)) ||
              null,
          });

        // Check if the user already belongs to any workspace
        const { data: existingMemberships } = await admin
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", user.id)
          .limit(1);

        let createdWorkspaceId: string | null = null;

        if (!existingMemberships || existingMemberships.length === 0) {
          // Create a default workspace and add membership
          const defaultName = user.user_metadata?.full_name
            ? `${user.user_metadata.full_name}'s Workspace`
            : user.email
            ? `${user.email}'s Workspace`
            : "My Workspace";

          const { data: ws } = await admin
            .from("workspaces")
            .insert({ name: defaultName, created_by: user.id })
            .select("id")
            .single();

          if (ws?.id) {
            createdWorkspaceId = ws.id as string;
            await admin
              .from("workspace_members")
              .insert({ workspace_id: ws.id, user_id: user.id, role: "owner" });
            await ensureWorkspaceSubscription(ws.id, { client: admin });
          }
        }

        const primaryWorkspaceId =
          createdWorkspaceId ?? existingMemberships?.[0]?.workspace_id ?? null;

        if (!createdWorkspaceId && primaryWorkspaceId) {
          await ensureWorkspaceSubscription(primaryWorkspaceId, { client: admin });
        }

        // If we just created a workspace, set it active via cookie
        if (createdWorkspaceId) {
          const res = NextResponse.redirect(
            new URL(
              next ||
                (url.searchParams.get("type") === "recovery"
                  ? "/auth/reset"
                  : "/dashboard"),
              url.origin
            )
          );
          res.cookies.set("active_ws", createdWorkspaceId, { path: "/" });
          return res;
        }
      }
    } catch (_) {
      // Non-blocking: if provisioning fails, continue to destination
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
