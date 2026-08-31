import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isAuthorizedCronRequest, appBaseUrl } from "@/lib/cron-auth";
import { daysUntilNextOccurrence, nextOccurrenceDate, isoDateOnly } from "@/lib/date-utils";
import { generateGreetingMessage, generateAnniversaryMessage } from "@/lib/greetings/message";
import { generateAndStoreCard } from "@/lib/greetings/generateAndStore";
import { sendApprovalReadyEmail } from "@/lib/notify/email";

const LEAD_DAYS = 2; // "share this 2 days in advance" — matches the approved product decision

type ContactRow = {
  id: string;
  user_id: string;
  full_name: string;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  anniversary_date: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  notify_email: boolean | null;
  notify_whatsapp: boolean | null;
};

/**
 * Daily cron job: for every contact whose birthday OR anniversary falls
 * exactly LEAD_DAYS from now, draft a message + card and create a `pending`
 * approval row so the owner can review it. Notifies the owner by email +
 * leaves it in their in-app Approvals queue (both channels were requested).
 *
 * Holiday-style occasions (Diwali, Valentine's Day, ...) are handled
 * separately by /api/occasions/generate, since they apply to many contacts
 * at once and need the user to pick who to send to rather than firing
 * automatically for every contact.
 *
 * Configure this to run once a day via vercel.json.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await createAdminClient();
  const now = new Date();

  const { data: contacts, error: contactsError } = await admin
    .from("contacts")
    .select("id, user_id, full_name, relationship, date_of_birth, anniversary_date, email, phone");

  if (contactsError) {
    return NextResponse.json({ error: contactsError.message }, { status: 500 });
  }

  const all = (contacts || []) as ContactRow[];
  const dueBirthdays = all.filter((c) => c.date_of_birth && daysUntilNextOccurrence(c.date_of_birth, now) === LEAD_DAYS);
  const dueAnniversaries = all.filter(
    (c) => c.anniversary_date && daysUntilNextOccurrence(c.anniversary_date, now) === LEAD_DAYS
  );

  if (dueBirthdays.length === 0 && dueAnniversaries.length === 0) {
    return NextResponse.json({ created: 0, message: "Nothing due for approval today" });
  }

  const userIds = Array.from(new Set([...dueBirthdays, ...dueAnniversaries].map((c) => c.user_id)));
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, notify_email, notify_whatsapp")
    .in("id", userIds);
  const profileById = new Map<string, ProfileRow>((profiles || []).map((p) => [p.id, p as ProfileRow]));

  let created = 0;
  const errors: string[] = [];
  const notifyUsers = new Set<string>();

  async function processContact(
    contact: ContactRow,
    dateField: string,
    occasionType: "birthday" | "anniversary"
  ) {
    const occasion = nextOccurrenceDate(dateField, now);
    const occasionIso = isoDateOnly(occasion);
    const profile = profileById.get(contact.user_id);

    const { data: existing } = await admin
      .from("approvals")
      .select("id")
      .eq("contact_id", contact.id)
      .eq("occasion_date", occasionIso)
      .eq("occasion_type", occasionType)
      .maybeSingle();
    if (existing) return;

    try {
      const message =
        occasionType === "anniversary"
          ? generateAnniversaryMessage(contact.full_name, contact.relationship)
          : generateGreetingMessage(contact.full_name, contact.relationship);

      let cardImageUrl: string | null = null;
      try {
        cardImageUrl = await generateAndStoreCard({
          userId: contact.user_id,
          contactId: contact.id,
          contactName: contact.full_name,
          relationship: contact.relationship,
          message,
          occasionDate: occasion,
          dateOfBirth: occasionType === "birthday" ? contact.date_of_birth : null,
          occasionKey: occasionType,
          headline: occasionType === "anniversary" ? "HAPPY ANNIVERSARY" : undefined,
          icon: occasionType === "anniversary" ? "heart" : undefined,
          subLine: occasionType === "anniversary" ? "Celebrating you today!" : undefined,
        });
      } catch (cardErr) {
        errors.push(`Card generation failed for ${contact.full_name}: ${String(cardErr)}`);
      }

      const channels: string[] = [];
      if ((profile?.notify_email ?? true) && contact.email) channels.push("email");
      if ((profile?.notify_whatsapp ?? true) && contact.phone) channels.push("whatsapp");

      const sendAt = new Date(occasion);
      sendAt.setUTCHours(9, 0, 0, 0);

      const { error: insertError } = await admin.from("approvals").insert({
        user_id: contact.user_id,
        contact_id: contact.id,
        occasion_type: occasionType,
        occasion_date: occasionIso,
        message,
        channels,
        card_image_url: cardImageUrl,
        status: "pending",
        send_at: sendAt.toISOString(),
      });

      if (insertError) {
        errors.push(`${contact.full_name}: ${insertError.message}`);
        return;
      }

      created++;
      notifyUsers.add(contact.user_id);

      await admin.from("usage_events").insert({
        user_id: contact.user_id,
        event_type: "approval_created",
        path: "/approvals",
      });
    } catch (err) {
      errors.push(`${contact.full_name}: ${String(err)}`);
    }
  }

  for (const c of dueBirthdays) await processContact(c, c.date_of_birth!, "birthday");
  for (const c of dueAnniversaries) await processContact(c, c.anniversary_date!, "anniversary");

  for (const userId of notifyUsers) {
    const profile = profileById.get(userId);
    if (profile?.email && (profile.notify_email ?? true)) {
      const count = dueBirthdays.filter((c) => c.user_id === userId).length + dueAnniversaries.filter((c) => c.user_id === userId).length;
      const first = dueBirthdays.find((c) => c.user_id === userId) || dueAnniversaries.find((c) => c.user_id === userId);
      await sendApprovalReadyEmail(profile.email, {
        contactName: count === 1 && first ? first.full_name : `${count} contacts`,
        occasionDateLabel: "the next couple of days",
        approveUrl: `${appBaseUrl()}/approvals`,
      }).catch((e) => errors.push(`Email to ${profile.email} failed: ${String(e)}`));
    }
  }

  return NextResponse.json({ created, errors });
}
