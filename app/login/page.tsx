"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Wordmark } from "@/components/Wordmark";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Log the sign-in for the admin analytics view (best-effort, non-blocking).
    fetch("/api/auth/log-sign-in", { method: "POST" }).catch(() => {});
    router.push(params.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <Wordmark size={30} />
          <h1 className="font-display text-xl font-semibold text-[var(--fg)]">Welcome back</h1>
          <p className="text-sm text-[var(--muted)]">Sign in to your Celebrio account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* type="text" + inputMode="email" instead of type="email" — on
              some mobile browsers (notably iOS/Android when the app is
              installed to the home screen and running standalone) an
              input[type=email] can fail to bring up the keyboard at all,
              while type=password and plain text inputs work fine. This
              still gets the email keyboard layout via inputMode, reliably. */}
          <input
            type="text"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary mt-1">
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-[var(--accent)]">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
