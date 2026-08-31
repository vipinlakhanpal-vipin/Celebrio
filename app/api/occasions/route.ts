import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET: every occasion type in the catalog, with the current user's
 * subscription state, plus any pending "want to send greetings?" prompts.
 * PATCH: toggle a subscription on/off.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: occasionTypes }, { data: subscriptions }, { data: prompts }] = await Promise.all([
    supabase.from("occasion_types").select("*").order("name"),
    supabase.from("user_occasion_subscriptions").select("occasion_type_id, enabled").eq("user_id", user.id),
    supabase
      .from("occasion_prompts")
      .select("*, occasion_type:occasion_types(*)")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("occasion_date"),
  ]);

  const enabledMap = new Map((subscriptions || []).map((s) => [s.occasion_type_id, s.enabled]));
  const types = (occasionTypes || []).map((t) => ({
    ...t,
    subscribed: enabledMap.get(t.id) ?? t.default_enabled,
  }));

  return NextResponse.json({ occasionTypes: types, prompts: prompts || [] });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const occasionTypeId = String(body.occasion_type_id || "");
  const enabled = !!body.enabled;
  if (!occasionTypeId) return NextResponse.json({ error: "occasion_type_id is required" }, { status: 400 });

  const { error } = await supabase
    .from("user_occasion_subscriptions")
    .upsert({ user_id: user.id, occasion_type_id: occasionTypeId, enabled }, { onConflict: "user_id,occasion_type_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
