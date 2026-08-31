/**
 * Sends the greeting over WhatsApp (via Twilio's WhatsApp Business API) when
 * configured, falling back to plain SMS if only a regular Twilio phone
 * number is set up. Requires TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN, plus
 * either TWILIO_WHATSAPP_FROM (e.g. "whatsapp:+14155238886") or
 * TWILIO_SMS_FROM (e.g. "+14155238886").
 */
export async function sendWhatsAppOrSms(to: string, opts: { message: string; cardImageUrl?: string | null }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;
  const smsFrom = process.env.TWILIO_SMS_FROM;

  if (!sid || !token || (!whatsappFrom && !smsFrom)) {
    return { skipped: true, reason: "Twilio not configured (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_WHATSAPP_FROM or TWILIO_SMS_FROM)" };
  }

  const { default: twilio } = await import("twilio");
  const client = twilio(sid, token);

  const useWhatsApp = !!whatsappFrom;
  const from = useWhatsApp ? whatsappFrom : smsFrom!;
  const toFormatted = useWhatsApp ? `whatsapp:${normalizePhone(to)}` : normalizePhone(to);

  return client.messages.create({
    from,
    to: toFormatted,
    body: opts.message,
    ...(opts.cardImageUrl ? { mediaUrl: [opts.cardImageUrl] } : {}),
  });
}

function normalizePhone(phone: string): string {
  const trimmed = phone.trim().replace(/^whatsapp:/, "");
  return trimmed.startsWith("+") ? trimmed : `+${trimmed.replace(/\D/g, "")}`;
}
