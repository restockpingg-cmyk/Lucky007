"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Users, Receipt, BarChart3, History, Clock, TrendingUp, TrendingDown, Activity, Percent } from "lucide-react";
import TopBar from "@/components/TopBar";
import Loading from "@/components/Loading";
import { useStore, useHydrated, statsForAdmin } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function CoBookieDashboard() {
  const router = useRouter();
  const hydrated = useHydrated();
  const store = useStore();
  const me = store.users.find((u) => u.id === store.currentUserId);
  const [tab, setTab] = useState<"overview" | "players" | "history">("overview");
  const [, setNow] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setNow((n) => n + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!me) router.replace("/");
    else if (me.role !== "cobookie") router.replace(`/${me.role}`);
  }, [hydrated, me, router]);

  if (!hydrated) return <Loading />;
  if (!me || me.role !== "cobookie") return <Loading />;

  const clients = store.users.filter((u) => u.role === "client" && u.parentId === me.id);
  const clientIds = new Set(clients.map((c) => c.id));
  const allBets = store.bets.filter((b) => clientIds.has(b.clientId)).sort((a, b) => b.placedAt - a.placedAt);
  const pendingBets = allBets.filter((b) => b.status === "pending");
  const resolvedBets = allBets.filter((b) => b.status !== "pending");

  const wonBets = resolvedBets.filter((b) => b.status === "won");
  const totalStaked = resolvedBets.reduce((s, b) => s + b.stake, 0);
  const totalPayout = wonBets.reduce((s, b) => s + Math.round(b.stake * b.odds), 0);
  const houseProfit = totalStaked - totalPayout;
  const myCommissionRate = me.commission ?? 0;
  const myEarnings = Math.round(houseProfit * myCommissionRate / 100);

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: <BarChart3 size={14} /> },
    { id: "players" as const, label: "Players", icon: <Users size={14} />, badge: clients.length },
    { id: "history" as const, label: "History", icon: <History size={14} />, badge: resolvedBets.length },
  ];

  return (
    <div className="min-h-screen pb-12">
      <TopBar user={me} subtitle="Co-Bookie Panel" />
      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">

        {/* Stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard icon={<Coins size={14} />} label="Your chips" value={me.chips.toLocaleString()} color="yellow" />
          <StatCard icon={<Percent size={14} />} label="Commission" value={`${myCommissionRate}%`} color="purple" />
          <StatCard icon={<Receipt size={14} />} label="Open bets" value={String(pendingBets.length)} color="blue" />
          <StatCard
            icon={myEarnings >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            label="My earnings"
            value={`${myEarnings >= 0 ? "+" : ""}${myEarnings.toLocaleString()}`}
            color={myEarnings >= 0 ? "emerald" : "red"}
          />
        </div>

        {/* Commission info */}
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <Percent size={16} className="text-purple-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-purple-300">You earn {myCommissionRate}% commission</p>
            <p className="text-xs text-slate-500">
              House P&L: <span className={cn("font-semibold", houseProfit >= 0 ? "text-emerald-400" : "text-red-400")}>{houseProfit >= 0 ? "+" : ""}{houseProfit.toLocaleString()}</span>
              {" · "}Your cut: <span className="font-semibold text-yellow-400">{myEarnings.toLocaleString()}</span>
            </p>
          </div>
        </div>

        {/* Tab strip */}
        <div className="flex items-center gap-1 overflow-x-auto -mx-4 px-4 border-b border-white/5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors",
                tab === t.id
                  ? "text-yellow-400 border-yellow-400"
                  : "text-slate-500 border-transparent hover:text-slate-300"
              )}
            >
              {t.icon}
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold", tab === t.id ? "bg-yellow-400/20 text-yellow-300" : "bg-white/5 text-slate-400")}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[#111827] border border-white/5 rounded-xl py-3">
                <p className="text-xs text-slate-500 mb-1">Total Bets</p>
                <p className="font-bold text-slate-200 text-lg">{allBets.length}</p>
              </div>
              <div className="bg-[#111827] border border-white/5 rounded-xl py-3">
                <p className="text-xs text-slate-500 mb-1">Total Staked</p>
                <p className="font-bold text-slate-200 text-lg tabular-nums">{totalStaked.toLocaleString()}</p>
              </div>
              <div className="bg-[#111827] border border-white/5 rounded-xl py-3">
                <p className="text-xs text-slate-500 mb-1">Players</p>
                <p className="font-bold text-slate-200 text-lg">{clients.length}</p>
              </div>
            </div>

            {pendingBets.length > 0 && (
              <section>
                <h3 className="font-bold text-slate-200 mb-2.5 flex items-center gap-2">
                  <Activity size={14} className="text-blue-400" /> Live Bets
                  <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">{pendingBets.length}</span>
                </h3>
                <div className="space-y-1.5">
                  {pendingBets.slice(0, 10).map((b) => {
                    const client = clients.find((c) => c.id === b.clientId);
                    const ageMin = Math.floor((Date.now() - b.placedAt) / 60_000);
                    return (
                      <div key={b.id} className="bg-[#111827] border border-white/5 rounded-xl p-2.5 flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-slate-300 font-semibold truncate">{client?.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{b.pick} @ {b.odds.toFixed(2)} · {b.match}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold tabular-nums text-slate-200">{b.stake.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-500 flex items-center justify-end gap-0.5">
                            <Clock size={9} /> {ageMin === 0 ? "now" : `${ageMin}m`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {allBets.length === 0 && (
              <div className="bg-[#111827] border border-white/5 rounded-2xl p-8 text-center">
                <Receipt size={28} className="text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No bets yet</p>
                <p className="text-slate-600 text-xs mt-1">Add players and share their login details</p>
              </div>
            )}
          </div>
        )}

        {tab === "players" && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">{clients.length} player{clients.length !== 1 ? "s" : ""} under you</p>
            {clients.length === 0 ? (
              <div className="bg-[#111827] border border-white/5 rounded-2xl p-8 text-center">
                <Users size={28} className="text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No players yet</p>
                <p className="text-slate-600 text-xs mt-1">Ask your admin to add players under your account</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clients.map((c) => {
                  const clientBets = allBets.filter((b) => b.clientId === c.id);
                  const cResolved = clientBets.filter((b) => b.status !== "pending");
                  const cWon = cResolved.filter((b) => b.status === "won");
                  const cStaked = cResolved.reduce((s, b) => s + b.stake, 0);
                  const cPayout = cWon.reduce((s, b) => s + Math.round(b.stake * b.odds), 0);
                  const cHouseProfit = cStaked - cPayout;
                  return (
                    <div key={c.id} className="bg-[#111827] border border-white/5 rounded-2xl p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-200 truncate">{c.name}</p>
                          <p className="text-xs text-slate-500 font-mono">@{c.username} · {clientBets.filter(b => b.status === "pending").length} active</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-yellow-400 tabular-nums">{c.chips.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-500">chips</p>
                        </div>
                      </div>
                      {cResolved.length > 0 && (
                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                          <span>House P&L: <span className={cn("font-semibold", cHouseProfit >= 0 ? "text-emerald-400" : "text-red-400")}>{cHouseProfit >= 0 ? "+" : ""}{cHouseProfit.toLocaleString()}</span></span>
                          <span>Your cut: <span className="font-semibold text-yellow-400">{Math.round(cHouseProfit * myCommissionRate / 100).toLocaleString()}</span></span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-1.5">
            {resolvedBets.length === 0 ? (
              <div className="bg-[#111827] border border-white/5 rounded-2xl p-8 text-center">
                <History size={28} className="text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No settled bets yet</p>
              </div>
            ) : resolvedBets.slice(0, 100).map((b) => {
              const client = clients.find((c) => c.id === b.clientId);
              const houseProfit = b.status === "lost" ? b.stake : -Math.round(b.stake * (b.odds - 1));
              const myCut = Math.round(houseProfit * myCommissionRate / 100);
              return (
                <div key={b.id} className="bg-[#111827] border border-white/5 rounded-xl p-2.5 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-300 font-semibold truncate">{client?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{b.pick} @ {b.odds.toFixed(2)} · {b.match}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-sm font-bold tabular-nums", houseProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {houseProfit >= 0 ? "+" : ""}{houseProfit.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-yellow-400/70 tabular-nums">cut: {myCut >= 0 ? "+" : ""}{myCut.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: "yellow" | "emerald" | "blue" | "purple" | "red" }) {
  const colors = {
    yellow: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
  };
  return (
    <div className={`border rounded-xl px-2.5 py-2 ${colors[color]}`}>
      <div className="flex items-center gap-1 mb-0.5">
        {icon}
        <span className="text-[10px] uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <p className="font-bold text-sm sm:text-base tabular-nums">{value}</p>
    </div>
  );
}
