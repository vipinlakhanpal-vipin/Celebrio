import { NextResponse } from "next/server";
import { sendGreetingEmail } from "@/lib/notify/email";

// TEMPORARY diagnostic route — verifies Resend env vars work end-to-end.
// Sends a fixed test message to the account owner's own email only.
// Remove this file after verification.
export async function GET() {
  try {
    const result = await sendGreetingEmail("vipinlakhanpal@gmail.com", {
      contactName: "Test",
      message: "Celebrio test: email integration is working!",
    });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
