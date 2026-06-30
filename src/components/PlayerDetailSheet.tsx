"use client";

import { useState } from "react";
import { X, ArrowUpRight, ArrowDownLeft, Trash2, Clock, Receipt } from "lucide-react";
import StatsPanel from "./StatsPanel";
import { cn } from "@/lib/utils";
import { allocateChips, reclaimChips, deleteUser, statsForClient, type Bet, type User } from "@/lib/store";

interface Props {
  player: User;
  bets: Bet[];
  currentUser: User;
  onClose: () => void;
}

export default function PlayerDetailSheet({ player, bets, currentUser, onClose }: Props) {
  const [tab, setTab] = useState<"active" | "history">("active");
  const [allocOpen, setAllocOpen] = useState<"give" | "take" | null>(null);
  const [amount, setAmount] = useState("");
  const [allocError, setAllocError] = useState("");

  const myBets = bets.filter((b) => b.clientId === player.id).sort((a, b) => b.placedAt - a.placedAt);
  const active = myBets.filter((b) => b.status === "pending");
  const history = myBets.filter((b) => b.status !== "pending");
  const stats = statsForClient(player.id, bets);

  function handleAllocate() {
    setAllocError("");
    const n = parseInt(amount);
    if (!n || n <= 0) return setAllocError("Enter a valid amount");
    const res = allocOpen === "give"
      ? allocateChips(currentUser.id, player.id, n)
      : reclaimChips(player.id, currentUser.id, n);
    if (!res.ok) return setAllocError(res.error);
    setAmount("");
    setAllocOpen(null);
  }

  function handleDelete() {
    if (confirm(`Delete ${player.name}? Their ${player.chips} chips will be returned to you.`)) {
      deleteUser(player.id);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-[#111827] border border-white/10 rounded-t-3xl sm:rounded-2xl max-h-[88vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-[#111827] border-b border-white/5 px-5 pt-5 pb-4 z-10">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold text-lg shrink-0">
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-200 text-lg leading-tight truncate">{player.name}</p>
              <p className="text-xs text-slate-500 font-mono">@{player.username}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xl font-bold text-yellow-400 tabular-nums">{player.chips.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">chips</p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-200 p-1 rounded-lg hover:bg-white/5 shrink-0 self-start">
              <X size={18} />
            </button>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-1.5 mt-4">
            <button
              onClick={() => { setAllocOpen("give"); setAllocError(""); }}
              className="flex-1 flex items-center justify-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold py-2 rounded-lg transition-colors"
            >
              <ArrowUpRight size={13} /> Give chips
            </button>
            <button
              onClick={() => { setAllocOpen("take"); setAllocError(""); }}
              className="flex-1 flex items-center justify-center gap-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 text-xs font-semibold py-2 rounded-lg transition-colors"
            >
              <ArrowDownLeft size={13} /> Take chips
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-2.5 py-2 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Stats */}
          <StatsPanel stats={stats} perspective="client" />

          {/* Tabs */}
          <div className="flex items-center gap-1.5 border-b border-white/5">
            {[
              { id: "active" as const, label: `Active (${active.length})` },
              { id: "history" as const, label: `History (${history.length})` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-3 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px",
                  tab === t.id
                    ? "text-yellow-400 border-yellow-400"
                    : "text-slate-500 border-transparent hover:text-slate-300"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Bet list */}
          {tab === "active" ? (
            <BetList bets={active} emptyText="No active bets" />
          ) : (
            <BetList bets={history} emptyText="No settled bets yet" />
          )}
        </div>

        {/* Allocate modal */}
        {allocOpen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/60">
            <div className="bg-[#0d1321] border border-white/10 rounded-2xl p-5 w-full max-w-xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-200">
                  {allocOpen === "give" ? `Give chips to ${player.name}` : `Take chips from ${player.name}`}
                </h4>
                <button onClick={() => setAllocOpen(null)} className="text-slate-500 hover:text-slate-200">
                  <X size={16} />
                </button>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs mb-3 space-y-1">
                <div className="flex justify-between"><span className="text-slate-400">Your balance</span><span className="font-bold text-yellow-400 tabular-nums">{currentUser.chips.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">{player.name}&apos;s balance</span><span className="font-bold text-slate-300 tabular-nums">{player.chips.toLocaleString()}</span></div>
              </div>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-base text-slate-200 focus:outline-none focus:border-yellow-400/50 mb-2"
              />
              <div className="flex gap-1.5 mb-2">
                {[100, 500, 1000, 5000].map((v) => (
                  <button key={v} onClick={() => setAmount(String(v))} className="flex-1 text-xs py-2 rounded-lg bg-white/5 hover:bg-yellow-400/10 hover:text-yellow-400 text-slate-400 transition-colors">{v}</button>
                ))}
              </div>
              {allocError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-2">{allocError}</p>}
              <button onClick={handleAllocate} className={cn("w-full font-bold py-2.5 rounded-xl transition-all active:scale-[0.98]", allocOpen === "give" ? "bg-emerald-500 hover:bg-emerald-400 text-white" : "bg-orange-500 hover:bg-orange-400 text-white")}>
                {allocOpen === "give" ? "Give" : "Take"} {amount || "0"} chips
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BetList({ bets, emptyText }: { bets: Bet[]; emptyText: string }) {
  if (bets.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm flex flex-col items-center gap-2">
        <Receipt size={28} className="text-slate-700" />
        {emptyText}
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {bets.map((b) => {
        const ageMin = Math.floor((Date.now() - b.placedAt) / 60_000);
        const payout = Math.round(b.stake * b.odds);
        return (
          <div key={b.id} className={cn("rounded-xl p-3 border", b.status === "pending" ? "bg-blue-500/5 border-blue-500/20" : "bg-white/5 border-transparent")}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="min-w-0 flex-1">
                {b.market && (
                  <p className="text-[10px] text-yellow-400/80 uppercase tracking-wider font-semibold">{b.market}</p>
                )}
                <p className="text-xs text-slate-500 truncate">{b.match}</p>
                <p className="text-sm font-semibold text-slate-200 truncate">{b.pick} @ {b.odds.toFixed(2)}</p>
              </div>
              <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0", {
                pending: "bg-blue-500/20 text-blue-400 border-blue-500/30",
                won: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                lost: "bg-red-500/20 text-red-400 border-red-500/30",
              }[b.status])}>
                {b.status}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock size={11} /> {ageMin === 0 ? "just now" : `${ageMin}m ago`} · stake {b.stake.toLocaleString()}
              </span>
              {b.status === "won" && <span className="text-emerald-400 font-bold">+{payout.toLocaleString()}</span>}
              {b.status === "lost" && <span className="text-red-400 font-bold">-{b.stake.toLocaleString()}</span>}
              {b.status === "pending" && <span className="text-slate-400">pot. {payout.toLocaleString()}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
