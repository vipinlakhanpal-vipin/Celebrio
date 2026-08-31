import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateHolidayMessage } from "@/lib/greetings/message";
import { generateAndStoreCard } from "@/lib/greetings/generateAndStore";

type Params = { params: Promise<{ id: string }> };

/**
 * Turns an occasion_prompt ("Diwali is in 2 days") into individual approval
 * drafts for the contacts the user picked — reusing the same message/card
 * engine and the same approve-before-send flow as birthdays.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const contactIds: string[] = Array.isArray(body.contactIds) ? body.contactIds : [];
  if (contactIds.length === 0) {
    return NextResponse.json({ error: "Pick at least one contact" }, { status: 400 });
  }

  const { data: prompt, error: promptError } = await supabase
    .from("occasion_prompts")
    .select("*, occasion_type:occasion_types(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (promptError || !prompt) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });

  const occasionType = prompt.occasion_type;
  const { data: profile } = await supabase
    .from("profiles")
    .select("notify_email, notify_whatsapp")
    .eq("id", user.id)
    .maybeSingle();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, full_name, relationship, email, phone, notes")
    .in("id", contactIds)
    .eq("user_id", user.id);

  let created = 0;
  const errors: string[] = [];
  const sendAt = new Date(prompt.occasion_date + "T09:00:00Z");

  for (const contact of contacts || []) {
    try {
      const message = generateHolidayMessage(contact.full_name, contact.relationship, occasionType.name);

      let cardImageUrl: string | null = null;
      try {
        cardImageUrl = await generateAndStoreCard({
          userId: user.id,
          contactId: contact.id,
          contactName: contact.full_name,
          relationship: contact.relationship,
          message,
          occasionDate: new Date(prompt.occasion_date + "T00:00:00Z"),
          dateOfBirth: null,
          occasionKey: occasionType.key,
          headline: `HAPPY ${occasionType.name.toUpperCase()}`,
          icon: occasionType.card_icon,
          subLine: `${occasionType.emoji} ${occasionType.name}`,
        });
      } catch (e) {
        errors.push(`Card failed for ${contact.full_name}: ${String(e)}`);
      }

      const channels: string[] = [];
      if ((profile?.notify_email ?? true) && contact.email) channels.push("email");
      if ((profile?.notify_whatsapp ?? true) && contact.phone) channels.push("whatsapp");

      const { error: insertError } = await supabase.from("approvals").insert({
        user_id: user.id,
        contact_id: contact.id,
        occasion_type: "holiday",
        occasion_type_id: occasionType.id,
        occasion_label: occasionType.name,
        occasion_date: prompt.occasion_date,
        message,
        channels,
        card_image_url: cardImageUrl,
        status: "pending",
        send_at: sendAt.toISOString(),
      });

      if (insertError) {
        // Unique-constraint hits (already created for this contact/occasion) are expected on repeat clicks.
        if (!insertError.message.includes("duplicate")) errors.push(`${contact.full_name}: ${insertError.message}`);
        continue;
      }
      created++;
    } catch (err) {
      errors.push(`${contact.full_name}: ${String(err)}`);
    }
  }

  await supabase.from("occasion_prompts").update({ status: "actioned" }).eq("id", id);

  return NextResponse.json({ created, errors });
}
