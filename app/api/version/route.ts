import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/version";

// Always evaluated fresh per request (never statically cached), so a client
// polling this after a new deploy immediately sees the new version.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ version: APP_VERSION });
}
