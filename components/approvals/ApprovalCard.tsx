"use client";

import { useState } from "react";
import { Check, X, Sparkles, Mail, MessageCircle, Loader2, RotateCcw, AlertCircle, Maximize2 } from "lucide-react";
import { Approval } from "@/lib/types";
import { formatFriendlyDate } from "@/lib/date-utils";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: "Needs review", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
  edited: { label: "Approved (edited)", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
  sent: { label: "Sent", className: "bg-[var(--accent-soft)] text-[var(--accent)]" },
  failed: { label: "Failed to send", className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
};

export function ApprovalCard({
  approval,
  onUpdate,
}: {
  approval: Approval;
  onUpdate: (a: Approval) => void;
}) {
  const [message, setMessage] = useState(approval.message);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const contact = approval.contact!;

  async function patch(body: Record<string, unknown>, busyKey: string) {
    setBusy(busyKey);
    try {
      const res = await fetch(`/api/approvals/${approval.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) {
        onUpdate(json.approval);
        setMessage(json.approval.message);
      }
    } finally {
      setBusy(null);
      setEditing(false);
    }
  }

  const status = STATUS_STYLES[approval.status] || STATUS_STYLES.pending;
  const canAct = approval.status === "pending" || approval.status === "approved" || approval.status === "edited";

  return (
    <div className="card animate-float-in overflow-hidden">
      <div className="flex flex-col gap-4 p-4 md:flex-row">
        {approval.card_image_url && (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="group relative h-44 w-full shrink-0 overflow-hidden rounded-xl border border-[var(--border)] md:h-auto md:w-44"
          >
            {/* Card images live on the user's own Supabase storage domain, which varies per deployment,
                so a static next/image remotePatterns entry isn't practical here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={approval.card_image_url}
              alt={`Birthday card for ${contact.full_name}`}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            <span className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/0 text-xs font-medium text-white opacity-0 transition-opacity duration-200 group-hover:bg-black/35 group-hover:opacity-100">
              <Maximize2 size={13} /> View full size
            </span>
          </button>
        )}

        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-display font-semibold text-[var(--fg)]">{contact.full_name}</p>
              <p className="text-xs text-[var(--muted)]">
                {contact.relationship || "Contact"} · {formatFriendlyDate(approval.occasion_date)}
              </p>
            </div>
            <span className={`badge ${status.className}`}>{status.label}</span>
          </div>

          {editing ? (
            <textarea
              className="input"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              autoFocus
            />
          ) : (
            <p className="rounded-xl bg-[var(--bg-elevated)] p-3 text-sm text-[var(--fg)]">{message}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            {approval.channels.includes("email") && (
              <span className="badge bg-[var(--bg-elevated)] border border-[var(--border)]">
                <Mail size={11} /> Email
              </span>
            )}
            {approval.channels.includes("whatsapp") && (
              <span className="badge bg-[var(--bg-elevated)] border border-[var(--border)]">
                <MessageCircle size={11} /> WhatsApp/SMS
              </span>
            )}
            {approval.channels.length === 0 && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertCircle size={12} /> No email or phone on file — add one to send this
              </span>
            )}
            {approval.status === "failed" && approval.send_error && (
              <span className="flex items-center gap-1 text-red-500">
                <AlertCircle size={12} /> {approval.send_error}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {canAct && !editing && (
              <>
                <button
                  onClick={() => patch({ status: "approved" }, "approve")}
                  disabled={!!busy}
                  className="btn-secondary !border-emerald-300 !text-emerald-600 hover:!bg-emerald-50 dark:!border-emerald-800 dark:!text-emerald-400"
                >
                  {busy === "approve" ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Approve
                </button>
                <button onClick={() => setEditing(true)} className="btn-secondary">
                  Edit
                </button>
                <button
                  onClick={() => patch({ action: "regenerate" }, "regenerate")}
                  disabled={!!busy}
                  className="btn-secondary"
                >
                  {busy === "regenerate" ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Sparkles size={15} />
                  )}
                  Ask Aria to rewrite
                </button>
                <button
                  onClick={() => patch({ status: "rejected" }, "reject")}
                  disabled={!!busy}
                  className="btn-secondary !border-red-300 !text-red-500 hover:!bg-red-50 dark:!border-red-900"
                >
                  {busy === "reject" ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />} Reject
                </button>
              </>
            )}

            {editing && (
              <>
                <button
                  onClick={() => patch({ message }, "save")}
                  disabled={!!busy}
                  className="btn-primary"
                >
                  {busy === "save" ? <Loader2 size={15} className="animate-spin" /> : "Save message"}
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary">
                  Cancel
                </button>
              </>
            )}

            {approval.status === "rejected" && (
              <button
                onClick={() => patch({ status: "pending" }, "restore")}
                disabled={!!busy}
                className="btn-secondary"
              >
                {busy === "restore" ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} Restore
              </button>
            )}

            {approval.status === "failed" && (
              <button
                onClick={() => patch({ status: "approved" }, "retry")}
                disabled={!!busy}
                className="btn-primary"
              >
                {busy === "retry" ? <Loader2 size={15} className="animate-spin" /> : "Retry send"}
              </button>
            )}
          </div>
        </div>
      </div>

      {lightboxOpen && approval.card_image_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={approval.card_image_url}
            alt={`Birthday card for ${contact.full_name}`}
            className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
