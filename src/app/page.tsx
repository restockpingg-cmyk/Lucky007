"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, User as UserIcon, Lock, ArrowRight } from "lucide-react";
import { login, getStore, useHydrated } from "@/lib/store";
import Loading from "@/components/Loading";

export default function LoginPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    const s = getStore();
    if (s.currentUserId) {
      const u = s.users.find((u) => u.id === s.currentUserId);
      if (u) {
        setRedirecting(true);
        router.replace(`/${u.role}`);
      }
    }
  }, [hydrated, router]);

  if (!hydrated || redirecting) return <Loading />;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const user = login(username.trim(), pin.trim());
    if (!user) {
      setError("Invalid username or PIN");
      return;
    }
    router.push(`/${user.role}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 bg-gradient-to-br from-[#0b0f19] via-[#0d1429] to-[#0b0f19]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-2xl shadow-yellow-500/20 mb-4">
            <Zap size={32} className="text-black fill-black" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Lucky<span className="text-yellow-400">007</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Sports betting platform</p>
        </div>

        {/* Login form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4"
        >
          <h2 className="text-lg font-semibold mb-2">Sign in</h2>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Username</label>
            <div className="relative">
              <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3 py-3 text-base text-slate-200 placeholder-slate-600 focus:outline-none focus:border-yellow-400/50 transition-colors"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">PIN</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3 py-3 text-base text-slate-200 placeholder-slate-600 focus:outline-none focus:border-yellow-400/50 transition-colors tracking-widest"
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-black font-bold py-3.5 rounded-xl text-base transition-all flex items-center justify-center gap-2"
          >
            Continue <ArrowRight size={16} />
          </button>

          <div className="text-xs text-slate-600 text-center pt-2 border-t border-white/5">
            Default owner login: <span className="text-slate-400 font-mono">owner / 1234</span>
          </div>
        </form>
      </div>
    </div>
  );
}
