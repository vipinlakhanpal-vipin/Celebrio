"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarHeart,
  Bot,
  Settings,
  LogOut,
  Moon,
  Sun,
  RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import { useTheme } from "@/components/ThemeProvider";
import { APP_VERSION } from "@/lib/version";
import { Wordmark } from "@/components/Wordmark";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/approvals", label: "Approvals", icon: CalendarHeart, badgeKey: "approvals" as const },
  { href: "/aria", label: "Aria", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Aria's own mark: an AI-agent glyph that's always purple (regardless of the
// user's chosen accent color) with a couple of tiny dots orbiting it, so the
// assistant reads as "alive" and distinct from the rest of the nav at a glance.
function AriaIcon({
  size,
  dotless = false,
  iconColor = "#8b5cf6",
  dotColor = "#c4b5fd",
}: {
  size: number;
  dotless?: boolean;
  iconColor?: string;
  dotColor?: string;
}) {
  const ring = size + 12;
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: ring, height: ring }}
    >
      <span className="absolute inset-0 animate-spin" style={{ animationDuration: "3s" }} aria-hidden="true">
        <span
          className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
          style={{ background: dotColor }}
        />
        {!dotless && (
          <>
            <span
              className="absolute bottom-0 left-0.5 h-1 w-1 rounded-full"
              style={{ background: dotColor, opacity: 0.75 }}
            />
            <span
              className="absolute bottom-0 right-0.5 h-1 w-1 rounded-full"
              style={{ background: dotColor, opacity: 0.55 }}
            />
          </>
        )}
      </span>
      <Bot size={size} strokeWidth={2.3} style={{ color: iconColor }} />
    </span>
  );
}

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
          <Link href="/dashboard" className="flex items-center font-semibold text-[var(--fg)]">
            <Wordmark size={22} />
          </Link>

          <nav className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] p-1 shadow-sm">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              const isAriaItem = item.href === "/aria";
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
                  {isAriaItem ? <AriaIcon size={15} dotless /> : <Icon size={16} />}
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
            {/* Explicit refresh action — the version badge next to it is
                clickable too, but a dedicated icon makes "tap to reload"
                discoverable without having to notice the badge is a button. */}
            <button
              onClick={() => window.location.reload()}
              className="btn-ghost"
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw size={16} color={updateAvailable ? "var(--accent)" : "var(--muted)"} />
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-ghost relative !px-2.5 text-xs font-bold text-amber-600 dark:text-amber-400"
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
              {theme === "dark" ? (
                <Sun size={17} className="text-amber-500 dark:text-amber-400" />
              ) : (
                <Moon size={17} className="text-amber-500 dark:text-amber-400" />
              )}
            </button>
            <button onClick={signOut} className="btn-ghost" title="Sign out">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      {/* ---------- Mobile top strip (brand only) ---------- */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/90 px-4 backdrop-blur md:hidden"
        style={{ height: "calc(3.5rem + env(safe-area-inset-top))", paddingTop: "env(safe-area-inset-top)" }}
      >
        <Link href="/dashboard" className="flex items-center font-semibold text-[var(--fg)]">
          <Wordmark size={21} />
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => window.location.reload()}
            className="btn-ghost relative !px-2 text-xs font-bold text-amber-600 dark:text-amber-400"
            title={updateAvailable ? `New version available (v${latestVersion}) — tap to refresh` : `Celebrio v${APP_VERSION}`}
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
          >
            {theme === "dark" ? (
              <Sun size={18} className="text-amber-500 dark:text-amber-400" />
            ) : (
              <Moon size={18} className="text-amber-500 dark:text-amber-400" />
            )}
          </button>
        </div>
      </header>

      {/* ---------- Mobile bottom nav ---------- */}
      {/* Solid background, no backdrop-blur: a translucent + blurred
          position:fixed bar combined with the safe-area inset is a known
          spot for Safari (especially installed-to-home-screen/standalone)
          to leave a plain, unstyled gap below the bar while its dynamic
          toolbar animates — the blur pass doesn't always repaint the inset
          area in step with the rest of the bar. Solid color removes any
          chance of seeing through to that gap; the safe-area padding stays
          on the bar itself so the tap targets never sit under the home
          indicator on any phone or tablet — env() reports the exact inset
          for whatever device this renders on, so there's nothing to tune
          per-model. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--bg)] md:hidden"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
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
                      "flex h-9 w-9 -translate-y-2 items-center justify-center rounded-full shadow-md transition-transform",
                      active ? "scale-105" : ""
                    )}
                    // Always purple here regardless of the user's chosen accent —
                    // Aria is the AI feature and gets its own signature color.
                    style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}
                  >
                    <AriaIcon size={15} iconColor="white" dotColor="rgba(255,255,255,0.85)" />
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
