"use client";

import { Contact } from "@/lib/types";
import { daysUntilNextOccurrence, formatFriendlyDate } from "@/lib/date-utils";
import { AlertCircle, Mail, Phone } from "lucide-react";

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

  return (
    <button
      onClick={onClick}
      className="card animate-float-in flex flex-col gap-3 p-4 text-left transition-transform hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm"
          style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
        >
          {initials(contact.full_name) || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-[var(--fg)]">{contact.full_name}</p>
          {contact.relationship && (
            // Neutral border/bg instead of the accent pairing: --accent is
            // user-customizable (Settings > Appearance) but --accent-soft is
            // a fixed indigo tint, so accent-colored text on it can go
            // low-contrast for lighter accent picks. This combo stays
            // readable in both themes no matter which accent is chosen.
            <span
              className="badge mt-1"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--fg)" }}
            >
              {contact.relationship}
            </span>
          )}
        </div>
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

      <div className="flex flex-col gap-1 text-xs text-[var(--muted)]">
        {contact.date_of_birth ? (
          <span>Birthday: {formatFriendlyDate(contact.date_of_birth)}</span>
        ) : (
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <AlertCircle size={12} /> No birthday on file — tap to add
          </span>
        )}
        {contact.anniversary_date && <span>Anniversary: {formatFriendlyDate(contact.anniversary_date)}</span>}
        {contact.email && (
          <span className="flex items-center gap-1 truncate">
            <Mail size={12} /> {contact.email}
          </span>
        )}
        {contact.phone && (
          <span className="flex items-center gap-1 truncate">
            <Phone size={12} /> {contact.phone}
          </span>
        )}
      </div>
    </button>
  );
}
