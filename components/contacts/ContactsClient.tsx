"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { clsx } from "clsx";
import { Plus, Upload, Search, Users, CalendarHeart, CheckCircle2 } from "lucide-react";
import { Contact, relationshipCategory } from "@/lib/types";
import { daysUntilNextOccurrence } from "@/lib/date-utils";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { ContactCard } from "@/components/contacts/ContactCard";
import { ContactModal } from "@/components/contacts/ContactModal";
import { UploadModal } from "@/components/contacts/UploadModal";
import { PageHeader } from "@/components/PageHeader";

const CATEGORY_TABS = [
  { key: "all", label: "All" },
  { key: "family", label: "Family" },
  { key: "friends", label: "Friends" },
  { key: "colleagues", label: "Colleagues" },
  { key: "relatives", label: "Relatives" },
  { key: "others", label: "Others" },
  ];

export function ContactsClient({
  initialContacts,
  initialTab,
  pendingApprovalCount,
}: {
  initialContacts: Contact[];
  // Lets a link from elsewhere (e.g. the category chips on the Dashboard)
  // land directly on a filtered tab instead of always opening on "All".
  initialTab?: string;
  // Same "To approve" number shown on the Dashboard's stat tile — fetched
  // server-side there and here so both pages always agree.
  pendingApprovalCount: number;
}) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Contact | null | "new">(null);
  const [showUpload, setShowUpload] = useState(false);
  const [activeTab, setActiveTab] = useState(
    CATEGORY_TABS.some((t) => t.key === initialTab) ? initialTab! : "all"
  );

  // Same "days <= 30" formula as the Dashboard's Upcoming tile, computed
  // from this page's own contacts list so the number here matches what's
  // shown there.
  const upcomingWithin30 = useMemo(
    () =>
      contacts
        .flatMap((c) => {
          const out: number[] = [];
          if (c.date_of_birth) out.push(daysUntilNextOccurrence(c.date_of_birth));
          if (c.anniversary_date) out.push(daysUntilNextOccurrence(c.anniversary_date));
          return out;
        })
        .filter((d) => d <= 30).length,
    [contacts]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = !q
      ? contacts
      : contacts.filter(
          (c) =>
            c.full_name.toLowerCase().includes(q) ||
            (c.relationship || "").toLowerCase().includes(q)
        );
    if (activeTab !== "all") {
      list = list.filter((c) => {
        const category = relationshipCategory(c.relationship);
        // "Others" catches contacts with no relationship set, plus anything
        // typed in that doesn't match Family/Friends/Colleagues/Relatives —
        // so no contact ever silently disappears from every category tab.
        return activeTab === "others" ? category === null : category === activeTab;
      });
    }
    return [...list].sort((a, b) => {
      const da = a.date_of_birth ? daysUntilNextOccurrence(a.date_of_birth) : 9999;
      const db = b.date_of_birth ? daysUntilNextOccurrence(b.date_of_birth) : 9999;
      return da - db;
    });
  }, [contacts, query, activeTab]);

  async function refetch() {
    const res = await fetch("/api/contacts");
    const json = await res.json();
    if (res.ok) setContacts(json.contacts);
  }

  function handleSaved(contact: Contact) {
    setContacts((prev) => {
      const exists = prev.some((c) => c.id === contact.id);
      return exists ? prev.map((c) => (c.id === contact.id ? contact : c)) : [...prev, contact];
    });
    setEditing(null);
  }

  function handleDeleted(id: string) {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setEditing(null);
  }

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle={`${contacts.length} ${contacts.length === 1 ? "person" : "people"} in your list`}
        action={
          <div className="flex gap-2">
            <button onClick={() => setShowUpload(true)} className="btn-secondary">
              <Upload size={16} /> Import
            </button>
            <button onClick={() => setEditing("new")} className="btn-primary">
              <Plus size={16} /> Add contact
            </button>
          </div>
        }
      />

      {/* Same three stat tiles as the Dashboard, same colors, same numbers —
          so glancing at either page tells the same story. Smaller footprint
          on phones (tighter padding, smaller number/label) than desktop. */}
      <div className="mb-5 grid grid-cols-3 gap-1.5 sm:gap-3">
        <div
          className="rounded-2xl p-2 text-center shadow-md sm:p-4"
          style={{ background: "linear-gradient(150deg, #3d7cf7 0%, #2657c9 100%)" }}
        >
          <CalendarHeart size={12} className="mx-auto mb-0.5 text-white/85 sm:hidden" />
          <CalendarHeart size={16} className="mx-auto mb-1 hidden text-white/85 sm:block" />
          <p className="font-display text-base font-bold text-white sm:text-2xl">{upcomingWithin30}</p>
          <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-wide text-white/75 sm:mt-1 sm:text-[11px]">
            Upcoming
          </p>
        </div>
        <div
          className="rounded-2xl p-2 text-center shadow-md sm:p-4"
          style={{ background: "linear-gradient(150deg, #8b5cf6 0%, #6431e0 100%)" }}
        >
          <CheckCircle2 size={12} className="mx-auto mb-0.5 text-white/85 sm:hidden" />
          <CheckCircle2 size={16} className="mx-auto mb-1 hidden text-white/85 sm:block" />
          <p className="font-display text-base font-bold text-white sm:text-2xl">{pendingApprovalCount}</p>
          <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-wide text-white/75 sm:mt-1 sm:text-[11px]">
            To approve
          </p>
        </div>
        <div
          className="rounded-2xl p-2 text-center shadow-md sm:p-4"
          style={{ background: "linear-gradient(150deg, #12b981 0%, #0a8f63 100%)" }}
        >
          <Users size={12} className="mx-auto mb-0.5 text-white/85 sm:hidden" />
          <Users size={16} className="mx-auto mb-1 hidden text-white/85 sm:block" />
          <p className="font-display text-base font-bold text-white sm:text-2xl">{contacts.length}</p>
          <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-wide text-white/75 sm:mt-1 sm:text-[11px]">
            Contacts
          </p>
        </div>
      </div>

      {/* One flowing, horizontally-scrolling row — same treatment as the
          category chips on the Home page — instead of wrapping onto a
          second line.

          Every tab is always the same solid color used for it everywhere
          else (Dashboard chips included) — not just when it's the active
          filter — so this row matches the Home page look exactly. The
          active tab is picked out with full opacity + a ring in its own
          color; the rest dim slightly so the current filter still reads
          clearly at a glance. */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {CATEGORY_TABS.map((t) => {
          const colors = CATEGORY_COLORS[t.key];
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={clsx(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition-all",
                active ? "opacity-100 ring-2 ring-offset-2 ring-offset-[var(--bg)]" : "opacity-70 hover:opacity-90"
              )}
              style={
                {
                  background: colors ? colors.gradient : "var(--accent)",
                  "--tw-ring-color": colors ? colors.ring : "var(--accent)",
                } as CSSProperties
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          className="input pl-9"
          placeholder="Search by name or relationship"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "var(--accent-soft)" }}
          >
            <Users className="text-[var(--accent)]" size={26} />
          </div>
          <p className="font-medium text-[var(--fg)]">
            {contacts.length === 0 ? "No contacts yet" : "No matches"}
          </p>
          <p className="max-w-xs text-sm text-[var(--muted)]">
            {contacts.length === 0
              ? "Import a CSV/Excel file of your contacts, or add someone manually to get started."
              : "Try a different search."}
          </p>
          {contacts.length === 0 && (
            <div className="mt-2 flex gap-2">
              <button onClick={() => setShowUpload(true)} className="btn-secondary">
                <Upload size={16} /> Import file
              </button>
              <button onClick={() => setEditing("new")} className="btn-primary">
                <Plus size={16} /> Add manually
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <ContactCard key={c.id} contact={c} onClick={() => setEditing(c)} />
          ))}
        </div>
      )}

      {editing && (
        <ContactModal
          contact={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onDone={refetch}
        />
      )}
    </div>
  );
}
