"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Users, CalendarHeart, CheckCircle2, Sparkles as SparklesIcon, X, Home, Briefcase, Heart, UserCircle2 } from "lucide-react";
import { Approval, Contact, OccasionPrompt, relationshipCategory } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { daysUntilNextOccurrence, formatFriendlyDate, nextOccurrenceDate, ordinal, turningAge } from "@/lib/date-utils";
import { gradientFor, initials } from "@/components/contacts/ContactCard";
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
              // null for the "unknown year" placeholder some dates use — in
              // that case we genuinely don't know the age/anniversary count,
              // so we fall back to the plain occasion word with no ordinal.
              const age = turningAge(item.date, nextOccurrenceDate(item.date));
              const occasionWord = item.kind === "birthday" ? "Birthday" : "Anniversary";
              const occasionLabel = age !== null ? `${ordinal(age)} ${occasionWord}` : occasionWord;
              const icon = item.kind === "birthday" ? "🎂" : "💕";
              return (
              // Same split-tile pattern as the Contacts cards: who (avatar,
              // name, relationship) on the left, the rest of the details on
              // the right, divided by a thin rule — instead of stacking
              // everything top-to-bottom in one column.
              <div key={`${item.contact.id}-${item.kind}`} className="flex items-stretch gap-3 p-3">
                <div className="flex w-[42%] shrink-0 flex-col items-start gap-2">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ background: `linear-gradient(135deg, ${gradientFor(item.contact.full_name).join(",")})` }}
                  >
                    {initials(item.contact.full_name)}
                  </span>
                  <p className="break-words text-sm font-medium leading-snug text-[var(--fg)]">
                    {item.contact.full_name}
                  </p>
                  {item.contact.relationship && (
                    <p className="break-words text-xs text-[var(--muted)]">{item.contact.relationship}</p>
                  )}
                </div>

                <div className="w-px shrink-0 self-stretch" style={{ background: "var(--border)" }} />

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                  <span
                    className="badge w-fit shrink-0 whitespace-nowrap"
                    style={
                      item.days === 0
                        ? { background: "var(--accent)", color: "var(--accent-fg)" }
                        : { background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--muted)" }
                    }
                  >
                    {item.days === 0 ? (
                      "Today 🎉"
                    ) : (
                      <>
                        {item.days} Day{item.days === 1 ? "" : "s"}
                        {/* "Remaining" only fits alongside everything else once the
                            row has room to breathe (sm breakpoint+) — hidden on a
                            mobile-width screen so nothing wraps or gets clipped. */}
                        <span className="hidden sm:inline">&nbsp;Remaining</span>
                      </>
                    )}
                  </span>
                  {/* Occasion + count merged into one line ("52nd Birthday"),
                      with a small icon so birthdays and anniversaries read apart
                      at a glance without parsing the text. Fixed amber/pink instead
                      of --accent: --accent is user-customizable (Settings >
                      Appearance) and a darker custom pick could go low-contrast
                      on the dark card background — these have explicit dark:
                      overrides so they stay readable no matter the theme. */}
                  <p
                    className={`flex items-center gap-1.5 text-xs font-semibold ${
                      item.kind === "birthday"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-pink-600 dark:text-pink-400"
                    }`}
                  >
                    {occasionLabel}
                    <span aria-hidden="true">{icon}</span>
                  </p>
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
