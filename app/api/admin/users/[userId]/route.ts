import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ userId: string }> };

/**
 * Admin-only: permanently delete a user account and everything tied to it.
 * Every table in supabase/schema.sql references auth.users(id) with
 * "on delete cascade", so removing the auth user via the Admin API alone
 * is enough to cascade-delete their profile, contacts, approvals, sign-in
 * history, usage events, Aria messages, and occasion subscriptions — no
 * manual per-table cleanup needed.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { userId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (userId === user.id) {
    return NextResponse.json({ error: "You can't delete your own account from here." }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
