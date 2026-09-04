"use client";

import { useRef, useState } from "react";
import {
  X,
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  FileUp,
  ChevronLeft,
} from "lucide-react";
import { parseVCardText, type PickedContact } from "@/lib/contacts/vcard";

type UploadSummary = {
  inserted: number;
  missingDob: number;
  skippedRows: number;
  totalRowsInFile: number;
};

// A candidate pulled from the phone's native picker or a .vcf file, plus the
// bits the review checklist needs — a stable key to render/toggle by, and
// whether it's currently checked for import.
type ReviewRow = PickedContact & { key: string; selected: boolean };

function toReviewRows(contacts: PickedContact[]): ReviewRow[] {
  return contacts.map((c, i) => ({ ...c, key: `${i}-${c.full_name}`, selected: true }));
}

// Contact Picker API support today is Chrome/Chromium on Android only — no
// iOS Safari, no desktop browser. Feature-detecting it is also how we avoid
// showing a button that would just throw on every other platform.
function deviceContactPickerSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.contacts?.select;
}

export function UploadModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const vcfInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<UploadSummary | null>(null);

  // When set, the modal shows the select/deselect checklist instead of the
  // drop zone — populated either from the device's native contact picker or
  // from a parsed .vcf file, both funnel into the same review step.
  const [review, setReview] = useState<ReviewRow[] | null>(null);
  const [reviewSource, setReviewSource] = useState<"device" | "vcf" | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/contacts/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setSummary(json);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  async function handlePickFromDevice() {
    setError(null);
    setLoading(true);
    try {
      const props = (await navigator.contacts!.getProperties?.()) ?? ["name", "email", "tel"];
      const wanted = ["name", "email", "tel"].filter((p) => props.includes(p));
      const picked = await navigator.contacts!.select(wanted.length ? wanted : ["name"], { multiple: true });
      const contacts: PickedContact[] = picked
        .map((p) => ({
          full_name: (p.name && p.name[0]) || "",
          date_of_birth: null,
          anniversary_date: null,
          relationship: null,
          email: (p.email && p.email[0]) || null,
          phone: (p.tel && p.tel[0]) || null,
          address: null,
          notes: null,
        }))
        .filter((c) => c.full_name.trim().length > 0);

      if (contacts.length === 0) {
        setError("No contacts were selected.");
        return;
      }
      setReview(toReviewRows(contacts));
      setReviewSource("device");
    } catch (err) {
      // The picker throws if the user cancels — that's not an error worth
      // showing them, just quietly stay on the current screen.
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Couldn't open your contacts.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVcfFile(file: File) {
    setError(null);
    setLoading(true);
    try {
      const text = await file.text();
      const contacts = parseVCardText(text);
      if (contacts.length === 0) {
        setError("No contacts with a name were found in that file.");
        return;
      }
      setReview(toReviewRows(contacts));
      setReviewSource("vcf");
    } catch {
      setError("Could not read that file. Please check it's a valid .vcf export and try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleRow(key: string) {
    setReview((prev) => prev && prev.map((r) => (r.key === key ? { ...r, selected: !r.selected } : r)));
  }

  function toggleAll(selected: boolean) {
    setReview((prev) => prev && prev.map((r) => ({ ...r, selected })));
  }

  async function handleImportSelected() {
    if (!review) return;
    const chosen = review.filter((r) => r.selected);
    if (chosen.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: chosen.map(({ key, selected, ...c }) => c),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Import failed");
      setSummary(json);
      setReview(null);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  const selectedCount = review?.filter((r) => r.selected).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center">
      <div className="animate-float-in flex w-full max-w-md flex-col rounded-t-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-lg md:rounded-2xl md:max-h-[85vh]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {review && (
              <button
                onClick={() => {
                  setReview(null);
                  setReviewSource(null);
                  setError(null);
                }}
                className="btn-ghost -ml-1.5"
                aria-label="Back"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <h2 className="text-lg font-semibold text-[var(--fg)]">
              {review ? "Choose who to import" : "Import contacts"}
            </h2>
          </div>
          <button onClick={onClose} className="btn-ghost">
            <X size={18} />
          </button>
        </div>

        {!summary && !review && (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFile(file);
              }}
              onClick={() => inputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-10 text-center transition-colors"
              style={{
                borderColor: dragOver ? "var(--accent)" : "var(--border)",
                background: dragOver ? "var(--accent-soft)" : "var(--bg-elevated)",
              }}
            >
              {loading ? (
                <Loader2 className="animate-spin text-[var(--accent)]" size={28} />
              ) : (
                <UploadCloud className="text-[var(--accent)]" size={28} />
              )}
              <p className="text-sm font-medium text-[var(--fg)]">
                {loading ? "Reading your file…" : "Drop a CSV or Excel file here"}
              </p>
              <p className="text-xs text-[var(--muted)]">or click to browse · .csv, .xls, .xlsx</p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
            </div>

            <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
              We&apos;ll auto-detect columns like <strong>Name</strong>, <strong>Date of Birth</strong>,{" "}
              <strong>Relationship</strong>, <strong>Email</strong>, and <strong>Phone</strong>. Rows with no
              recognizable name are skipped. Missing birthdays can be added manually afterward.
            </p>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1" style={{ background: "var(--border)" }} />
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Or from your phone
              </span>
              <div className="h-px flex-1" style={{ background: "var(--border)" }} />
            </div>

            <div className="flex flex-col gap-2">
              {deviceContactPickerSupported() && (
                <button onClick={handlePickFromDevice} disabled={loading} className="btn-secondary justify-center">
                  <Smartphone size={16} /> Pick from Contacts
                </button>
              )}
              <button onClick={() => vcfInputRef.current?.click()} disabled={loading} className="btn-secondary justify-center">
                <FileUp size={16} /> Upload a vCard (.vcf)
              </button>
              <input
                ref={vcfInputRef}
                type="file"
                accept=".vcf,text/vcard,text/x-vcard"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleVcfFile(file);
                  e.target.value = "";
                }}
              />
            </div>

            <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
              {deviceContactPickerSupported()
                ? "“Pick from Contacts” opens your phone's own contact list right here — nothing is imported until you choose who to add."
                : "On iPhone, export your contacts as a vCard from icloud.com (Contacts → gear icon → Select All → Export vCard), then upload that file here."}
            </p>

            {error && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-red-500">
                <AlertTriangle size={15} /> {error}
              </p>
            )}
          </>
        )}

        {!summary && review && (
          <>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-[var(--muted)]">
                {review.length} found from {reviewSource === "device" ? "your contacts" : "the file"} ·{" "}
                {selectedCount} selected
              </p>
              <div className="flex gap-3 text-xs font-medium text-[var(--accent)]">
                <button onClick={() => toggleAll(true)}>Select all</button>
                <button onClick={() => toggleAll(false)}>Deselect all</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
              {review.map((r) => (
                <label
                  key={r.key}
                  className="flex cursor-pointer items-start gap-2.5 border-b px-3 py-2.5 last:border-b-0"
                  style={{ borderColor: "var(--border)" }}
                >
                  <input
                    type="checkbox"
                    checked={r.selected}
                    onChange={() => toggleRow(r.key)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[var(--fg)]">{r.full_name}</span>
                    {(r.email || r.phone) && (
                      <span className="block truncate text-xs text-[var(--muted)]">
                        {[r.phone, r.email].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>

            {error && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-red-500">
                <AlertTriangle size={15} /> {error}
              </p>
            )}

            <button
              onClick={handleImportSelected}
              disabled={loading || selectedCount === 0}
              className="btn-primary mt-4 justify-center disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                `Import ${selectedCount} contact${selectedCount === 1 ? "" : "s"}`
              )}
            </button>
          </>
        )}

        {summary && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 className="text-emerald-500" size={36} />
            <p className="text-sm font-medium text-[var(--fg)]">
              Imported {summary.inserted} contact{summary.inserted === 1 ? "" : "s"}
            </p>
            {summary.missingDob > 0 && (
              <p className="text-xs text-[var(--muted)]">
                {summary.missingDob} of them don&apos;t have a birthday yet — add it from their contact card
                whenever you have it.
              </p>
            )}
            {summary.skippedRows > 0 && (
              <p className="text-xs text-[var(--muted)]">{summary.skippedRows} row(s) had no name and were skipped.</p>
            )}
            <button onClick={onClose} className="btn-primary mt-3">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
