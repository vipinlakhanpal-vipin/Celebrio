import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Called once from the client right after a successful sign-in. Records the
 * IP/city/country (from Vercel's geo headers, when deployed on Vercel) and a
 * rough device type, so Settings > Admin can show "who signed in, from
 * where". Best-effort: failures here never block the user from reaching the
 * app.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const city = request.headers.get("x-vercel-ip-city")
    ? decodeURIComponent(request.headers.get("x-vercel-ip-city")!)
    : null;
  const region = request.headers.get("x-vercel-ip-country-region") || null;
  const country = request.headers.get("x-vercel-ip-country") || null;
  const userAgent = request.headers.get("user-agent") || null;
  const deviceType = /mobile/i.test(userAgent || "")
    ? "mobile"
    : /tablet|ipad/i.test(userAgent || "")
    ? "tablet"
    : "desktop";

  await supabase.from("sign_ins").insert({
    user_id: user.id,
    ip_address: ip,
    city,
    region,
    country,
    user_agent: userAgent,
    device_type: deviceType,
  });

  await supabase.from("usage_events").insert({
    user_id: user.id,
    event_type: "sign_in",
    path: "/login",
  });

  return NextResponse.json({ ok: true });
}
