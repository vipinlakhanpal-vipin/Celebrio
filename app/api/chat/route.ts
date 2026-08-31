import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { daysUntilNextOccurrence } from "@/lib/date-utils";

const SYSTEM_PROMPT = `You are Aria, the friendly in-app assistant for "Celebrio" — an app where the user tracks contacts' birthdays and anniversaries, plus optional holidays (Diwali, Valentine's Day, etc.), and reviews AI-drafted greeting messages/cards before they're sent by email or WhatsApp/SMS.

You can help the user: answer questions about their upcoming birthdays/anniversaries/approvals (using the CONTEXT block below, which is always current), draft or rewrite a greeting message for someone, suggest what to write for a specific relationship or occasion, and explain how features work (CSV/Excel import, the 2-day approval window, channels, themes, etc.).

Keep replies short and conversational — a sentence or two unless the user asks for a longer message draft. Never invent facts about the user's contacts beyond what's in the CONTEXT block.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const userMessage = String(body.message || "").trim();
  if (!userMessage) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  // Persist the user's message immediately.
  await supabase.from("aria_messages").insert({ user_id: user.id, role: "user", content: userMessage });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const reply =
      "I need an Anthropic API key configured (ANTHROPIC_MODEL / ANTHROPIC_API_KEY env vars) before I can chat — ask whoever's deploying the app to add one. In the meantime, you can still manage contacts and approvals from the other tabs!";
    await supabase.from("aria_messages").insert({ user_id: user.id, role: "assistant", content: reply });
    return NextResponse.json({ reply });
  }

  try {
    const [{ data: history }, context] = await Promise.all([
      supabase
        .from("aria_messages")
        .select("role, content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      buildContext(supabase, user.id),
    ]);

    const orderedHistory = (history || []).slice().reverse();

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
      max_tokens: 500,
      system: `${SYSTEM_PROMPT}\n\nCONTEXT:\n${context}`,
      messages: orderedHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const reply =
      response.content
        .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim() || "Sorry, I didn't quite catch that — could you rephrase?";

    await supabase.from("aria_messages").insert({ user_id: user.id, role: "assistant", content: reply });

    await supabase.from("usage_events").insert({ user_id: user.id, event_type: "aria_message", path: "/aria" });

    return NextResponse.json({ reply });
  } catch (err) {
    const reply = "Sorry, I ran into an error trying to respond. Please try again in a moment.";
    await supabase.from("aria_messages").insert({ user_id: user.id, role: "assistant", content: reply });
    return NextResponse.json({ reply, error: String(err) }, { status: 200 });
  }
}

async function buildContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string> {
  const [{ data: contacts }, { count: pendingCount }, { count: contactCount }] = await Promise.all([
    supabase
      .from("contacts")
      .select("full_name, relationship, date_of_birth, anniversary_date")
      .eq("user_id", userId),
    supabase.from("approvals").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "pending"),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const upcoming = (contacts || [])
    .flatMap((c) => {
      const items: string[] = [];
      if (c.date_of_birth) {
        const d = daysUntilNextOccurrence(c.date_of_birth);
        if (d <= 30) items.push(`${c.full_name} (${c.relationship || "contact"}) — birthday in ${d} day(s)`);
      }
      if (c.anniversary_date) {
        const d = daysUntilNextOccurrence(c.anniversary_date);
        if (d <= 30) items.push(`${c.full_name} (${c.relationship || "contact"}) — anniversary in ${d} day(s)`);
      }
      return items;
    })
    .sort();

  return [
    `Total contacts: ${contactCount ?? 0}`,
    `Pending approvals waiting for review: ${pendingCount ?? 0}`,
    `Upcoming (next 30 days): ${upcoming.length === 0 ? "none" : "\n- " + upcoming.join("\n- ")}`,
  ].join("\n");
}
