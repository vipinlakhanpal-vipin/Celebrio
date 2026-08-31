import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { regenerateMessage } from "@/lib/greetings/ariaRewrite";
import { generateAndStoreCard } from "@/lib/greetings/generateAndStore";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: approval, error: fetchError } = await supabase
    .from("approvals")
    .select("*, contact:contacts(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !approval) {
    return NextResponse.json({ error: "Approval not found" }, { status: 404 });
  }

  const body = await request.json();

  // ---- Regenerate the message (and card) with Aria / templates ----
  if (body.action === "regenerate") {
    const contact = approval.contact;
    const occasionType = approval.occasion_type as "birthday" | "anniversary" | "holiday";
    const newMessage = await regenerateMessage({
      name: contact.full_name,
      relationship: contact.relationship,
      notes: contact.notes,
      occasionType,
      occasionLabel: approval.occasion_label,
    });

    const headline =
      occasionType === "anniversary"
        ? "HAPPY ANNIVERSARY"
        : occasionType === "holiday"
        ? `HAPPY ${(approval.occasion_label || "").toUpperCase()}`
        : undefined;

    let icon = occasionType === "anniversary" ? "heart" : undefined;
    if (occasionType === "holiday" && approval.occasion_type_id) {
      const { data: occasionType_ } = await supabase
        .from("occasion_types")
        .select("card_icon")
        .eq("id", approval.occasion_type_id)
        .maybeSingle();
      icon = occasionType_?.card_icon;
    }

    let cardImageUrl = approval.card_image_url;
    try {
      cardImageUrl = await generateAndStoreCard({
        userId: user.id,
        contactId: contact.id,
        contactName: contact.full_name,
        relationship: contact.relationship,
        message: newMessage,
        occasionDate: new Date(approval.occasion_date + "T00:00:00Z"),
        dateOfBirth: occasionType === "birthday" ? contact.date_of_birth : null,
        occasionKey: occasionType,
        headline,
        icon,
      });
    } catch {
      // keep the previous card if regeneration fails
    }

    const { data, error } = await supabase
      .from("approvals")
      .update({ message: newMessage, card_image_url: cardImageUrl, status: "pending" })
      .eq("id", id)
      .select("*, contact:contacts(*)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ approval: data });
  }

  // ---- Normal field update (message edit, channel change, status change) ----
  const update: Record<string, unknown> = {};
  if (typeof body.message === "string") {
    update.message = body.message;
    if (!body.status) update.status = "edited";
  }
  if (Array.isArray(body.channels)) update.channels = body.channels;
  if (typeof body.status === "string") {
    if (!["pending", "approved", "edited", "rejected"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }

  const { data, error } = await supabase
    .from("approvals")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, contact:contacts(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("usage_events").insert({
    user_id: user.id,
    event_type: "approval_reviewed",
    path: "/approvals",
  });

  return NextResponse.json({ approval: data });
}
