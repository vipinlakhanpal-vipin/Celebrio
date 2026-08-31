import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCsv, parseXlsx } from "@/lib/contacts/parse";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB — plenty for a contacts list, keeps parsing fast/safe
const MAX_ROWS = 5000;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is too large (5MB max)" }, { status: 400 });
  }

  const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
  const isXlsx = /\.xlsx?$/i.test(file.name) || file.type.includes("spreadsheet") || file.type.includes("excel");

  if (!isCsv && !isXlsx) {
    return NextResponse.json({ error: "Please upload a .csv, .xls, or .xlsx file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let result;
  try {
    result = isCsv ? parseCsv(buffer) : parseXlsx(buffer);
  } catch {
    return NextResponse.json({ error: "Could not read that file. Please check the format and try again." }, { status: 400 });
  }

  if (result.contacts.length === 0) {
    return NextResponse.json(
      { error: "No contacts with a name were found in that file.", skippedRows: result.skippedRows },
      { status: 400 }
    );
  }

  const rows = result.contacts.slice(0, MAX_ROWS).map((c) => ({
    user_id: user.id,
    full_name: c.full_name,
    date_of_birth: c.date_of_birth,
    anniversary_date: c.anniversary_date,
    relationship: c.relationship,
    email: c.email,
    phone: c.phone,
    notes: c.notes,
    source: isCsv ? ("csv" as const) : ("xlsx" as const),
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
    skippedRows: result.skippedRows,
    totalRowsInFile: result.totalRows,
  });
}
