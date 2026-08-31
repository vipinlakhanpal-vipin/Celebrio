import Papa from "papaparse";
import * as XLSX from "xlsx";
import { parseFlexibleDate } from "@/lib/date-utils";

export type ParsedContact = {
  full_name: string;
  date_of_birth: string | null;
  anniversary_date: string | null;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export type ParseResult = {
  contacts: ParsedContact[];
  skippedRows: number;
  totalRows: number;
};

const COLUMN_ALIASES: Record<keyof Omit<ParsedContact, "date_of_birth" | "anniversary_date">, string[]> = {
  full_name: ["name", "full name", "fullname", "contact name", "first name"],
  relationship: ["relationship", "relation", "relationship to you", "how do you know them", "category"],
  email: ["email", "email address", "e-mail"],
  phone: ["phone", "phone number", "mobile", "whatsapp", "whatsapp number", "cell"],
  notes: ["notes", "note", "comments", "remarks"],
};

const DOB_ALIASES = [
  "date of birth",
  "dob",
  "birthday",
  "birth date",
  "birthdate",
  "date_of_birth",
];

const ANNIVERSARY_ALIASES = [
  "anniversary",
  "anniversary date",
  "wedding anniversary",
  "work anniversary",
  "anniversary_date",
];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildColumnMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));

  for (const key of Object.keys(COLUMN_ALIASES) as (keyof typeof COLUMN_ALIASES)[]) {
    const found = normalized.find((h) => COLUMN_ALIASES[key].includes(h.norm));
    if (found) map[key] = found.raw;
  }
  const dobFound = normalized.find((h) => DOB_ALIASES.includes(h.norm));
  if (dobFound) map["date_of_birth"] = dobFound.raw;
  const annFound = normalized.find((h) => ANNIVERSARY_ALIASES.includes(h.norm));
  if (annFound) map["anniversary_date"] = annFound.raw;

  // Fallback: if there's no exact "name" match, try the first column that
  // contains "name" and isn't already claimed.
  if (!map.full_name) {
    const guess = normalized.find((h) => h.norm.includes("name") && h.raw !== map.relationship);
    if (guess) map.full_name = guess.raw;
  }

  return map;
}

function rowsToContacts(rows: Record<string, unknown>[]): ParseResult {
  if (rows.length === 0) return { contacts: [], skippedRows: 0, totalRows: 0 };

  const headers = Object.keys(rows[0]);
  const colMap = buildColumnMap(headers);

  const contacts: ParsedContact[] = [];
  let skipped = 0;

  for (const row of rows) {
    const nameRaw = colMap.full_name ? row[colMap.full_name] : undefined;
    const name = nameRaw !== undefined && nameRaw !== null ? String(nameRaw).trim() : "";
    if (!name) {
      skipped++;
      continue;
    }

    const dobRaw = colMap.date_of_birth ? row[colMap.date_of_birth] : undefined;
    const dob = parseFlexibleDate(
      typeof dobRaw === "number" ? dobRaw : dobRaw !== undefined && dobRaw !== null ? String(dobRaw) : null
    );

    const annRaw = colMap.anniversary_date ? row[colMap.anniversary_date] : undefined;
    const ann = parseFlexibleDate(
      typeof annRaw === "number" ? annRaw : annRaw !== undefined && annRaw !== null ? String(annRaw) : null
    );

    contacts.push({
      full_name: name,
      date_of_birth: dob,
      anniversary_date: ann,
      relationship: colMap.relationship ? cleanStr(row[colMap.relationship]) : null,
      email: colMap.email ? cleanStr(row[colMap.email]) : null,
      phone: colMap.phone ? cleanStr(row[colMap.phone]) : null,
      notes: colMap.notes ? cleanStr(row[colMap.notes]) : null,
    });
  }

  return { contacts, skippedRows: skipped, totalRows: rows.length };
}

function cleanStr(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function parseCsv(buffer: Buffer): ParseResult {
  const text = buffer.toString("utf-8");
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return rowsToContacts(parsed.data);
}

export function parseXlsx(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
  return rowsToContacts(rows);
}
