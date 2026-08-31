import {
  generateGreetingMessage,
  generateAnniversaryMessage,
  generateHolidayMessage,
} from "@/lib/greetings/message";

function templateFallback(opts: {
  name: string;
  relationship: string | null;
  occasionType: "birthday" | "anniversary" | "holiday";
  occasionLabel?: string | null;
}): string {
  if (opts.occasionType === "anniversary") return generateAnniversaryMessage(opts.name, opts.relationship);
  if (opts.occasionType === "holiday") return generateHolidayMessage(opts.name, opts.relationship, opts.occasionLabel || "the day");
  return generateGreetingMessage(opts.name, opts.relationship);
}

/**
 * "Regenerate with Aria" — when ANTHROPIC_API_KEY is configured, asks Claude
 * for a more personalized message using the contact's name, relationship,
 * notes, and the occasion (birthday / anniversary / a named holiday). Falls
 * back to picking another template variant when no key is set, so this
 * always works out of the box.
 */
export async function regenerateMessage(opts: {
  name: string;
  relationship: string | null;
  notes: string | null;
  occasionType?: "birthday" | "anniversary" | "holiday";
  occasionLabel?: string | null;
}): Promise<string> {
  const occasionType = opts.occasionType || "birthday";
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return templateFallback({ ...opts, occasionType });
  }

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    const firstName = opts.name.split(" ")[0];
    const occasionPhrase =
      occasionType === "anniversary" ? "anniversary" : occasionType === "holiday" ? opts.occasionLabel || "the occasion" : "birthday";

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
      max_tokens: 200,
      system:
        "You write warm, natural-sounding greeting messages for a birthday/occasion reminder app. " +
        "Reply with ONLY the message text — no quotes, no preamble, no hashtags. " +
        "Keep it 1-3 sentences, genuine and specific rather than generic, appropriate for the stated relationship and occasion.",
      messages: [
        {
          role: "user",
          content: `Write a ${occasionPhrase} message for ${firstName}. Relationship to the sender: ${
            opts.relationship || "friend"
          }.${opts.notes ? ` Notes about them: ${opts.notes}.` : ""}`,
        },
      ],
    });

    const text = response.content
      .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return text || templateFallback({ ...opts, occasionType });
  } catch {
    return templateFallback({ ...opts, occasionType });
  }
}
