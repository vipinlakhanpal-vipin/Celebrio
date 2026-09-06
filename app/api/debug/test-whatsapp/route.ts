import { NextResponse } from "next/server";
import { sendWhatsAppOrSms } from "@/lib/notify/whatsapp";

// TEMPORARY diagnostic route — verifies Twilio env vars work end-to-end.
// Sends a fixed test message to a fixed sandbox-joined number only.
// Remove this file after verification.
export async function GET() {
  try {
    const result = await sendWhatsAppOrSms("+971509825622", {
      message: "Celebrio test: WhatsApp integration is working!",
    });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
