"use client";

import { useState, useEffect } from "react";
import {
  X, ArrowUpRight, ArrowDownLeft, Trash2, Clock, Receipt,
  UserCheck, History, Activity, Wallet, CalendarDays, LogIn,
  ArrowRightLeft, Plus, Minus, Smartphone, Monitor,
} from "lucide-react";
import StatsPanel from "./StatsPanel";
import { cn } from "@/lib/utils";
import {
  allocateChips, reclaimChips, deleteUser, statsForClient, getPlayerEvents, getLoginEvents,
  type Bet, type User, type AccountEvent, type LoginEvent,
} from "@/lib/store";

interface Props {
  player: User;
  bets: Bet[];
  currentUser: User;
  onClose: () => void;
}

type Tab = "info" | "transactions" | "active" | "history";

export default function PlayerDetailSheet({ player, bets, currentUser, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("info");
  const [allocOpen, setAllocOpen] = useState<"give" | "take" | null>(null);
  const [amount, setAmount] = useState("");
  const [allocError, setAllocError] = useState("");
  const [events, setEvents] = useState<AccountEvent[]>([]);
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([]);

  useEffect(() => {
    setEvents(getPlayerEvents(player.id));
    setLoginEvents(getLoginEvents(player.id));
    const handler = () => {
      setEvents(getPlayerEvents(player.id));
      setLoginEvents(getLoginEvents(player.id));
    };
    window.addEventListener("lucky007_store_change", handler);
    return () => window.removeEventListener("lucky007_store_change", handler);
  }, [player.id]);

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
    setEvents(getPlayerEvents(player.id));
  }

  function handleDelete() {
    if (confirm(`Delete ${player.name}? Their ₹${player.chips.toLocaleString()} balance will be returned to you.`)) {
      deleteUser(player.id);
      onClose();
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "info", label: "Info", icon: <UserCheck size={13} /> },
    { id: "transactions", label: "Transactions", icon: <Wallet size={13} />, count: events.length },
    { id: "active", label: "Active", icon: <Activity size={13} />, count: active.length },
    { id: "history", label: "History", icon: <History size={13} />, count: history.length },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-[#111827] border border-white/10 rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Sticky header */}
        <div className="sticky top-0 bg-[#111827] border-b border-white/5 px-5 pt-5 pb-3 z-10">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold text-lg shrink-0">
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-200 text-lg leading-tight truncate">{player.name}</p>
              <p className="text-xs text-slate-500 font-mono">@{player.username}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xl font-bold text-yellow-400 tabular-nums">₹{player.chips.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">balance</p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-200 p-1 rounded-lg hover:bg-white/5 shrink-0 self-start">
              <X size={18} />
            </button>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-1.5 mb-3">
            <button
              onClick={() => { setAllocOpen("give"); setAllocError(""); setAmount(""); }}
              className="flex-1 flex items-center justify-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold py-2 rounded-lg transition-colors"
            >
              <ArrowUpRight size={13} /> Add Balance
            </button>
            <button
              onClick={() => { setAllocOpen("take"); setAllocError(""); setAmount(""); }}
              className="flex-1 flex items-center justify-center gap-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 text-xs font-semibold py-2 rounded-lg transition-colors"
            >
              <ArrowDownLeft size={13} /> Deduct
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-2.5 py-2 rounded-lg transition-colors"
              title="Delete player"
            >
              <Trash2 size={13} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto border-b border-white/5 -mb-px">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1 px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors",
                  tab === t.id
                    ? "text-yellow-400 border-yellow-400"
                    : "text-slate-500 border-transparent hover:text-slate-300"
                )}
              >
                {t.icon}
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-bold", tab === t.id ? "bg-yellow-400/20 text-yellow-300" : "bg-white/5 text-slate-500")}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-4 space-y-4">
          {tab === "info" && <InfoTab player={player} stats={stats} bets={myBets} loginEvents={loginEvents} />}
          {tab === "transactions" && <TransactionsTab events={events} />}
          {tab === "active" && <BetList bets={active} emptyText="No active bets" />}
          {tab === "history" && <BetList bets={history} emptyText="No settled bets yet" />}
        </div>

        {/* Chip allocation modal */}
        {allocOpen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/60">
            <div className="bg-[#0d1321] border border-white/10 rounded-2xl p-5 w-full max-w-xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-200">
                  {allocOpen === "give" ? `Add Balance — ${player.name}` : `Deduct from ${player.name}`}
                </h4>
                <button onClick={() => setAllocOpen(null)} className="text-slate-500 hover:text-slate-200">
                  <X size={16} />
                </button>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs mb-3 space-y-1">
                <div className="flex justify-between"><span className="text-slate-400">Your balance</span><span className="font-bold text-yellow-400 tabular-nums">₹{currentUser.chips.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">{player.name}&apos;s balance</span><span className="font-bold text-slate-300 tabular-nums">₹{player.chips.toLocaleString()}</span></div>
              </div>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-base text-slate-200 focus:outline-none focus:border-yellow-400/50 mb-2"
              />
              <div className="flex gap-1.5 mb-2">
                {[100, 500, 1000, 5000].map((v) => (
                  <button key={v} onClick={() => setAmount(String(v))} className="flex-1 text-xs py-2 rounded-lg bg-white/5 hover:bg-yellow-400/10 hover:text-yellow-400 text-slate-400 transition-colors">{v}</button>
                ))}
              </div>
              {allocError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-2">{allocError}</p>}
              <button onClick={handleAllocate} className={cn("w-full font-bold py-2.5 rounded-xl transition-all active:scale-[0.98]", allocOpen === "give" ? "bg-emerald-500 hover:bg-emerald-400 text-white" : "bg-orange-500 hover:bg-orange-400 text-white")}>
                {allocOpen === "give" ? "Add" : "Deduct"} ₹{amount || "0"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Info tab ──────────────────────────────────────────────────────────────────

function InfoTab({ player, stats, bets, loginEvents }: { player: User; stats: ReturnType<typeof statsForClient>; bets: Bet[]; loginEvents: LoginEvent[] }) {
  const fmt = (ts: number) =>
    new Date(ts).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });

  const firstBetAt = bets.length ? Math.min(...bets.map((b) => b.placedAt)) : null;
  const lastBetAt = bets.length ? Math.max(...bets.map((b) => b.placedAt)) : null;

  const isMobile = (device: string) =>
    /iPhone|iPad|Android/i.test(device);

  return (
    <div className="space-y-4">
      <StatsPanel stats={stats} perspective="client" />

      {/* Account details */}
      <div className="bg-[#0d1321] border border-white/5 rounded-2xl overflow-hidden">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider px-4 pt-3 pb-1.5">Account Details</p>
        <div className="divide-y divide-white/5">
          <InfoRow icon={<CalendarDays size={13} className="text-yellow-400" />} label="Account created" value={fmt(player.createdAt)} />
          <InfoRow
            icon={<LogIn size={13} className="text-emerald-400" />}
            label="Last login"
            value={player.lastLoginAt ? fmt(player.lastLoginAt) : "Never logged in"}
            valueClass={player.lastLoginAt ? "text-emerald-400" : "text-slate-600"}
          />
          {firstBetAt && (
            <InfoRow icon={<Receipt size={13} className="text-blue-400" />} label="First bet" value={fmt(firstBetAt)} />
          )}
          {lastBetAt && (
            <InfoRow icon={<Clock size={13} className="text-purple-400" />} label="Last bet" value={fmt(lastBetAt)} />
          )}
          <InfoRow icon={<Activity size={13} className="text-slate-400" />} label="Total bets" value={String(stats.totalBets)} />
          <InfoRow icon={<Wallet size={13} className="text-slate-400" />} label="Total wagered" value={`₹${stats.totalStaked.toLocaleString()}`} />
        </div>
      </div>

      {/* Login history */}
      {loginEvents.length > 0 && (
        <div className="bg-[#0d1321] border border-white/5 rounded-2xl overflow-hidden">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider px-4 pt-3 pb-1.5">
            Login History ({loginEvents.length})
          </p>
          <div className="divide-y divide-white/5">
            {loginEvents.slice(0, 10).map((le) => (
              <div key={le.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="shrink-0 text-slate-500">
                  {isMobile(le.device) ? <Smartphone size={13} className="text-blue-400" /> : <Monitor size={13} className="text-purple-400" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-300">{le.device} · {le.browser}</p>
                  <p className="text-[10px] text-slate-600">{fmt(le.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Win/loss summary */}
      {stats.totalBets > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-3">
            <p className="text-xs text-slate-500 mb-1">Won</p>
            <p className="font-bold text-emerald-400 text-lg">{stats.won}</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl py-3">
            <p className="text-xs text-slate-500 mb-1">Lost</p>
            <p className="font-bold text-red-400 text-lg">{stats.lost}</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl py-3">
            <p className="text-xs text-slate-500 mb-1">Pending</p>
            <p className="font-bold text-blue-400 text-lg">{stats.pending}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="shrink-0">{icon}</span>
      <span className="text-xs text-slate-500 flex-1">{label}</span>
      <span className={cn("text-xs font-semibold text-slate-300 text-right", valueClass)}>{value}</span>
    </div>
  );
}

// ── Transactions tab ──────────────────────────────────────────────────────────

function TransactionsTab({ events }: { events: AccountEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500 text-sm flex flex-col items-center gap-2">
        <Wallet size={28} className="text-slate-700" />
        No account activity yet
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {events.map((e) => {
        const ts = new Date(e.timestamp).toLocaleString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit", hour12: true,
        });

        if (e.type === "account_created") {
          return (
            <div key={e.id} className="bg-yellow-400/5 border border-yellow-400/10 rounded-xl px-3 py-2.5 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-yellow-400/20 flex items-center justify-center shrink-0">
                <UserCheck size={12} className="text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200">Account Created</p>
                <p className="text-[11px] text-slate-500">by {e.byName}</p>
              </div>
              <p className="text-[10px] text-slate-600 shrink-0 text-right">{ts}</p>
            </div>
          );
        }

        if (e.type === "transferred") {
          return (
            <div key={e.id} className="bg-purple-500/5 border border-purple-500/15 rounded-xl px-3 py-2.5 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                <ArrowRightLeft size={12} className="text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200">Account Transferred</p>
                <p className="text-[11px] text-slate-500">{e.note} · by {e.byName}</p>
              </div>
              <p className="text-[10px] text-slate-600 shrink-0 text-right">{ts}</p>
            </div>
          );
        }

        const isIn = e.type === "chips_in";
        return (
          <div key={e.id} className={cn("rounded-xl px-3 py-2.5 flex items-center gap-3 border", isIn ? "bg-emerald-500/5 border-emerald-500/15" : "bg-orange-500/5 border-orange-500/15")}>
            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", isIn ? "bg-emerald-500/20" : "bg-orange-500/20")}>
              {isIn ? <Plus size={12} className="text-emerald-400" /> : <Minus size={12} className="text-orange-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs font-bold tabular-nums", isIn ? "text-emerald-400" : "text-orange-400")}>
                {isIn ? "+" : "-"}₹{e.amount?.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500">{isIn ? "from" : "to"} {e.byName}</p>
            </div>
            <p className="text-[10px] text-slate-600 shrink-0 text-right">{ts}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Bet list ──────────────────────────────────────────────────────────────────

function BetList({ bets, emptyText }: { bets: Bet[]; emptyText: string }) {
  if (bets.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500 text-sm flex flex-col items-center gap-2">
        <Receipt size={28} className="text-slate-700" />
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {bets.map((b) => {
        const placedAt = new Date(b.placedAt);
        const ageMs = Date.now() - b.placedAt;
        const ageMin = Math.floor(ageMs / 60_000);
        const ageHours = Math.floor(ageMs / 3_600_000);
        const ageDays = Math.floor(ageMs / 86_400_000);
        const relLabel =
          ageDays > 0 ? `${ageDays}d ago` :
          ageHours > 0 ? `${ageHours}h ago` :
          ageMin > 0 ? `${ageMin}m ago` : "just now";
        const fullTs = placedAt.toLocaleString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit", hour12: true,
        });
        const payout = Math.round(b.stake * b.odds);

        return (
          <div key={b.id} className={cn("rounded-xl p-3 border", b.status === "pending" ? "bg-blue-500/5 border-blue-500/20" : "bg-white/5 border-transparent")}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0 flex-1">
                {b.market && (
                  <p className="text-[10px] text-yellow-400/80 uppercase tracking-wider font-semibold">{b.market}</p>
                )}
                <p className="text-[11px] text-slate-500 truncate">{b.match}</p>
                <p className="text-sm font-semibold text-slate-200 truncate">{b.pick} @ {b.odds.toFixed(2)}</p>
              </div>
              <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 mt-0.5", {
                pending: "bg-blue-500/20 text-blue-400 border-blue-500/30",
                won: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                lost: "bg-red-500/20 text-red-400 border-red-500/30",
                void: "bg-slate-500/20 text-slate-400 border-slate-500/30",
              }[b.status] ?? "bg-slate-500/20 text-slate-400 border-slate-500/30")}>
                {b.status === "void" ? "Void" : b.status}
              </span>
            </div>
            {/* Full timestamp always visible */}
            <div className="flex items-center gap-1 text-[10px] text-slate-600 mb-1.5">
              <Clock size={9} />
              <span>{fullTs}</span>
              <span className="text-slate-700">·</span>
              <span>{relLabel}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">
                Stake <span className="text-slate-400 tabular-nums">₹{b.stake.toLocaleString()}</span>
              </span>
              {b.status === "won" && <span className="text-emerald-400 font-bold">+₹{payout.toLocaleString()}</span>}
              {b.status === "lost" && <span className="text-red-400 font-bold">-₹{b.stake.toLocaleString()}</span>}
              {b.status === "pending" && <span className="text-slate-400">potential ₹{payout.toLocaleString()}</span>}
              {b.status === "void" && <span className="text-slate-400 font-semibold">Stake returned</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
