"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  accent: string;
  setTheme: (t: Theme) => void;
  setAccent: (c: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DEFAULT_ACCENT = "#4F46E5";

function applyToDom(theme: Theme, accent: string) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
  root.style.setProperty("--accent", accent);
}

/**
 * Wraps the authenticated app. Applies the saved theme/accent color instantly
 * from localStorage (see the inline script in app/layout.tsx that prevents a
 * flash-of-wrong-theme on first paint), then reconciles with the user's
 * profile row in Supabase and keeps both in sync whenever they change it in
 * Settings.
 */
function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem("brm-theme") as Theme) || "system";
}

function readInitialAccent(): string {
  if (typeof window === "undefined") return DEFAULT_ACCENT;
  return localStorage.getItem("brm-accent") || DEFAULT_ACCENT;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);
  const [accent, setAccentState] = useState<string>(readInitialAccent);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("theme, accent_color")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        const t = (data.theme as Theme) || "system";
        const a = data.accent_color || DEFAULT_ACCENT;
        setThemeState(t);
        setAccentState(a);
        localStorage.setItem("brm-theme", t);
        localStorage.setItem("brm-accent", a);
        applyToDom(t, a);
      }
    })();
  }, []);

  useEffect(() => {
    applyToDom(theme, accent);
  }, [theme, accent]);

  const persist = useCallback(async (next: Partial<{ theme: Theme; accent_color: string }>) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update(next).eq("id", user.id);
  }, []);

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      localStorage.setItem("brm-theme", t);
      persist({ theme: t });
    },
    [persist]
  );

  const setAccent = useCallback(
    (c: string) => {
      setAccentState(c);
      localStorage.setItem("brm-accent", c);
      persist({ accent_color: c });
    },
    [persist]
  );

  const value = useMemo(
    () => ({ theme, accent, setTheme, setAccent }),
    [theme, accent, setTheme, setAccent]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export const NO_FLASH_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem('brm-theme') || 'system';
    var accent = localStorage.getItem('brm-accent') || '${DEFAULT_ACCENT}';
    var root = document.documentElement;
    if (theme !== 'system') root.setAttribute('data-theme', theme);
    root.style.setProperty('--accent', accent);
  } catch (e) {}
})();
`;
