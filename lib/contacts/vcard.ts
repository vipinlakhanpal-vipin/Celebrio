import { parseFlexibleDate } from "@/lib/date-utils";

// A parsed vCard entry, shaped like the CSV/XLSX importer's ParsedContact so
// both device-import paths (native picker + .vcf upload) and the review
// screen can treat every candidate the same way regardless of where it came
// from.
export type PickedContact = {
  full_name: string;
  date_of_birth: string | null;
  anniversary_date: string | null;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
};

// vCard's "line folding": a continuation line starts with a space or tab and
// should be joined onto the previous line with that leading whitespace
// dropped. Both iCloud and Google Contacts exports can fold long lines
// (e.g. a base64 PHOTO) this way.
function unfold(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "");
}

function decodeVCardText(v: string): string {
  return v
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

// BDAY shows up as YYYYMMDD, YYYY-MM-DD, or (no birth year known, common on
// iOS when someone only entered a month/day) --MMDD / --MM-DD.
function parseBday(raw: string): string | null {
  const v = raw.trim();
  let m = v.match(/^(\d{4})-?(\d{2})-?(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = v.match(/^--(\d{2})-?(\d{2})$/);
  if (m) return `1900-${m[1]}-${m[2]}`; // same "unknown year" placeholder convention as parseFlexibleDate
  return parseFlexibleDate(v);
}

export function parseVCardText(text: string): PickedContact[] {
  const unfolded = unfold(text);
  const cards = unfolded.split(/BEGIN:VCARD/i).slice(1);
  const contacts: PickedContact[] = [];

  for (const chunk of cards) {
    const body = chunk.split(/END:VCARD/i)[0];
    const lines = body
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    let fn: string | null = null;
    let nName: string | null = null;
    let bday: string | null = null;
    let email: string | null = null;
    let phone: string | null = null;
    let address: string | null = null;
    let note: string | null = null;

    for (const line of lines) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const rawKey = line.slice(0, colonIdx);
      const value = line.slice(colonIdx + 1).trim();
      const key = rawKey.split(";")[0].toUpperCase();

      if (key === "FN" && !fn) {
        fn = decodeVCardText(value);
      } else if (key === "N" && !nName) {
        // N = Family;Given;Middle;Prefix;Suffix — reorder to "Given Family"
        // since that's how every name in this app is displayed.
        const parts = value.split(";").map((p) => decodeVCardText(p));
        const [family, given] = parts;
        nName = [given, family].filter(Boolean).join(" ").trim();
      } else if (key === "BDAY" && !bday) {
        bday = parseBday(value);
      } else if (key === "EMAIL" && !email) {
        email = value.trim();
      } else if (key === "TEL" && !phone) {
        phone = value.trim();
      } else if (key === "ADR" && !address) {
        // ADR = PO Box;Extended;Street;City;State;PostalCode;Country
        const parts = value.split(";").map((p) => decodeVCardText(p));
        address = parts.filter(Boolean).join(", ") || null;
      } else if (key === "NOTE" && !note) {
        note = decodeVCardText(value);
      }
    }

    const full_name = (fn || nName || "").trim();
    if (!full_name) continue; // same rule as the CSV importer: no name, no contact

    contacts.push({
      full_name,
      date_of_birth: bday,
      anniversary_date: null,
      relationship: null,
      email,
      phone,
      address,
      notes: note,
    });
  }

  return contacts;
}
