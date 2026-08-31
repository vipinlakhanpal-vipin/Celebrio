import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { sendGreetingEmail } from "@/lib/notify/email";
import { sendWhatsAppOrSms } from "@/lib/notify/whatsapp";
import { isoDateOnly } from "@/lib/date-utils";

/**
 * Daily cron job: sends every approved/edited greeting whose occasion date
 * is today, over whichever channels were selected. Rejected and pending
 * approvals are left untouched — this only ever sends what the user
 * explicitly approved.
 *
 * Configure this to run once a day (e.g. 8am) via vercel.json.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await createAdminClient();
  const todayIso = isoDateOnly(new Date());

  const { data: due, error } = await admin
    .from("approvals")
    .select("*, contact:contacts(*)")
    .in("status", ["approved", "edited"])
    .eq("occasion_date", todayIso);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!due || due.length === 0) {
    return NextResponse.json({ sent: 0, message: "Nothing to send today" });
  }

  let sent = 0;
  let failed = 0;

  for (const approval of due) {
    const contact = approval.contact;
    const results: string[] = [];
    let anySucceeded = false;

    try {
      if (approval.channels.includes("email") && contact?.email) {
        try {
          await sendGreetingEmail(contact.email, {
            contactName: contact.full_name,
            message: approval.message,
            cardImageUrl: approval.card_image_url,
          });
          anySucceeded = true;
        } catch (e) {
          results.push(`Email failed: ${String(e)}`);
        }
      }

      if (approval.channels.includes("whatsapp") && contact?.phone) {
        try {
          await sendWhatsAppOrSms(contact.phone, {
            message: approval.message,
            cardImageUrl: approval.card_image_url,
          });
          anySucceeded = true;
        } catch (e) {
          results.push(`WhatsApp/SMS failed: ${String(e)}`);
        }
      }

      if (approval.channels.length === 0) {
        results.push("No channel configured (missing email/phone on the contact)");
      }

      if (anySucceeded) {
        await admin
          .from("approvals")
          .update({ status: "sent", sent_at: new Date().toISOString(), send_error: results.join("; ") || null })
          .eq("id", approval.id);
        sent++;

        await admin.from("usage_events").insert({
          user_id: approval.user_id,
          event_type: "greeting_sent",
          path: "/approvals",
        });
      } else {
        await admin
          .from("approvals")
          .update({ status: "failed", send_error: results.join("; ") || "Unknown error" })
          .eq("id", approval.id);
        failed++;
      }
    } catch (err) {
      await admin.from("approvals").update({ status: "failed", send_error: String(err) }).eq("id", approval.id);
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, total: due.length });
}
