import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// The device-picker and vCard-upload flows both land here once the user has
// reviewed the candidates and picked which ones to keep — unlike
// /api/contacts/upload (a raw file the server parses), this route receives
// an already-parsed, already-selected JSON array.
const MAX_ROWS = 1000; // a phone's contact list or a single vCard export is realistically far smaller than a spreadsheet import

type ImportRow = {
  full_name: string;
  date_of_birth: string | null;
  anniversary_date: string | null;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
};

function cleanStr(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const contactsIn = Array.isArray(body?.contacts) ? body.contacts : [];

  const cleaned: ImportRow[] = contactsIn
    .map((c: unknown) => (c && typeof c === "object" ? (c as Record<string, unknown>) : {}))
    .map((c) => ({
      full_name: cleanStr(c.full_name) || "",
      date_of_birth: cleanStr(c.date_of_birth),
      anniversary_date: cleanStr(c.anniversary_date),
      relationship: cleanStr(c.relationship),
      email: cleanStr(c.email),
      phone: cleanStr(c.phone),
      address: cleanStr(c.address),
      notes: cleanStr(c.notes),
    }))
    .filter((c: ImportRow) => c.full_name.length > 0)
    .slice(0, MAX_ROWS);

  if (cleaned.length === 0) {
    return NextResponse.json({ error: "No contacts with a name were selected." }, { status: 400 });
  }

  const rows = cleaned.map((c) => ({
    user_id: user.id,
    full_name: c.full_name,
    date_of_birth: c.date_of_birth,
    anniversary_date: c.anniversary_date,
    relationship: c.relationship,
    email: c.email,
    phone: c.phone,
    address: c.address,
    notes: c.notes,
    // The contacts table's `source` check constraint only allows
    // 'manual' | 'csv' | 'xlsx' today — these are individually reviewed and
    // picked by the user (from their phone or a vCard file), so "manual"
    // is the closest fit without a schema migration for a fourth value.
    source: "manual" as const,
  }));

  const { data, error } = await supabase.from("contacts").insert(rows).select("id, date_of_birth");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("usage_events").insert({
    user_id: user.id,
    event_type: "contacts_imported",
    path: "/contacts",
  });

  const missingDob = data.filter((c) => !c.date_of_birth).length;

  return NextResponse.json({
    inserted: data.length,
    missingDob,
    skippedRows: contactsIn.length - cleaned.length,
    totalRowsInFile: contactsIn.length,
  });
}
