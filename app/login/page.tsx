"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Lock, Mail } from "lucide-react";

import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pehle se logged in hai to seedha dashboard bhej do
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/real-estate");
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.replace("/real-estate");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080b12] px-4 text-white">
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.09] bg-[#0b0e12] p-7">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="mb-4 rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
            <Building2 size={24} />
          </span>

          <h1 className="text-xl font-semibold">Welcome back</h1>

          <p className="mt-1 text-sm text-zinc-500">
            Sign in to your real-estate dashboard
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs text-zinc-500">Email</label>

            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 transition focus-within:border-cyan-400/50">
              <Mail size={15} className="text-zinc-600" />

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-zinc-500">
              Password
            </label>

            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 transition focus-within:border-cyan-400/50">
              <Lock size={15} className="text-zinc-600" />

              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-zinc-600"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}