"use client";

import { useRef, useState } from "react";
import { X, UploadCloud, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

type UploadSummary = {
  inserted: number;
  missingDob: number;
  skippedRows: number;
  totalRowsInFile: number;
};

export function UploadModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<UploadSummary | null>(null);

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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center">
      <div className="animate-float-in w-full max-w-md rounded-t-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-lg md:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--fg)]">Import contacts</h2>
          <button onClick={onClose} className="btn-ghost">
            <X size={18} />
          </button>
        </div>

        {!summary && (
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
                }}
              />
            </div>

            <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
              We&apos;ll auto-detect columns like <strong>Name</strong>, <strong>Date of Birth</strong>,{" "}
              <strong>Relationship</strong>, <strong>Email</strong>, and <strong>Phone</strong>. Rows with no
              recognizable name are skipped. Missing birthdays can be added manually afterward.
            </p>

            {error && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-red-500">
                <AlertTriangle size={15} /> {error}
              </p>
            )}
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
