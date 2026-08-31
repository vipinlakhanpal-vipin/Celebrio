"use client";

import { useState } from "react";
import Link from "next/link";
import { Cake, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)] px-4 text-center">
        <div className="max-w-sm">
          <CheckCircle2 className="mx-auto mb-4 text-emerald-500" size={40} />
          <h1 className="text-lg font-semibold text-[var(--fg)]">Check your inbox</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            We sent a confirmation link to <strong>{email}</strong>. Confirm your email, then sign in.
          </p>
          <Link href="/login" className="btn-primary mt-6 inline-flex">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
            style={{ background: "var(--accent)" }}
          >
            <Cake size={26} />
          </div>
          <h1 className="font-display text-xl font-semibold text-[var(--fg)]">Create your account</h1>
          <p className="text-sm text-[var(--muted)]">Never miss a birthday again</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            required
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary mt-1">
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[var(--accent)]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
