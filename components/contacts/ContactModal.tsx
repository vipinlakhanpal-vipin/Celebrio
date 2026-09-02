"use client";

import { useState } from "react";
import { X, Loader2, Trash2 } from "lucide-react";
import { Contact, RELATIONSHIP_OPTIONS } from "@/lib/types";

export function ContactModal({
  contact,
  onClose,
  onSaved,
  onDeleted,
}: {
  contact: Contact | null;
  onClose: () => void;
  onSaved: (c: Contact) => void;
  onDeleted?: (id: string) => void;
}) {
  const [form, setForm] = useState({
    full_name: contact?.full_name || "",
    relationship: contact?.relationship || "",
    date_of_birth: contact?.date_of_birth || "",
    anniversary_date: contact?.anniversary_date || "",
    email: contact?.email || "",
    phone: contact?.phone || "",
    address: contact?.address || "",
    notes: contact?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(contact ? `/api/contacts/${contact.id}` : "/api/contacts", {
        method: contact ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong");
      onSaved(json.contact);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!contact) return;
    if (!confirm(`Remove ${contact.full_name} from your contacts?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete contact");
      onDeleted?.(contact.id);
    } catch {
      setError("Could not delete contact");
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center">
      <div className="animate-float-in max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-lg md:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--fg)]">
            {contact ? "Edit contact" : "Add contact"}
          </h2>
          <button onClick={onClose} className="btn-ghost">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Name *</label>
            <input
              className="input"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Jane Doe"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Relationship</label>
            <input
              className="input"
              list="relationship-options"
              value={form.relationship}
              onChange={(e) => setForm({ ...form, relationship: e.target.value })}
              placeholder="e.g. Friend, Sister, Manager"
            />
            <datalist id="relationship-options">
              {RELATIONSHIP_OPTIONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Date of birth</label>
              <input
                type="date"
                className="input"
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Anniversary</label>
              <input
                type="date"
                className="input"
                value={form.anniversary_date}
                onChange={(e) => setForm({ ...form, anniversary_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@email.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Phone (WhatsApp)</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+9715xxxxxxx"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Address</label>
            <input
              className="input"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="123 Palm St, Dubai, UAE"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Notes</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Loves hiking, favorite color purple..."
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="mt-2 flex items-center justify-between gap-2">
            {contact ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="btn-ghost text-red-500 hover:text-red-500"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Remove
              </button>
            ) : (
              <span />
            )}
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Save contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
