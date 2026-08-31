import { createAdminClient } from "@/lib/supabase/server";
import { buildCardSvg, renderCardPng, DEFAULT_PALETTES } from "@/lib/greetings/card";
import { turningAge } from "@/lib/date-utils";

/**
 * Renders a greeting card PNG for a contact + occasion, uploads it to the
 * public `greeting-cards` Supabase Storage bucket, and returns its public
 * URL. Used by the approval-generation cron job (and by "regenerate" in the
 * Approvals UI).
 */
export async function generateAndStoreCard(opts: {
  userId: string;
  contactId: string;
  contactName: string;
  relationship: string | null;
  message: string;
  occasionDate: Date;
  dateOfBirth: string | null;
  /** e.g. "HAPPY BIRTHDAY" (default), "HAPPY ANNIVERSARY", "HAPPY DIWALI" */
  headline?: string;
  /** cake (default) | heart | diya | pumpkin | moon | gift | tree | splash | sparkleburst */
  icon?: string;
  subLine?: string;
  /** distinguishes storage paths so a contact can have a card per occasion type */
  occasionKey?: string;
}): Promise<string> {
  const palette = DEFAULT_PALETTES[Math.floor(Math.random() * DEFAULT_PALETTES.length)];
  const age = opts.dateOfBirth && !opts.headline ? turningAge(opts.dateOfBirth, opts.occasionDate) : null;

  const svg = buildCardSvg({
    name: opts.contactName,
    message: opts.message,
    relationship: opts.relationship,
    age,
    palette,
    seed: opts.contactId + (opts.occasionKey || ""),
    headline: opts.headline,
    icon: opts.icon,
    subLine: opts.subLine,
  });

  const png = await renderCardPng(svg);

  const admin = await createAdminClient();
  const slug = opts.occasionKey ? `${opts.occasionKey}-` : "";
  const path = `${opts.userId}/${opts.contactId}-${slug}${opts.occasionDate.getFullYear()}.png`;

  const { error } = await admin.storage.from("greeting-cards").upload(path, png, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) throw error;

  const { data } = admin.storage.from("greeting-cards").getPublicUrl(path);
  return data.publicUrl;
}
