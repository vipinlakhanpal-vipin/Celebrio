"use client";

import { useState } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { Contact, OccasionPrompt } from "@/lib/types";
import { gradientFor, initials } from "@/components/contacts/ContactCard";

export function OccasionPickerModal({
  prompt,
  contacts,
  onClose,
  onDone,
}: {
  prompt: OccasionPrompt;
  contacts: Contact[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number } | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch(`/api/occasions/prompts/${prompt.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: Array.from(selected) }),
      });
      const json = await res.json();
      if (res.ok) setResult({ created: json.created });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center">
      <div className="animate-float-in flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--card)] shadow-lg md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <h2 className="text-lg font-semibold text-[var(--fg)]">
            {prompt.occasion_type?.emoji} {prompt.occasion_type?.name}
          </h2>
          <button onClick={onClose} className="btn-ghost">
            <X size={18} />
          </button>
        </div>

        {result ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <CheckCircle2 className="text-emerald-500" size={36} />
            <p className="text-sm font-medium text-[var(--fg)]">
              {result.created} greeting{result.created === 1 ? "" : "s"} drafted
            </p>
            <p className="text-xs text-[var(--muted)]">Head to Approvals to review and send them.</p>
            <button onClick={onDone} className="btn-primary mt-3">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-2">
              {contacts.length === 0 ? (
                <p className="p-4 text-sm text-[var(--muted)]">Add some contacts first.</p>
              ) : (
                contacts.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl p-2.5 hover:bg-[var(--bg-elevated)]"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                      style={{ background: `linear-gradient(135deg, ${gradientFor(c.full_name).join(",")})` }}
                    >
                      {initials(c.full_name)}
                    </span>
                    <span className="text-sm text-[var(--fg)]">{c.full_name}</span>
                    {c.relationship && <span className="text-xs text-[var(--muted)]">{c.relationship}</span>}
                  </label>
                ))
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] p-4">
              <button
                onClick={() => setSelected(new Set(contacts.map((c) => c.id)))}
                className="text-xs font-medium text-[var(--accent)]"
              >
                Select all
              </button>
              <button onClick={generate} disabled={busy || selected.size === 0} className="btn-primary">
                {busy ? <Loader2 size={16} className="animate-spin" /> : `Draft ${selected.size || ""} greeting${selected.size === 1 ? "" : "s"}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
