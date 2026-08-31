"use client";

import { useMemo, useState } from "react";
import { CalendarHeart } from "lucide-react";
import { Approval, ApprovalStatus } from "@/lib/types";
import { ApprovalCard } from "@/components/approvals/ApprovalCard";
import { PageHeader } from "@/components/PageHeader";

const TABS: { key: ApprovalStatus | "all"; label: string }[] = [
  { key: "pending", label: "Needs review" },
  { key: "approved", label: "Approved" },
  { key: "sent", label: "Sent" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

export function ApprovalsClient({ initialApprovals }: { initialApprovals: Approval[] }) {
  const [approvals, setApprovals] = useState<Approval[]>(initialApprovals);
  const [tab, setTab] = useState<ApprovalStatus | "all">("pending");

  const filtered = useMemo(() => {
    if (tab === "all") return approvals;
    if (tab === "approved") return approvals.filter((a) => a.status === "approved" || a.status === "edited");
    return approvals.filter((a) => a.status === tab);
  }, [approvals, tab]);

  function handleUpdate(updated: Approval) {
    setApprovals((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }

  const pendingCount = approvals.filter((a) => a.status === "pending").length;

  return (
    <div>
      <PageHeader
        title="Approvals"
        subtitle={
          pendingCount > 0
            ? `${pendingCount} greeting${pendingCount === 1 ? "" : "s"} waiting for your review`
            : "You're all caught up"
        }
      />

      <div className="mb-5 flex gap-2 overflow-x-auto scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors"
            style={
              tab === t.key
                ? { background: "var(--accent)", color: "var(--accent-fg)", borderColor: "var(--accent)" }
                : { borderColor: "var(--border)", color: "var(--muted)" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--accent-soft)" }}>
            <CalendarHeart className="text-[var(--accent)]" size={26} />
          </div>
          <p className="font-medium text-[var(--fg)]">Nothing here</p>
          <p className="max-w-xs text-sm text-[var(--muted)]">
            Greetings show up here automatically 2 days before a contact&apos;s birthday, ready for you to review.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((a) => (
            <ApprovalCard key={a.id} approval={a} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
