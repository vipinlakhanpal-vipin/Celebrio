"use client";

import { Contact } from "@/lib/types";
import { daysUntilNextOccurrence, formatFriendlyDate, nextOccurrenceDate, ordinal, turningAge } from "@/lib/date-utils";
import { AlertCircle, Cake, Heart, Mail, Phone } from "lucide-react";

const AVATAR_GRADIENTS = [
  ["#ff8fab", "#ffd36e"],
  ["#8b5cf6", "#60a5fa"],
  ["#22d3ee", "#22c55e"],
  ["#f472b6", "#a855f7"],
  ["#fb923c", "#f43f5e"],
];

export function gradientFor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function ContactCard({ contact, onClick }: { contact: Contact; onClick: () => void }) {
  const [from, to] = gradientFor(contact.full_name);
  const days = contact.date_of_birth ? daysUntilNextOccurrence(contact.date_of_birth) : null;
  const annDays = contact.anniversary_date ? daysUntilNextOccurrence(contact.anniversary_date) : null;
  // null when the stored date uses the "unknown year" placeholder — nothing
  // to show in that case, since we don't actually know how old they're turning.
  const birthdayAge = contact.date_of_birth
    ? turningAge(contact.date_of_birth, nextOccurrenceDate(contact.date_of_birth))
    : null;
  const anniversaryYears = contact.anniversary_date
    ? turningAge(contact.anniversary_date, nextOccurrenceDate(contact.anniversary_date))
    : null;
  const hasSoonBadge = (days !== null && days <= 7) || (annDays !== null && annDays <= 7);

  return (
    <button
      onClick={onClick}
      className="card animate-float-in relative flex items-stretch gap-3.5 p-3.5 text-left transition-transform hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
    >
      {/* Pinned to the corner instead of sitting inline with the name now
          that the tile is split into two columns — there's no single row
          left for it to live in, and the corner keeps it visible no matter
          how much room the name or the details need. */}
      {hasSoonBadge && (
        <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
          {days !== null && days <= 7 && (
            <span className="badge shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
              🎂 {days === 0 ? "Today" : `${days}d`}
            </span>
          )}
          {annDays !== null && annDays <= 7 && (
            <span className="badge shrink-0 bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400">
              💕 {annDays === 0 ? "Today" : `${annDays}d`}
            </span>
          )}
        </div>
      )}

      {/* Left half: who — avatar, name, relationship. */}
      <div className="flex w-[42%] shrink-0 flex-col items-start gap-2">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm"
          style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
        >
          {initials(contact.full_name) || "?"}
        </div>
        <p className="break-words font-medium leading-snug text-[var(--fg)]">{contact.full_name}</p>
        {contact.relationship && (
          // Neutral border/bg instead of the accent pairing: --accent is
          // user-customizable (Settings > Appearance) but --accent-soft is
          // a fixed indigo tint, so accent-colored text on it can go
          // low-contrast for lighter accent picks. This combo stays
          // readable in both themes no matter which accent is chosen.
          <span
            className="badge"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--fg)" }}
          >
            {contact.relationship}
          </span>
        )}
      </div>

      {/* Thin rule between the two halves — the same tile, just divided. */}
      <div className="w-px shrink-0 self-stretch" style={{ background: "var(--border)" }} />

      {/* Right half: the rest — birthday, anniversary, email, phone. */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 text-xs text-[var(--muted)]">
        {contact.date_of_birth ? (
          <span className="flex items-center gap-1.5 truncate">
            <Cake size={12} className="shrink-0" />
            <span className="truncate">
              {formatFriendlyDate(contact.date_of_birth)}
              {birthdayAge !== null && ` · Turning ${birthdayAge}`}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <AlertCircle size={12} className="shrink-0" /> No birthday on file
          </span>
        )}
        {contact.anniversary_date && (
          <span className="flex items-center gap-1.5 truncate">
            <Heart size={12} className="shrink-0" />
            <span className="truncate">
              {formatFriendlyDate(contact.anniversary_date)}
              {anniversaryYears !== null && ` · ${ordinal(anniversaryYears)} Anniv.`}
            </span>
          </span>
        )}
        {contact.email && (
          <span className="flex items-center gap-1.5 truncate">
            <Mail size={12} className="shrink-0" /> <span className="truncate">{contact.email}</span>
          </span>
        )}
        {contact.phone && (
          <span className="flex items-center gap-1.5 truncate">
            <Phone size={12} className="shrink-0" /> <span className="truncate">{contact.phone}</span>
          </span>
        )}
      </div>
    </button>
  );
}
