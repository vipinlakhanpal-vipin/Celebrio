"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { Plus, Upload, Search, Users } from "lucide-react";
import { Contact, relationshipCategory } from "@/lib/types";
import { daysUntilNextOccurrence } from "@/lib/date-utils";
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
  ];

export function ContactsClient({ initialContacts }: { initialContacts: Contact[] }) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Contact | null | "new">(null);
  const [showUpload, setShowUpload] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

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
      list = list.filter((c) => relationshipCategory(c.relationship) === activeTab);
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

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {CATEGORY_TABS.map((t) => (
      <button
        key={t.key}
        onClick={() => setActiveTab(t.key)}
        className={clsx("shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors", activeTab === t.key ? "text-[var(--accent-fg)]" : "border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--fg)]")}
        style={activeTab === t.key ? { background: "var(--accent)" } : undefined}
        >
        {t.label}
      </button>
      ))}
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
