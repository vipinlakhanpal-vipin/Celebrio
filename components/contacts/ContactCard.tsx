"use client";

import { Contact } from "@/lib/types";
import { daysUntilNextOccurrence, formatFriendlyDate, nextOccurrenceDate, ordinal, turningAge } from "@/lib/date-utils";
import { AlertCircle, Cake, Heart, Mail, MapPin, Phone } from "lucide-react";

// Strips everything but digits so "+971 50 392 0013" becomes a wa.me-safe
// number — WhatsApp's own click-to-chat links don't tolerate spaces,
// dashes, or the leading "+".
function whatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

// A small brand-accurate glyph instead of a generic chat-bubble icon, so it
// reads as "open WhatsApp" at a glance rather than just "message".
function WhatsAppIcon({ size = 12 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.67.15-.198.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.148.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.004 2.003c-5.514 0-9.997 4.483-9.997 9.997 0 1.762.462 3.486 1.34 5.003L2 22l5.116-1.334a9.96 9.96 0 0 0 4.888 1.28h.004c5.514 0 9.997-4.483 9.997-9.997 0-2.67-1.04-5.18-2.928-7.068a9.93 9.93 0 0 0-7.073-2.878zm0 18.187h-.003a8.2 8.2 0 0 1-4.177-1.144l-.3-.178-3.036.792.81-2.96-.196-.304a8.19 8.19 0 0 1-1.256-4.396c0-4.529 3.686-8.214 8.216-8.214a8.16 8.16 0 0 1 5.813 2.408 8.16 8.16 0 0 1 2.406 5.814c0 4.53-3.686 8.182-8.277 8.182z" />
    </svg>
  );
}

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
      className="card animate-float-in relative flex items-stretch gap-3 p-3 text-left transition-transform hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
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

      {/* Left half: who — avatar sits right before the name on the same
          row instead of stacked above it, sized to the name's own line
          height rather than a big standalone circle. That's a full row of
          vertical space cut out of every tile — on the single-column mobile
          grid that difference is what lets noticeably more contacts fit on
          screen at once instead of one or two before you have to scroll. */}
      <div className="flex w-[42%] shrink-0 flex-col items-start gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
          >
            {initials(contact.full_name) || "?"}
          </span>
          <p className="min-w-0 break-words font-medium leading-snug text-[var(--fg)]">{contact.full_name}</p>
        </div>
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
          // No truncate here (or on anniversary, below) — "Sep 17 · Turning
          // 55" was getting clipped to "Sep 17 · Turning 5…" in the narrower
          // right column on phone widths. Same items-start + break-words
          // treatment as the address line: wraps to a second line instead
          // of cutting text off, and the tile just grows to fit.
          <span className="flex items-start gap-1.5">
            <Cake size={12} className="mt-0.5 shrink-0" />
            <span className="break-words">
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
          <span className="flex items-start gap-1.5">
            <Heart size={12} className="mt-0.5 shrink-0" />
            <span className="break-words">
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
            <Phone size={12} className="shrink-0" />
            <span className="truncate">{contact.phone}</span>
            {/* A span, not a nested <a>/<button> — the whole card is
                already a <button>, and stopping propagation here keeps the
                tap from also opening the edit modal underneath it. */}
            <span
              role="button"
              aria-label={`Message ${contact.full_name} on WhatsApp`}
              onClick={(e) => {
                e.stopPropagation();
                window.open(whatsappLink(contact.phone!), "_blank", "noopener,noreferrer");
              }}
              className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white"
              style={{ background: "#25D366" }}
            >
              <WhatsAppIcon size={10} />
            </span>
          </span>
        )}
        {contact.address && (
          // Unlike the single-line fields above, address is allowed to wrap
          // instead of truncating — items-start (not items-center) keeps the
          // pin icon pinned to the first line rather than drifting to the
          // vertical center once the text wraps to 2-3 lines. No line-clamp
          // here on purpose: the card isn't a fixed height, so it just grows
          // to fit however long the address runs.
          <span className="flex items-start gap-1.5">
            <MapPin size={12} className="mt-0.5 shrink-0" />
            <span className="break-words">{contact.address}</span>
          </span>
        )}
      </div>
    </button>
  );
}
