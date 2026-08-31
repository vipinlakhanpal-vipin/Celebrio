"use client";

import Link from "next/link";
import { useState } from "react";
import { Users, CalendarHeart, Sparkles as SparklesIcon, X } from "lucide-react";
import { Approval, Contact, OccasionPrompt } from "@/lib/types";
import { daysUntilNextOccurrence, formatFriendlyDate } from "@/lib/date-utils";
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

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="font-display text-2xl font-bold text-[var(--fg)]">{upcomingWithin30}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Upcoming</p>
        </div>
        <div className="card p-4 text-center" style={{ background: "var(--accent-soft)", borderColor: "transparent" }}>
          <p className="font-display text-2xl font-bold text-[var(--accent)]">{pendingApprovals.length}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">To approve</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-display text-2xl font-bold text-[var(--fg)]">{contactCount}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Contacts</p>
        </div>
      </div>

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
            {upcoming.map((item) => (
              <div key={`${item.contact.id}-${item.kind}`} className="flex items-center gap-3 p-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${gradientFor(item.contact.full_name).join(",")})` }}
                >
                  {initials(item.contact.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--fg)]">{item.contact.full_name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {item.contact.relationship || "Contact"} · {item.kind === "birthday" ? "Birthday" : "Anniversary"}
                  </p>
                </div>
                <span
                  className="badge shrink-0"
                  style={
                    item.days === 0
                      ? { background: "var(--accent)", color: "var(--accent-fg)" }
                      : { background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--muted)" }
                  }
                >
                  {item.days === 0 ? "Today 🎉" : `${item.days}d`}
                </span>
              </div>
            ))}
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
