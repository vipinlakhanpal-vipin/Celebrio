"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarHeart,
  Sparkles,
  Settings,
  Cake,
  LogOut,
  Moon,
  Sun,
  RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import { useTheme } from "@/components/ThemeProvider";
import { APP_VERSION } from "@/lib/version";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/approvals", label: "Approvals", icon: CalendarHeart, badgeKey: "approvals" as const },
  { href: "/aria", label: "Aria", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function NavBar({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [latestVersion, setLatestVersion] = useState(APP_VERSION);
  const updateAvailable = latestVersion !== APP_VERSION;

  async function signOut() {
    await fetch("/api/signout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  // Poll the live deployed version so we can nudge the user to refresh once
  // a new build has shipped, without them having to notice on their own.
  useEffect(() => {
    let cancelled = false;
    async function checkVersion() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.version) setLatestVersion(data.version);
      } catch {
        // offline or transient network error — just try again next interval
      }
    }
    checkVersion();
    const interval = setInterval(checkVersion, 5 * 60 * 1000);
    function onVisible() {
      if (document.visibilityState === "visible") checkVersion();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <>
      {/* ---------- Desktop / tablet top bar ---------- */}
      <header className="sticky top-0 z-40 hidden border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-[var(--fg)]">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm gradient-hero"
            >
              <Cake size={18} />
            </span>
            <span className="font-display text-[15px] font-semibold">Celebrio</span>
          </Link>

          <nav className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] p-1 shadow-sm">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    active
                      ? "text-[var(--accent-fg)]"
                      : "text-[var(--muted)] hover:text-[var(--fg)]"
                  )}
                  style={active ? { background: "var(--accent)" } : undefined}
                >
                  <Icon size={16} />
                  {item.label}
                  {item.badgeKey === "approvals" && pendingCount > 0 && (
                    <span
                      className={clsx(
                        "ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                        active ? "bg-white/25 text-white" : "bg-red-500 text-white"
                      )}
                    >
                      {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="btn-ghost relative !px-2.5 text-xs font-medium text-[var(--muted)]"
              title={updateAvailable ? `New version available (v${latestVersion}) — click to refresh` : `Celebrio v${APP_VERSION}`}
            >
              v{APP_VERSION}
              {updateAvailable && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="btn-ghost"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button onClick={signOut} className="btn-ghost" title="Sign out">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      {/* ---------- Mobile top strip (brand only) ---------- */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/90 px-4 backdrop-blur md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-[var(--fg)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white gradient-hero">
            <Cake size={16} />
          </span>
          <span className="font-display text-[15px] font-semibold">Celebrio</span>
        </Link>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="btn-ghost"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      {/* ---------- Mobile bottom nav ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--bg)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            const isAria = item.href === "/aria";
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
              >
                {isAria ? (
                  <span
                    className={clsx(
                      "flex h-9 w-9 -translate-y-2 items-center justify-center rounded-full text-white shadow-md transition-transform",
                      active ? "scale-105" : ""
                    )}
                    style={{ background: "var(--accent)" }}
                  >
                    <Icon size={17} />
                  </span>
                ) : (
                  <span className="relative">
                    <Icon
                      size={20}
                      color={active ? "var(--accent)" : "var(--muted)"}
                      strokeWidth={active ? 2.4 : 2}
                    />
                    {item.badgeKey === "approvals" && pendingCount > 0 && (
                      <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                        {pendingCount}
                      </span>
                    )}
                  </span>
                )}
                <span
                  className={clsx(isAria && "-translate-y-1")}
                  style={{ color: active ? "var(--accent)" : "var(--muted)" }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            onClick={() => window.location.reload()}
            className="relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
            aria-label={updateAvailable ? "Update available — tap to refresh" : "Refresh"}
          >
            <span className="relative">
              <RefreshCw
                size={20}
                color={updateAvailable ? "var(--accent)" : "var(--muted)"}
                strokeWidth={updateAvailable ? 2.4 : 2}
              />
              {updateAvailable && (
                <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[var(--bg)]" />
              )}
            </span>
            <span style={{ color: updateAvailable ? "var(--accent)" : "var(--muted)" }}>
              {updateAvailable ? "Update" : "Refresh"}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
