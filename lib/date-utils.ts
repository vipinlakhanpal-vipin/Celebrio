/**
 * Date helpers shared across the app. Birthdays are stored as a plain SQL
 * `date` (YYYY-MM-DD); the year is often just a placeholder if unknown.
 */

export function daysUntilNextOccurrence(isoDate: string, from: Date = new Date()): number {
  const dob = new Date(isoDate + "T00:00:00");
  const today = startOfDay(from);
  let next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  if (next < today) {
    next = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
  }
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

export function nextOccurrenceDate(isoDate: string, from: Date = new Date()): Date {
  const dob = new Date(isoDate + "T00:00:00");
  const today = startOfDay(from);
  let next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  if (next < today) {
    next = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
  }
  return next;
}

export function turningAge(isoDate: string, occurrence: Date): number | null {
  const dob = new Date(isoDate + "T00:00:00");
  if (dob.getFullYear() <= 1900) return null; // placeholder / unknown birth year
  return occurrence.getFullYear() - dob.getFullYear();
}

/** "1st", "2nd", "3rd", "4th", ... — used for "5th Anniversary" style labels. */
export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** ISO timestamp for N days before now — pulled into a helper so callers don't call Date.now() inline during render. */
export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function formatFriendlyDate(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Parses common human-entered date formats into an ISO YYYY-MM-DD string. */
export function parseFlexibleDate(input: string | number | Date | undefined | null): string | null {
  if (input === undefined || input === null || input === "") return null;

  if (input instanceof Date && !isNaN(input.getTime())) {
    return isoDateOnly(input);
  }

  if (typeof input === "number") {
    // Excel serial date (days since 1899-12-30)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(excelEpoch.getTime() + input * 86_400_000);
    if (!isNaN(d.getTime())) return isoDateOnly(d);
    return null;
  }

  const raw = String(input).trim();
  if (!raw) return null;

  // YYYY-MM-DD
  let m = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return isoFrom(+m[1], +m[2], +m[3]);

  // DD/MM/YYYY or MM/DD/YYYY (assume DD/MM if day > 12)
  m = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const year = +m[3];
    if (a > 12) return isoFrom(year, b, a); // a must be the day
    return isoFrom(year, a, b); // ambiguous: default to MM/DD/YYYY
  }

  // DD Month YYYY / Month DD, YYYY
  const monthNames =
    "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec";
  m = raw.match(new RegExp(`^(\\d{1,2})\\s+(${monthNames})[a-z]*\\s+(\\d{4})$`, "i"));
  if (m) return isoFrom(+m[3], monthIndex(m[2]), +m[1]);
  m = raw.match(new RegExp(`^(${monthNames})[a-z]*\\s+(\\d{1,2}),?\\s+(\\d{4})$`, "i"));
  if (m) return isoFrom(+m[3], monthIndex(m[1]), +m[2]);

  // No year given, e.g. "14 March" -> use placeholder year 1900 (unknown age)
  m = raw.match(new RegExp(`^(\\d{1,2})\\s+(${monthNames})[a-z]*$`, "i"));
  if (m) return isoFrom(1900, monthIndex(m[2]), +m[1]);

  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) return isoDateOnly(parsed);

  return null;
}

function monthIndex(name: string): number {
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  return months.indexOf(name.toLowerCase().slice(0, 3)) + 1;
}

function isoFrom(year: number, month: number, day: number): string | null {
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}
