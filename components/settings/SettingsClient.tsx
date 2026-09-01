"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Laptop, Check, Mail, MessageCircle, Bell, ShieldCheck, Users, Smartphone, Monitor, MapPin, Loader2 } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { PageHeader } from "@/components/PageHeader";
import { OccasionType } from "@/lib/types";

const ACCENT_PRESETS = [
  { name: "Indigo", value: "#4F46E5" },
  { name: "Coral", value: "#FF6B6B" },
  { name: "Emerald", value: "#10B981" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Pink", value: "#EC4899" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Blue", value: "#3B82F6" },
];

type Profile = {
  full_name: string | null;
  email: string | null;
  notify_email: boolean;
  notify_whatsapp: boolean;
  notify_in_app: boolean;
  created_at: string;
};

type SignIn = {
  id: string;
  signed_in_at: string;
  city: string | null;
  region: string | null;
  country: string | null;
  device_type: string | null;
  ip_address: string | null;
};

export function SettingsClient({
  profile,
  signIns,
  usagePercent,
  contactCount,
  occasions,
  isAdmin,
}: {
  profile: Profile;
  signIns: SignIn[];
  usagePercent: number;
  contactCount: number;
  occasions: (OccasionType & { subscribed: boolean })[];
  isAdmin: boolean;
}) {
  return (
    <div className="flex flex-col gap-8 pb-6">
      <PageHeader title="Settings" subtitle="Appearance, notifications, occasions, and your account" />
      <ProfileSection profile={profile} />
      <AppearanceSection />
      <NotificationsSection profile={profile} />
      <OccasionsSection initialOccasions={occasions} />
      <ActivitySection signIns={signIns} usagePercent={usagePercent} contactCount={contactCount} memberSince={profile.created_at} />
      {isAdmin && <AdminSection />}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-base font-semibold text-[var(--fg)]">{title}</h2>
      {subtitle && <p className="mb-3 mt-0.5 text-xs text-[var(--muted)]">{subtitle}</p>}
      <div className={subtitle ? "mt-3" : "mt-3"}>{children}</div>
    </section>
  );
}

function ProfileSection({ profile }: { profile: Profile }) {
  // A stored name is only real if it isn't the raw email that used to get
  // written there as a placeholder — that case is treated as "no name set"
  // so the field starts blank rather than pre-filled with an email address.
  const storedName = profile.full_name && !profile.full_name.includes("@") ? profile.full_name : "";
  const [name, setName] = useState(storedName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: trimmed }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  // While no name has been typed/saved yet, preview the same fallback the
  // dashboard actually uses today (the email's local part, title-cased) —
  // not a generic "there" placeholder that doesn't match what's shown.
  const emailFallback = profile.email
    ? profile.email.split("@")[0].split(/[._-]+/)[0]
    : "there";
  const titleCased = emailFallback ? emailFallback.charAt(0).toUpperCase() + emailFallback.slice(1) : "there";
  const previewFirstName = name.trim().split(" ")[0] || titleCased;

  return (
    <Section title="Your profile" subtitle="How your name appears around the app">
      <div className="card p-4">
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Full name</label>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            placeholder="e.g. Vipin Lakhanpal"
          />
          <button onClick={save} disabled={saving || !name.trim()} className="btn-primary shrink-0">
            {saving ? <Loader2 size={16} className="animate-spin" /> : "Save"}
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          {saved
            ? `Saved — the dashboard now greets you as "${previewFirstName}".`
            : `We'll greet you as "${previewFirstName}" on the dashboard.`}
        </p>
        {profile.email && <p className="mt-1 text-[11px] text-[var(--muted)]">{profile.email}</p>}
      </div>
    </Section>
  );
}

function AppearanceSection() {
  const { theme, accent, setTheme, setAccent } = useTheme();
  const [custom, setCustom] = useState(accent);

  return (
    <Section title="Appearance" subtitle="Light or dark, and a color that feels like you">
      <div className="card p-4">
        <p className="mb-2 text-xs font-semibold text-[var(--muted)]">Theme</p>
        <div className="flex gap-2">
          {[
            { key: "light", label: "Light", icon: Sun },
            { key: "dark", label: "Dark", icon: Moon },
            { key: "system", label: "System", icon: Laptop },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key as "light" | "dark" | "system")}
              className="flex flex-1 flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-colors"
              style={
                theme === t.key
                  ? { borderColor: "var(--accent)", background: "var(--accent-soft)", color: "var(--accent)" }
                  : { borderColor: "var(--border)", color: "var(--muted)" }
              }
            >
              <t.icon size={17} />
              {t.label}
            </button>
          ))}
        </div>

        <p className="mb-2 mt-5 text-xs font-semibold text-[var(--muted)]">Accent color</p>
        <div className="flex flex-wrap gap-2.5">
          {ACCENT_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => {
                setAccent(p.value);
                setCustom(p.value);
              }}
              title={p.name}
              className="flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-[var(--card)] transition-transform hover:scale-105"
              style={{ background: p.value, ["--tw-ring-color" as string]: accent === p.value ? p.value : "transparent" }}
            >
              {accent.toLowerCase() === p.value.toLowerCase() && <Check size={15} color="white" />}
            </button>
          ))}
          <label
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-dashed"
            style={{ borderColor: "var(--border)" }}
            title="Custom color"
          >
            <input
              type="color"
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                setAccent(e.target.value);
              }}
              className="h-0 w-0 opacity-0"
            />
            <span className="h-5 w-5 rounded-full" style={{ background: custom }} />
          </label>
        </div>
      </div>
    </Section>
  );
}

function NotificationsSection({ profile }: { profile: Profile }) {
  const [prefs, setPrefs] = useState({
    notify_email: profile.notify_email,
    notify_whatsapp: profile.notify_whatsapp,
    notify_in_app: profile.notify_in_app,
  });
  const [saving, setSaving] = useState(false);

  async function toggle(key: keyof typeof prefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next[key] }),
    });
    setSaving(false);
  }

  const items = [
    { key: "notify_email" as const, label: "Email", desc: "Send greetings by email, and alert me by email when something needs review", icon: Mail },
    { key: "notify_whatsapp" as const, label: "WhatsApp / SMS", desc: "Send greetings over WhatsApp or SMS when a contact has a phone number", icon: MessageCircle },
    { key: "notify_in_app" as const, label: "In-app queue", desc: "Show pending greetings in the Approvals tab", icon: Bell },
  ];

  return (
    <Section title="Notifications" subtitle="How greetings get sent, and how you're alerted">
      <div className="card divide-y divide-[var(--border)]">
        {items.map((item) => (
          <label key={item.key} className="flex cursor-pointer items-center gap-3 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)" }}>
              <item.icon size={16} className="text-[var(--accent)]" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium text-[var(--fg)]">{item.label}</span>
              <span className="block text-xs text-[var(--muted)]">{item.desc}</span>
            </span>
            <input
              type="checkbox"
              checked={prefs[item.key]}
              disabled={saving}
              onChange={() => toggle(item.key)}
              className="h-5 w-9 shrink-0 accent-[var(--accent)]"
            />
          </label>
        ))}
      </div>
    </Section>
  );
}

function OccasionsSection({ initialOccasions }: { initialOccasions: (OccasionType & { subscribed: boolean })[] }) {
  const [occasions, setOccasions] = useState(initialOccasions);

  async function toggle(id: string) {
    setOccasions((prev) => prev.map((o) => (o.id === id ? { ...o, subscribed: !o.subscribed } : o)));
    const next = occasions.find((o) => o.id === id);
    await fetch("/api/occasions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ occasion_type_id: id, enabled: !next?.subscribed }),
    });
  }

  return (
    <Section
      title="Occasions & holidays"
      subtitle="Beyond birthdays — get a reminder a couple of days before, then pick who to send greetings to"
    >
      <div className="card grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
        {occasions.map((o) => (
          <button
            key={o.id}
            onClick={() => toggle(o.id)}
            className="flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-medium transition-colors"
            style={
              o.subscribed
                ? { borderColor: "var(--accent)", background: "var(--accent-soft)", color: "var(--fg)" }
                : { borderColor: "var(--border)", color: "var(--muted)" }
            }
          >
            <span className="text-base">{o.emoji}</span>
            <span className="flex-1">{o.name}</span>
            {o.subscribed && <Check size={13} className="text-[var(--accent)]" />}
          </button>
        ))}
      </div>
    </Section>
  );
}

function ActivitySection({
  signIns,
  usagePercent,
  contactCount,
  memberSince,
}: {
  signIns: SignIn[];
  usagePercent: number;
  contactCount: number;
  memberSince: string;
}) {
  return (
    <Section title="Your activity" subtitle="Recent sign-ins and app usage for your account">
      <div className="mb-3 grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="font-display text-xl font-bold text-[var(--fg)]">{usagePercent}%</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Active days (30d)</p>
        </div>
        <div className="card p-3 text-center">
          <p className="font-display text-xl font-bold text-[var(--fg)]">{contactCount}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Contacts</p>
        </div>
        <div className="card p-3 text-center">
          <p className="font-display text-sm font-bold text-[var(--fg)]">
            {new Date(memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Member since</p>
        </div>
      </div>

      <div className="card divide-y divide-[var(--border)]">
        {signIns.length === 0 ? (
          <p className="p-4 text-sm text-[var(--muted)]">No sign-ins recorded yet.</p>
        ) : (
          signIns.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 text-sm">
              {s.device_type === "mobile" ? (
                <Smartphone size={15} className="text-[var(--muted)]" />
              ) : (
                <Monitor size={15} className="text-[var(--muted)]" />
              )}
              <span className="flex-1 text-[var(--fg)]">
                {new Date(s.signed_in_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
              </span>
              <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                <MapPin size={12} />
                {[s.city, s.country].filter(Boolean).join(", ") || "Unknown location"}
              </span>
            </div>
          ))
        )}
      </div>
    </Section>
  );
}

function AdminSection() {
  const [stats, setStats] = useState<{
    totalUsers: number;
    activeUsersLast7Days: number;
    usagePercent: number;
    signIns: { id: string; user_label: string; signed_in_at: string; city: string | null; country: string | null; device_type: string | null }[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) return null;

  return (
    <Section title="Admin — all users" subtitle="Visible only to your account (profiles.is_admin)">
      <div className="mb-3 grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="font-display text-xl font-bold text-[var(--fg)]">{stats.totalUsers}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            <Users size={10} className="mr-1 inline" />
            Total users
          </p>
        </div>
        <div className="card p-3 text-center">
          <p className="font-display text-xl font-bold text-[var(--fg)]">{stats.activeUsersLast7Days}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Active (7d)</p>
        </div>
        <div className="card p-3 text-center" style={{ background: "var(--accent-soft)", borderColor: "transparent" }}>
          <p className="font-display text-xl font-bold text-[var(--accent)]">{stats.usagePercent}%</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">App usage</p>
        </div>
      </div>

      <div className="card max-h-80 divide-y divide-[var(--border)] overflow-y-auto">
        <div className="flex items-center gap-2 p-3 text-xs font-semibold text-[var(--muted)]">
          <ShieldCheck size={13} /> Recent sign-ins across all users
        </div>
        {stats.signIns.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-3 text-sm">
            {s.device_type === "mobile" ? <Smartphone size={14} className="text-[var(--muted)]" /> : <Monitor size={14} className="text-[var(--muted)]" />}
            <span className="flex-1 truncate text-[var(--fg)]">{s.user_label}</span>
            <span className="text-xs text-[var(--muted)]">
              {new Date(s.signed_in_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
              <MapPin size={11} />
              {[s.city, s.country].filter(Boolean).join(", ") || "—"}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}
