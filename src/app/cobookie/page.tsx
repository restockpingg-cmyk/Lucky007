"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Coins, Users, Receipt, BarChart3, History, Clock, TrendingUp, TrendingDown,
  Activity, Percent, Plus, X, ArrowUpRight, ArrowDownLeft,
} from "lucide-react";
import TopBar from "@/components/TopBar";
import Loading from "@/components/Loading";
import { useStore, useHydrated, createUser, allocateChips, reclaimChips } from "@/lib/store";
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

  // Players this co-bookie manages (parentId = me.id)
  const managedClients = store.users.filter((u) => u.role === "client" && u.parentId === me.id);
  // Admin-direct players with commissionTo = me.id (co-bookie earns commission but doesn't manage)
  const commissionOnlyClients = store.users.filter((u) =>
    u.role === "client" && u.parentId !== me.id && u.commissionTo === me.id
  );
  // All players that contribute to this co-bookie's commission
  const allCommissionClients = [...managedClients, ...commissionOnlyClients];
  const allCommissionIds = new Set(allCommissionClients.map((c) => c.id));

  const allManagedIds = new Set(managedClients.map((c) => c.id));
  const allManagedBets = store.bets.filter((b) => allManagedIds.has(b.clientId)).sort((a, b) => b.placedAt - a.placedAt);
  const pendingBets = allManagedBets.filter((b) => b.status === "pending");

  // Commission earnings: across all commission clients
  const allCommBets = store.bets.filter((b) => allCommissionIds.has(b.clientId));
  const resolvedCommBets = allCommBets.filter((b) => b.status !== "pending");

  const myCommissionRate = me.commission ?? 0;
  const myEarnings = allCommissionClients.reduce((sum, client) => {
    const rate = client.commission ?? (client.parentId === me.id ? myCommissionRate : 0);
    const clientResolved = store.bets.filter((b) => b.clientId === client.id && b.status !== "pending");
    const clientWon = clientResolved.filter((b) => b.status === "won");
    const clientStaked = clientResolved.reduce((s, b) => s + b.stake, 0);
    const clientPayout = clientWon.reduce((s, b) => s + Math.round(b.stake * b.odds), 0);
    const clientHouseProfit = clientStaked - clientPayout;
    return sum + Math.round(clientHouseProfit * rate / 100);
  }, 0);

  const resolvedManaged = allManagedBets.filter((b) => b.status !== "pending");
  const wonManaged = resolvedManaged.filter((b) => b.status === "won");
  const totalStaked = resolvedManaged.reduce((s, b) => s + b.stake, 0);
  const totalPayout = wonManaged.reduce((s, b) => s + Math.round(b.stake * b.odds), 0);
  const houseProfit = totalStaked - totalPayout;

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: <BarChart3 size={14} /> },
    { id: "players" as const, label: "Players", icon: <Users size={14} />, badge: managedClients.length },
    { id: "history" as const, label: "History", icon: <History size={14} />, badge: resolvedCommBets.length },
  ];

  return (
    <div className="min-h-screen pb-12">
      <TopBar user={me} subtitle="Co-Bookie Panel" />
      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">

        {/* Stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard icon={<Coins size={14} />} label="Your chips" value={me.chips.toLocaleString()} color="yellow" />
          <StatCard icon={<Percent size={14} />} label="Default comm." value={`${myCommissionRate}%`} color="purple" />
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
            <p className="text-sm font-bold text-purple-300">Default: {myCommissionRate}% of house profit</p>
            <p className="text-xs text-slate-500">
              Managed players P&L: <span className={cn("font-semibold", houseProfit >= 0 ? "text-emerald-400" : "text-red-400")}>{houseProfit >= 0 ? "+" : ""}{houseProfit.toLocaleString()}</span>
              {commissionOnlyClients.length > 0 && <span className="ml-1 text-yellow-400/70">· +{commissionOnlyClients.length} shared players</span>}
              {" · "}My cut: <span className="font-semibold text-yellow-400">{myEarnings.toLocaleString()}</span>
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
          <OverviewTab
            me={me}
            pendingBets={pendingBets}
            allManagedBets={allManagedBets}
            managedClients={managedClients}
            commissionOnlyClients={commissionOnlyClients}
            allCommissionClients={allCommissionClients}
            myCommissionRate={myCommissionRate}
            bets={store.bets}
          />
        )}

        {tab === "players" && (
          <PlayersTab
            me={me}
            managedClients={managedClients}
            commissionOnlyClients={commissionOnlyClients}
            myCommissionRate={myCommissionRate}
            bets={store.bets}
          />
        )}

        {tab === "history" && (
          <HistoryTab
            allCommissionClients={allCommissionClients}
            resolvedBets={resolvedCommBets}
            myCommissionRate={myCommissionRate}
          />
        )}

      </main>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

function OverviewTab({
  me,
  pendingBets,
  allManagedBets,
  managedClients,
  commissionOnlyClients,
  allCommissionClients,
  myCommissionRate,
  bets,
}: {
  me: { id: string; name: string };
  pendingBets: ReturnType<typeof useStore>["bets"];
  allManagedBets: ReturnType<typeof useStore>["bets"];
  managedClients: ReturnType<typeof useStore>["users"];
  commissionOnlyClients: ReturnType<typeof useStore>["users"];
  allCommissionClients: ReturnType<typeof useStore>["users"];
  myCommissionRate: number;
  bets: ReturnType<typeof useStore>["bets"];
}) {
  const totalStaked = allManagedBets.filter(b => b.status !== "pending").reduce((s, b) => s + b.stake, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#111827] border border-white/5 rounded-xl py-3">
          <p className="text-xs text-slate-500 mb-1">Total Bets</p>
          <p className="font-bold text-slate-200 text-lg">{allManagedBets.length}</p>
        </div>
        <div className="bg-[#111827] border border-white/5 rounded-xl py-3">
          <p className="text-xs text-slate-500 mb-1">Total Staked</p>
          <p className="font-bold text-slate-200 text-lg tabular-nums">{totalStaked.toLocaleString()}</p>
        </div>
        <div className="bg-[#111827] border border-white/5 rounded-xl py-3">
          <p className="text-xs text-slate-500 mb-1">Players</p>
          <p className="font-bold text-slate-200 text-lg">{managedClients.length}{commissionOnlyClients.length > 0 && <span className="text-xs text-yellow-400/60">+{commissionOnlyClients.length}</span>}</p>
        </div>
      </div>

      {commissionOnlyClients.length > 0 && (
        <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl px-4 py-2.5">
          <p className="text-xs text-yellow-400 font-semibold">+{commissionOnlyClients.length} admin-managed player{commissionOnlyClients.length !== 1 ? "s" : ""} sharing commission with you</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{commissionOnlyClients.map(c => c.name).join(", ")}</p>
        </div>
      )}

      {pendingBets.length > 0 && (
        <section>
          <h3 className="font-bold text-slate-200 mb-2.5 flex items-center gap-2">
            <Activity size={14} className="text-blue-400" /> Live Bets
            <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">{pendingBets.length}</span>
          </h3>
          <div className="space-y-1.5">
            {pendingBets.slice(0, 10).map((b) => {
              const client = managedClients.find((c) => c.id === b.clientId);
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

      {allManagedBets.length === 0 && (
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-8 text-center">
          <Receipt size={28} className="text-slate-700 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No bets yet</p>
          <p className="text-slate-600 text-xs mt-1">Add players and share their login details</p>
        </div>
      )}
    </div>
  );
}

// ── Players ───────────────────────────────────────────────────────────────────

function PlayersTab({
  me,
  managedClients,
  commissionOnlyClients,
  myCommissionRate,
  bets,
}: {
  me: ReturnType<typeof useStore>["users"][0];
  managedClients: ReturnType<typeof useStore>["users"];
  commissionOnlyClients: ReturnType<typeof useStore>["users"];
  myCommissionRate: number;
  bets: ReturnType<typeof useStore>["bets"];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [createError, setCreateError] = useState("");

  // Chip dialog
  const [chipDialog, setChipDialog] = useState<{ client: ReturnType<typeof useStore>["users"][0]; type: "give" | "take" } | null>(null);
  const [chipAmount, setChipAmount] = useState("");
  const [chipError, setChipError] = useState("");

  function handleCreate() {
    setCreateError("");
    if (!name.trim() || !username.trim() || !pin.trim()) return setCreateError("All fields required");
    if (pin.length < 4) return setCreateError("PIN must be 4+ digits");
    const res = createUser(me.id, {
      name: name.trim(),
      username: username.trim(),
      pin: pin.trim(),
      role: "client",
      commissionTo: me.id,
    });
    if (!res.ok) return setCreateError(res.error);
    setName(""); setUsername(""); setPin("");
    setCreateOpen(false);
  }

  function handleChipTransfer() {
    setChipError("");
    if (!chipDialog) return;
    const n = parseInt(chipAmount);
    if (!n || n <= 0) return setChipError("Enter a valid amount");
    const res = chipDialog.type === "give"
      ? allocateChips(me.id, chipDialog.client.id, n)
      : allocateChips(chipDialog.client.id, me.id, n);
    if (!res.ok) return setChipError(res.error);
    setChipAmount(""); setChipDialog(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{managedClients.length} player{managedClients.length !== 1 ? "s" : ""} under you</p>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1 bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all">
          <Plus size={14} /> Add Player
        </button>
      </div>

      {managedClients.length === 0 && commissionOnlyClients.length === 0 ? (
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-8 text-center">
          <Users size={28} className="text-slate-700 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No players yet</p>
          <p className="text-slate-600 text-xs mt-1">Add your own players below</p>
        </div>
      ) : (
        <div className="space-y-2">
          {managedClients.map((c) => {
            const clientBets = bets.filter((b) => b.clientId === c.id);
            const cResolved = clientBets.filter((b) => b.status !== "pending");
            const cWon = cResolved.filter((b) => b.status === "won");
            const cStaked = cResolved.reduce((s, b) => s + b.stake, 0);
            const cPayout = cWon.reduce((s, b) => s + Math.round(b.stake * b.odds), 0);
            const cHouseProfit = cStaked - cPayout;
            const rate = c.commission ?? myCommissionRate;
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
                    <p className="text-[10px] text-purple-400/80">{rate}% comm.</p>
                  </div>
                </div>
                {cResolved.length > 0 && (
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>House P&L: <span className={cn("font-semibold", cHouseProfit >= 0 ? "text-emerald-400" : "text-red-400")}>{cHouseProfit >= 0 ? "+" : ""}{cHouseProfit.toLocaleString()}</span></span>
                    <span>Your cut: <span className="font-semibold text-yellow-400">{Math.round(cHouseProfit * rate / 100).toLocaleString()}</span></span>
                  </div>
                )}
                <div className="flex gap-2 mt-2.5">
                  <button
                    onClick={() => { setChipDialog({ client: c, type: "give" }); setChipError(""); setChipAmount(""); }}
                    className="flex-1 flex items-center justify-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold py-1.5 rounded-lg transition-colors"
                  >
                    <ArrowUpRight size={12} /> Give chips
                  </button>
                  <button
                    onClick={() => { setChipDialog({ client: c, type: "take" }); setChipError(""); setChipAmount(""); }}
                    className="flex-1 flex items-center justify-center gap-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 text-xs font-semibold py-1.5 rounded-lg transition-colors"
                  >
                    <ArrowDownLeft size={12} /> Take chips
                  </button>
                </div>
              </div>
            );
          })}

          {/* Commission-only players (managed by admin, commission goes to this co-bookie) */}
          {commissionOnlyClients.length > 0 && (
            <section>
              <p className="text-[10px] font-bold text-yellow-400/60 uppercase tracking-wider mb-2 mt-3">Shared by admin — commission only</p>
              {commissionOnlyClients.map((c) => {
                const clientBets = bets.filter((b) => b.clientId === c.id);
                const cResolved = clientBets.filter((b) => b.status !== "pending");
                const cWon = cResolved.filter((b) => b.status === "won");
                const cStaked = cResolved.reduce((s, b) => s + b.stake, 0);
                const cPayout = cWon.reduce((s, b) => s + Math.round(b.stake * b.odds), 0);
                const cHouseProfit = cStaked - cPayout;
                const rate = c.commission ?? myCommissionRate;
                return (
                  <div key={c.id} className="bg-[#111827] border border-yellow-400/10 rounded-2xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400/10 to-yellow-600/5 border border-yellow-400/10 flex items-center justify-center text-yellow-400/70 font-bold shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-300 truncate">{c.name}</p>
                        <p className="text-xs text-slate-600 font-mono">@{c.username} · managed by admin</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-purple-400/80">{rate}% rate</p>
                      </div>
                    </div>
                    {cResolved.length > 0 && (
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>House P&L: <span className={cn("font-semibold", cHouseProfit >= 0 ? "text-emerald-400" : "text-red-400")}>{cHouseProfit >= 0 ? "+" : ""}{cHouseProfit.toLocaleString()}</span></span>
                        <span>Your cut: <span className="font-semibold text-yellow-400">{Math.round(cHouseProfit * rate / 100).toLocaleString()}</span></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}
        </div>
      )}

      {/* Add Player modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
          <div className="relative w-full sm:max-w-sm bg-[#111827] border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl">
            <h3 className="font-bold text-slate-200 mb-1">Add Player</h3>
            <p className="text-xs text-slate-500 mb-4">Player will be added under your account. Chips come from your balance.</p>
            <div className="space-y-3">
              <CBInput label="Display name" value={name} onChange={setName} placeholder="Rahul Kumar" />
              <CBInput label="Username" value={username} onChange={setUsername} placeholder="rahulkumar" />
              <CBInput label="PIN" value={pin} onChange={setPin} placeholder="4+ digits" type="password" inputMode="numeric" />
              {createError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{createError}</p>}
              <button onClick={handleCreate} className="w-full bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-black font-bold py-3 rounded-xl transition-all">Create Player</button>
            </div>
          </div>
        </div>
      )}

      {/* Chip dialog */}
      {chipDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setChipDialog(null)} />
          <div className="relative bg-[#0d1321] border border-white/10 rounded-2xl p-5 w-full max-w-xs shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-200">
                {chipDialog.type === "give" ? `Give chips to ${chipDialog.client.name}` : `Take chips from ${chipDialog.client.name}`}
              </h4>
              <button onClick={() => setChipDialog(null)} className="text-slate-500 hover:text-slate-200"><X size={16} /></button>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs mb-3 space-y-1">
              <div className="flex justify-between"><span className="text-slate-400">Your balance</span><span className="font-bold text-yellow-400 tabular-nums">{me.chips.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">{chipDialog.client.name}&apos;s balance</span><span className="font-bold text-slate-300 tabular-nums">{chipDialog.client.chips.toLocaleString()}</span></div>
            </div>
            <input
              type="number"
              inputMode="numeric"
              value={chipAmount}
              onChange={(e) => setChipAmount(e.target.value)}
              placeholder="Amount"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-base text-slate-200 focus:outline-none focus:border-yellow-400/50 mb-2"
              autoFocus
            />
            <div className="flex gap-1.5 mb-2">
              {[100, 500, 1000, 5000].map((v) => (
                <button key={v} onClick={() => setChipAmount(String(v))} className="flex-1 text-xs py-2 rounded-lg bg-white/5 hover:bg-yellow-400/10 hover:text-yellow-400 text-slate-400 transition-colors">{v}</button>
              ))}
            </div>
            {chipError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-2">{chipError}</p>}
            <button
              onClick={handleChipTransfer}
              className={cn("w-full font-bold py-2.5 rounded-xl transition-all active:scale-[0.98]", chipDialog.type === "give" ? "bg-emerald-500 hover:bg-emerald-400 text-white" : "bg-orange-500 hover:bg-orange-400 text-white")}
            >
              {chipDialog.type === "give" ? "Give" : "Take"} {chipAmount || "0"} chips
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── History ───────────────────────────────────────────────────────────────────

function HistoryTab({
  allCommissionClients,
  resolvedBets,
  myCommissionRate,
}: {
  allCommissionClients: ReturnType<typeof useStore>["users"];
  resolvedBets: ReturnType<typeof useStore>["bets"];
  myCommissionRate: number;
}) {
  if (resolvedBets.length === 0) {
    return (
      <div className="bg-[#111827] border border-white/5 rounded-2xl p-8 text-center">
        <History size={28} className="text-slate-700 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">No settled bets yet</p>
      </div>
    );
  }

  const sorted = [...resolvedBets].sort((a, b) => b.placedAt - a.placedAt);

  return (
    <div className="space-y-1.5">
      {sorted.slice(0, 100).map((b) => {
        const client = allCommissionClients.find((c) => c.id === b.clientId);
        const rate = client?.commission ?? myCommissionRate;
        const houseProfit = b.status === "lost" ? b.stake : -Math.round(b.stake * (b.odds - 1));
        const myCut = Math.round(houseProfit * rate / 100);
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
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

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

function CBInput({ label, value, onChange, placeholder, type = "text", inputMode }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; inputMode?: "numeric" | "text" }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5 font-medium">{label}</label>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-base text-slate-200 placeholder-slate-600 focus:outline-none focus:border-yellow-400/50 transition-colors"
      />
    </div>
  );
}
