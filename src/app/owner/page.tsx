"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Users, TrendingUp, BarChart3, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import TopBar from "@/components/TopBar";
import UserManager from "@/components/UserManager";
import StatsPanel from "@/components/StatsPanel";
import Loading from "@/components/Loading";
import { useStore, useHydrated, statsForOwner, addOwnerChips } from "@/lib/store";

export default function OwnerDashboard() {
  const router = useRouter();
  const hydrated = useHydrated();
  const store = useStore();
  const me = store.users.find((u) => u.id === store.currentUserId);
  const [statsOpen, setStatsOpen] = useState(true);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpError, setTopUpError] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (!me) router.replace("/");
    else if (me.role !== "owner") router.replace(`/${me.role}`);
  }, [hydrated, me, router]);

  if (!hydrated) return <Loading />;
  if (!me || me.role !== "owner") return <Loading />;

  const admins = store.users.filter((u) => u.role === "admin" && u.parentId === me.id);
  const adminIds = new Set(admins.map((a) => a.id));
  const allClients = store.users.filter(
    (u) => u.role === "client" && u.parentId && adminIds.has(u.parentId)
  );
  const totalAdminChips = admins.reduce((s, a) => s + a.chips, 0);
  const totalClientChips = allClients.reduce((s, c) => s + c.chips, 0);
  const totalInSystem = me.chips + totalAdminChips + totalClientChips;
  const stats = statsForOwner(me.id, store.users, store.bets);

  return (
    <div className="min-h-screen pb-12">
      <TopBar user={me} />
      <main className="max-w-5xl mx-auto px-4 py-4 space-y-5">
        {/* Top stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => { setTopUpAmount(""); setTopUpError(""); setTopUpOpen(true); }}
            className="text-left"
          >
            <Stat icon={<Coins size={16} />} label="Balance — tap to add" value={`₹${me.chips.toLocaleString()}`} color="yellow" highlight /></button>
          <Stat icon={<TrendingUp size={16} />} label="With admins" value={totalAdminChips.toLocaleString()} color="emerald" />
          <Stat icon={<Users size={16} />} label="With players" value={totalClientChips.toLocaleString()} color="blue" />
          <Stat icon={<BarChart3 size={16} />} label="Total in system" value={totalInSystem.toLocaleString()} color="purple" />
        </div>

        {/* P&L Panel */}
        <section>
          <button
            onClick={() => setStatsOpen(!statsOpen)}
            className="flex items-center gap-2 w-full mb-2.5 group"
          >
            <BarChart3 size={16} className="text-yellow-400" />
            <h2 className="font-bold text-slate-200">House Performance</h2>
            <span className="text-xs bg-white/5 text-slate-400 border border-white/10 px-2 py-0.5 rounded-full font-medium ml-auto">
              {admins.length} admin{admins.length !== 1 ? "s" : ""} · {allClients.length} player
              {allClients.length !== 1 ? "s" : ""}
            </span>
            {statsOpen ? (
              <ChevronUp size={16} className="text-slate-500 group-hover:text-slate-300" />
            ) : (
              <ChevronDown size={16} className="text-slate-500 group-hover:text-slate-300" />
            )}
          </button>
          {statsOpen && <StatsPanel stats={stats} perspective="owner" />}
        </section>

        <UserManager
          currentUser={me}
          children={admins}
          childRole="admin"
          childLabel="Admin"
          allUsers={store.users}
          bets={store.bets}
        />
      </main>

      {/* Owner top-up modal */}
      {topUpOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setTopUpOpen(false)} />
          <div className="relative w-full sm:max-w-sm bg-[#0d1117] border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-slate-200">Add to Your Balance</p>
                <p className="text-xs text-slate-500 mt-0.5">Current: ₹{me.chips.toLocaleString()}</p>
              </div>
              <button onClick={() => setTopUpOpen(false)} className="text-slate-500 hover:text-slate-200 p-1 rounded-lg hover:bg-white/5">
                <X size={18} />
              </button>
            </div>

            {/* Quick presets */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[10000, 50000, 100000, 500000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => { setTopUpAmount(String(preset)); setTopUpError(""); }}
                  className="text-xs font-bold py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 hover:bg-yellow-400/20 transition-colors"
                >
                  {preset >= 100000 ? `${preset / 100000}L` : `${preset / 1000}k`}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 mb-3 focus-within:border-yellow-400/40">
              <span className="text-yellow-400 font-bold text-sm">₹</span>
              <input
                type="number"
                min="1"
                placeholder="Custom amount"
                value={topUpAmount}
                onChange={(e) => { setTopUpAmount(e.target.value); setTopUpError(""); }}
                className="flex-1 bg-transparent py-3 text-sm text-slate-200 placeholder-slate-600 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {topUpError && <p className="text-xs text-red-400 mb-3">{topUpError}</p>}

            <button
              onClick={() => {
                const amt = Number(topUpAmount);
                if (!amt || amt <= 0) { setTopUpError("Enter a valid amount"); return; }
                const result = addOwnerChips(me.id, amt);
                if (!result.ok) { setTopUpError(result.error); return; }
                setTopUpOpen(false);
              }}
              className="w-full py-3 rounded-xl bg-yellow-400 text-black font-black text-sm flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors"
            >
              <Plus size={16} />
              Add ₹{Number(topUpAmount) > 0 ? Number(topUpAmount).toLocaleString() : "—"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  color,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "yellow" | "emerald" | "blue" | "purple";
  highlight?: boolean;
}) {
  const colors = {
    yellow: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };
  return (
    <div className={`border rounded-2xl px-3 py-3 ${colors[color]} ${highlight ? "hover:border-yellow-400/50 hover:bg-yellow-400/15 transition-colors" : ""}`}>
      <div className="flex items-center gap-1 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <p className="font-bold text-base sm:text-lg tabular-nums">{value}</p>
      {highlight && <p className="text-[9px] opacity-50 mt-0.5 flex items-center gap-0.5"><Plus size={8} />tap to add</p>}
    </div>
  );
}
