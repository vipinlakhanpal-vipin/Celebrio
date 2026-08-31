import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isAuthorizedCronRequest, appBaseUrl } from "@/lib/cron-auth";
import { isoDateOnly, startOfDay } from "@/lib/date-utils";
import { Resend } from "resend";

const LEAD_DAYS = 2;

/**
 * Daily cron job for holiday-style occasions (Diwali, Valentine's Day, ...).
 * Unlike birthdays/anniversaries, these apply to many contacts at once, so
 * instead of silently drafting one approval per contact, this creates a
 * single occasion_prompt ("Diwali is in 2 days — send greetings?") per
 * subscribed user and emails them. From there they pick which contacts to
 * send to (see /api/occasions/prompts/[id]/generate).
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await createAdminClient();
  const today = startOfDay(new Date());
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() + LEAD_DAYS);
  const targetIso = isoDateOnly(targetDate);

  const { data: dueOccasions, error } = await admin
    .from("occasion_dates")
    .select("occasion_type_id, date, occasion_type:occasion_types(id, name, key)")
    .eq("date", targetIso);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!dueOccasions || dueOccasions.length === 0) {
    return NextResponse.json({ created: 0, message: "No holidays due" });
  }

  let created = 0;
  const errors: string[] = [];

  for (const occasion of dueOccasions) {
    const { data: subs } = await admin
      .from("user_occasion_subscriptions")
      .select("user_id")
      .eq("occasion_type_id", occasion.occasion_type_id)
      .eq("enabled", true);

    for (const sub of subs || []) {
      const { data: existing } = await admin
        .from("occasion_prompts")
        .select("id")
        .eq("user_id", sub.user_id)
        .eq("occasion_type_id", occasion.occasion_type_id)
        .eq("occasion_date", targetIso)
        .maybeSingle();
      if (existing) continue;

      const { error: insertError } = await admin.from("occasion_prompts").insert({
        user_id: sub.user_id,
        occasion_type_id: occasion.occasion_type_id,
        occasion_date: targetIso,
        status: "pending",
      });
      if (insertError) {
        errors.push(insertError.message);
        continue;
      }
      created++;

      const { data: profile } = await admin.from("profiles").select("email, notify_email").eq("id", sub.user_id).maybeSingle();
      const occasionType = occasion.occasion_type as unknown as { name: string } | null;
      if (profile?.email && (profile.notify_email ?? true) && process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails
          .send({
            from: process.env.RESEND_FROM_EMAIL || "Celebrio <onboarding@resend.dev>",
            to: profile.email,
            subject: `${occasionType?.name || "A holiday"} is coming up — send greetings?`,
            html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2>${occasionType?.name || "A holiday"} is in ${LEAD_DAYS} days</h2>
              <p style="color:#444">Want to send greetings to your contacts for this occasion?</p>
              <p style="margin:28px 0"><a href="${appBaseUrl()}/settings" style="background:#4F46E5;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">Choose contacts</a></p>
            </div>`,
          })
          .catch((e) => errors.push(String(e)));
      }
    }
  }

  return NextResponse.json({ created, errors });
}
