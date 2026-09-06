"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Users, CalendarHeart, CheckCircle2, Sparkles as SparklesIcon, X, Home, Briefcase, Heart, UserCircle2, Cake, Mail, Phone, MapPin } from "lucide-react";
import { Approval, Contact, OccasionPrompt, relationshipCategory } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { daysUntilNextOccurrence, formatFriendlyDate, nextOccurrenceDate, ordinal, turningAge } from "@/lib/date-utils";
import { gradientFor, initials, whatsappLink, WhatsAppIcon } from "@/components/contacts/ContactCard";
import { PageHeader } from "@/components/PageHeader";
import { OccasionPickerModal } from "@/components/dashboard/OccasionPickerModal";

type UpcomingItem = {
  contact: Contact;
  kind: "birthday" | "anniversary";
  days: number;
  date: string;
};

export function DashboardClient({
  firstName,
  contactCount,
  pendingApprovals,
  contacts,
  occasionPrompts,
}: {
  firstName: string;
  contactCount: number;
  pendingApprovals: Approval[];
  contacts: Contact[];
  occasionPrompts: OccasionPrompt[];
}) {
  const [prompts, setPrompts] = useState(occasionPrompts);
  const [pickerPrompt, setPickerPrompt] = useState<OccasionPrompt | null>(null);

  const upcoming: UpcomingItem[] = contacts
    .flatMap((c) => {
      const items: UpcomingItem[] = [];
      if (c.date_of_birth) {
        items.push({ contact: c, kind: "birthday", days: daysUntilNextOccurrence(c.date_of_birth), date: c.date_of_birth });
      }
      if (c.anniversary_date) {
        items.push({
          contact: c,
          kind: "anniversary",
          days: daysUntilNextOccurrence(c.anniversary_date),
          date: c.anniversary_date,
        });
      }
      return items;
    })
    .sort((a, b) => a.days - b.days)
    .slice(0, 8);

  const upcomingWithin30 = contacts
    .flatMap((c) => {
      const out: number[] = [];
      if (c.date_of_birth) out.push(daysUntilNextOccurrence(c.date_of_birth));
      if (c.anniversary_date) out.push(daysUntilNextOccurrence(c.anniversary_date));
      return out;
    })
    .filter((d) => d <= 30).length;

  // Same Family / Friends / Colleagues / Relatives / Others grouping as the
  // Contacts page tabs, surfaced here too so the categories are visible
  // without having to open Contacts first. Each chip links straight to the
  // matching tab there.
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { family: 0, friends: 0, colleagues: 0, relatives: 0, others: 0 };
    for (const c of contacts) {
      const category = relationshipCategory(c.relationship);
      counts[category ?? "others"] += 1;
    }
    return counts;
  }, [contacts]);

  // Each category gets its own bold gradient fill (same treatment as the
  // stat tiles above, and the same palette used on the Contacts page's
  // filter tabs) so Family/Friends/Colleagues/Relatives/Others read apart
  // at a glance — the previous pastel tint was too low-contrast to read
  // comfortably in either theme.
  const CATEGORIES = [
    { key: "family", label: "Family", icon: Home },
    { key: "friends", label: "Friends", icon: Users },
    { key: "colleagues", label: "Colleagues", icon: Briefcase },
    { key: "relatives", label: "Relatives", icon: Heart },
    { key: "others", label: "Others", icon: UserCircle2 },
  ] as const;

  async function dismissPrompt(id: string) {
    setPrompts((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/occasions/prompts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "dismissed" }),
    });
  }

  return (
    <div>
      <PageHeader title={`Welcome, ${firstName}`} subtitle="Here's what's coming up" />

      {prompts.length > 0 && (
        <div className="mb-5 flex flex-col gap-2">
          {prompts.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-white shadow-sm"
              style={{ background: "linear-gradient(135deg, var(--gradient-a), var(--gradient-c))" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{p.occasion_type?.emoji}</span>
                <p className="text-sm font-medium">
                  {p.occasion_type?.name} is on {formatFriendlyDate(p.occasion_date)} — send greetings to your loved ones?
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setPickerPrompt(p)} className="rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-[var(--fg)]">
                  Choose contacts
                </button>
                <button onClick={() => dismissPrompt(p.id)} className="rounded-full bg-white/15 p-1.5">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Each tile gets its own solid gradient instead of the flat/gray
          card look — Upcoming (blue), To approve (violet), Contacts
          (emerald) — so the three numbers that matter most are the first
          thing your eye lands on. */}
      {/* Smaller footprint on phones (tighter padding, smaller number/label)
          than on desktop — three cards at full desktop size were crowding
          out everything below the fold on a phone screen. */}
      <div className="mb-6 grid grid-cols-3 gap-1 sm:gap-3">
        <div
          className="rounded-2xl p-1.5 text-center shadow-md sm:p-4"
          style={{ background: "linear-gradient(150deg, #3d7cf7 0%, #2657c9 100%)" }}
        >
          <CalendarHeart size={10} className="mx-auto mb-0.5 text-white/85 sm:hidden" />
          <CalendarHeart size={16} className="mx-auto mb-1 hidden text-white/85 sm:block" />
          <p className="font-display text-lg font-bold text-white sm:text-2xl">{upcomingWithin30}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/75 sm:mt-1 sm:text-[11px]">
            Upcoming
          </p>
        </div>
        <div
          className="rounded-2xl p-1.5 text-center shadow-md sm:p-4"
          style={{ background: "linear-gradient(150deg, #8b5cf6 0%, #6431e0 100%)" }}
        >
          <CheckCircle2 size={10} className="mx-auto mb-0.5 text-white/85 sm:hidden" />
          <CheckCircle2 size={16} className="mx-auto mb-1 hidden text-white/85 sm:block" />
          <p className="font-display text-lg font-bold text-white sm:text-2xl">{pendingApprovals.length}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/75 sm:mt-1 sm:text-[11px]">
            To approve
          </p>
        </div>
        <div
          className="rounded-2xl p-1.5 text-center shadow-md sm:p-4"
          style={{ background: "linear-gradient(150deg, #12b981 0%, #0a8f63 100%)" }}
        >
          <Users size={10} className="mx-auto mb-0.5 text-white/85 sm:hidden" />
          <Users size={16} className="mx-auto mb-1 hidden text-white/85 sm:block" />
          <p className="font-display text-lg font-bold text-white sm:text-2xl">{contactCount}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/75 sm:mt-1 sm:text-[11px]">
            Contacts
          </p>
        </div>
      </div>

      {contactCount > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Categories</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map(({ key, label, icon: Icon }) => (
              <Link
                key={key}
                href={`/contacts?tab=${key}`}
                className="flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2.5 text-white shadow-sm transition-transform hover:-translate-y-0.5"
                style={{ background: CATEGORY_COLORS[key].gradient }}
              >
                <Icon size={15} />
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs font-semibold opacity-80">{categoryCounts[key]}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {pendingApprovals.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Needs your approval</h2>
            <Link href="/approvals" className="text-xs font-semibold text-[var(--accent)]">
              See all
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {pendingApprovals.slice(0, 3).map((a) => (
              <Link
                key={a.id}
                href="/approvals"
                className="card flex items-center gap-3 p-3 transition-transform hover:-translate-y-0.5"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${gradientFor(a.contact!.full_name).join(",")})` }}
                >
                  {initials(a.contact!.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--fg)]">{a.contact!.full_name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {a.occasion_label || (a.occasion_type === "anniversary" ? "Anniversary" : "Birthday")} ·{" "}
                    {formatFriendlyDate(a.occasion_date)}
                  </p>
                </div>
                <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">Review</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
            <CalendarHeart className="text-[var(--muted)]" size={24} />
            <p className="text-sm text-[var(--muted)]">
              No upcoming dates yet.{" "}
              <Link href="/contacts" className="font-medium text-[var(--accent)]">
                Add contacts
              </Link>{" "}
              to get started.
            </p>
          </div>
        ) : (
          <div className="card divide-y divide-[var(--border)]">
            {upcoming.map((item) => {
              const icon = item.kind === "birthday" ? "🎂" : "💕";
              // null for the "unknown year" placeholder some dates use — in
              // that case we genuinely don't know the age/anniversary count,
              // so the detail line below falls back to just the plain date.
              const birthdayAge = item.contact.date_of_birth
                ? turningAge(item.contact.date_of_birth, nextOccurrenceDate(item.contact.date_of_birth))
                : null;
              const anniversaryYears = item.contact.anniversary_date
                ? turningAge(item.contact.anniversary_date, nextOccurrenceDate(item.contact.anniversary_date))
                : null;
              return (
              // Same split-tile pattern as the Contacts cards — avatar sits
              // inline right before the name instead of stacked above it,
              // and the relationship is the same neutral badge — so an
              // upcoming entry here looks like the same contact you'd find
              // on the Contacts tab, not a differently-styled one-off.
              <div key={`${item.contact.id}-${item.kind}`} className="relative flex items-stretch gap-3 p-3">
                {/* The days-remaining count used to be the headline of the
                    row (a big centered badge) — now that the right half
                    carries the same full detail as the Contacts tab, it
                    moves into this small corner badge instead, and only
                    shows up once the occasion is close (≤7 days), same
                    threshold as the Contacts tab's own corner badge. */}
                {item.days <= 7 && (
                  <div className="absolute right-3 top-3">
                    <span
                      className={`badge shrink-0 whitespace-nowrap ${
                        item.kind === "birthday"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                          : "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400"
                      }`}
                    >
                      {icon} {item.days === 0 ? "Today" : `${item.days}d`}
                    </span>
                  </div>
                )}

                {/* gap-1 (not 1.5) — same reasoning as the Contacts tab's
                    ContactCard: the avatar's own height already pads this
                    row out, so the full 1.5 gap read as too much space
                    between the name and the relationship badge below it. */}
                <div className="flex w-[46%] shrink-0 flex-col items-start gap-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${gradientFor(item.contact.full_name).join(",")})` }}
                    >
                      {initials(item.contact.full_name)}
                    </span>
                    {/* Same fixed 11px as the Contacts tab's ContactCard —
                        the app's 18px root font-size makes rem-based text
                        sizes land bigger than they look elsewhere, and 11px
                        is what reliably keeps a two-word name on one line
                        in this ~88px-wide column. */}
                    <p className="min-w-0 break-words text-[11px] font-medium leading-snug text-[var(--fg)]">
                      {item.contact.full_name}
                    </p>
                  </div>
                  {item.contact.relationship && (
                    // fontSize/fontWeight override .badge's own 0.72rem/600
                    // so this matches the 11px/500 name right above it,
                    // same as the Contacts tab's ContactCard.
                    <span
                      className="badge"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                        color: "var(--fg)",
                        fontSize: "11px",
                        fontWeight: 500,
                      }}
                    >
                      {item.contact.relationship}
                    </span>
                  )}
                </div>

                <div className="w-px shrink-0 self-stretch" style={{ background: "var(--border)" }} />

                {/* Same field set and layout as the Contacts tab's
                    ContactCard right half — birthday, anniversary, email,
                    phone + WhatsApp button, address — so an Upcoming entry
                    here is the same contact card, not a condensed stand-in. */}
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 text-xs text-[var(--muted)]">
                  {item.contact.date_of_birth && (
                    <span className="flex items-start gap-1.5">
                      <Cake size={12} className="mt-0.5 shrink-0" />
                      <span className="break-words">
                        {formatFriendlyDate(item.contact.date_of_birth)}
                        {birthdayAge !== null && ` · Turning ${birthdayAge}`}
                      </span>
                    </span>
                  )}
                  {item.contact.anniversary_date && (
                    <span className="flex items-start gap-1.5">
                      <Heart size={12} className="mt-0.5 shrink-0" />
                      <span className="break-words">
                        {formatFriendlyDate(item.contact.anniversary_date)}
                        {anniversaryYears !== null && ` · ${ordinal(anniversaryYears)} Anniv.`}
                      </span>
                    </span>
                  )}
                  {item.contact.email && (
                    <span className="flex items-center gap-1.5 truncate">
                      <Mail size={12} className="shrink-0" /> <span className="truncate">{item.contact.email}</span>
                    </span>
                  )}
                  {item.contact.phone && (
                    <span className="flex items-center gap-1.5 truncate">
                      <Phone size={12} className="shrink-0" />
                      <span className="truncate">{item.contact.phone}</span>
                      {/* A span, not a nested <a>/<button> — the whole row
                          sits inside a card, and stopping propagation here
                          keeps the tap from bubbling to anything above it. */}
                      <span
                        role="button"
                        aria-label={`Message ${item.contact.full_name} on WhatsApp`}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(whatsappLink(item.contact.phone!), "_blank", "noopener,noreferrer");
                        }}
                        className="relative ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white before:absolute before:-inset-1.5 before:content-['']"
                        style={{ background: "#25D366" }}
                      >
                        <WhatsAppIcon size={14} />
                      </span>
                    </span>
                  )}
                  {item.contact.address && (
                    <span className="flex items-start gap-1.5">
                      <MapPin size={12} className="mt-0.5 shrink-0" />
                      <span className="break-words">{item.contact.address}</span>
                    </span>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      <Link
        href="/aria"
        className="card mt-6 flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5"
        style={{ background: "var(--accent-soft)", borderColor: "transparent" }}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: "var(--accent)" }}>
          <SparklesIcon size={18} />
        </span>
        <div>
          <p className="text-sm font-medium text-[var(--fg)]">Need help writing something?</p>
          <p className="text-xs text-[var(--muted)]">Ask Aria to draft or rewrite a greeting</p>
        </div>
      </Link>

      <Link
        href="/contacts"
        className="mt-3 flex items-center gap-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--fg)]"
      >
        <Users size={13} /> Manage your contacts
      </Link>

      {pickerPrompt && (
        <OccasionPickerModal
          prompt={pickerPrompt}
          contacts={contacts}
          onClose={() => setPickerPrompt(null)}
          onDone={() => {
            setPrompts((prev) => prev.filter((p) => p.id !== pickerPrompt.id));
            setPickerPrompt(null);
          }}
        />
      )}
    </div>
  );
}
