"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Coins, Users, Receipt, BarChart3, History, Clock, TrendingUp, TrendingDown,
  Plus, ChevronRight, Activity, Percent, ArrowUpRight, ArrowDownLeft, X, ChevronDown, ChevronUp,
  Pencil, ScrollText,
} from "lucide-react";
import TopBar from "@/components/TopBar";
import StatsPanel from "@/components/StatsPanel";
import PlayerDetailSheet from "@/components/PlayerDetailSheet";
import Loading from "@/components/Loading";
import {
  useStore, useHydrated, statsForClient,
  createUser, allocateChips, reclaimChips, updateCommission, reassignPlayer, assignPlayerCommission, deleteCobookie,
  type User, type Stats, type CommissionChange,
} from "@/lib/store";
import { cn } from "@/lib/utils";

type Tab = "overview" | "players" | "cobookies" | "live" | "history" | "commlog";

export default function AdminDashboard() {
  const router = useRouter();
  const hydrated = useHydrated();
  const store = useStore();
  const me = store.users.find((u) => u.id === store.currentUserId);
  const [tab, setTab] = useState<Tab>("overview");
  const [openPlayer, setOpenPlayer] = useState<User | null>(null);
  const [, setNow] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setNow((n) => n + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!me) router.replace("/");
    else if (me.role !== "admin") router.replace(`/${me.role}`);
  }, [hydrated, me, router]);

  if (!hydrated) return <Loading />;
  if (!me || me.role !== "admin") return <Loading />;

  const cobookies = store.users.filter((u) => u.role === "cobookie" && u.parentId === me.id);
  const directClients = store.users.filter((u) => u.role === "client" && u.parentId === me.id);
  const cbClients = store.users.filter((u) =>
    u.role === "client" && cobookies.some((cb) => cb.id === u.parentId)
  );
  const allNetworkClients = [...directClients, ...cbClients];
  const clientIds = new Set(allNetworkClients.map((c) => c.id));
  const allBets = store.bets.filter((b) => clientIds.has(b.clientId)).sort((a, b) => b.placedAt - a.placedAt);
  const pendingBets = allBets.filter((b) => b.status === "pending");
  const resolvedBets = allBets.filter((b) => b.status !== "pending");
  const totalClientChips = allNetworkClients.reduce((s, c) => s + c.chips, 0);
  const totalCobookieChips = cobookies.reduce((s, cb) => s + cb.chips, 0);

  // Network-wide stats (all clients including under co-bookies)
  const nWon = resolvedBets.filter((b) => b.status === "won");
  const nLost = resolvedBets.filter((b) => b.status === "lost");
  const nStaked = resolvedBets.reduce((s, b) => s + b.stake, 0);
  const nPayout = nWon.reduce((s, b) => s + Math.round(b.stake * b.odds), 0);
  const networkStats: Stats = {
    totalBets: allBets.length,
    won: nWon.length,
    lost: nLost.length,
    pending: pendingBets.length,
    totalStaked: nStaked,
    totalPayout: nPayout,
    profit: nStaked - nPayout,
    winRate: resolvedBets.length ? (nLost.length / resolvedBets.length) * 100 : 0,
    biggestWin: nLost.reduce((m, b) => Math.max(m, b.stake), 0),
    biggestLoss: nWon.reduce((m, b) => Math.max(m, Math.round(b.stake * (b.odds - 1))), 0),
  };

  const commLog = (store.commissionHistory ?? []).slice().reverse(); // most recent first

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: <BarChart3 size={14} /> },
    { id: "players", label: "Players", icon: <Users size={14} />, badge: allNetworkClients.length },
    { id: "cobookies", label: "Co-Bookies", icon: <Percent size={14} />, badge: cobookies.length },
    { id: "live", label: "Live", icon: <Activity size={14} />, badge: pendingBets.length },
    { id: "history", label: "History", icon: <History size={14} />, badge: resolvedBets.length },
    { id: "commlog", label: "Comm Log", icon: <ScrollText size={14} />, badge: commLog.length || undefined },
  ];

  return (
    <div className="min-h-screen pb-12">
      <TopBar user={me} />
      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Compact stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat icon={<Coins size={14} />} label="Your chips" value={me.chips.toLocaleString()} color="yellow" />
          <Stat icon={<Coins size={14} />} label="With players" value={(totalClientChips + totalCobookieChips).toLocaleString()} color="purple" />
          <Stat icon={<Receipt size={14} />} label="Open bets" value={String(pendingBets.length)} color="blue" />
          <Stat
            icon={networkStats.profit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            label="Net P&L"
            value={`${networkStats.profit >= 0 ? "+" : ""}${networkStats.profit.toLocaleString()}`}
            color={networkStats.profit >= 0 ? "emerald" : "red"}
          />
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

        {/* Tab content */}
        {tab === "overview" && (
          <OverviewTab stats={networkStats} clients={allNetworkClients} bets={store.bets} onOpenPlayer={setOpenPlayer} />
        )}
        {tab === "players" && (
          <PlayersTab
            directClients={directClients}
            cobookies={cobookies}
            cbClients={cbClients}
            allUsers={store.users}
            bets={store.bets}
            admin={me}
            onOpenPlayer={setOpenPlayer}
          />
        )}
        {tab === "cobookies" && (
          <CoBookiesTab cobookies={cobookies} bets={store.bets} allUsers={store.users} admin={me} />
        )}
        {tab === "live" && <LiveTab clients={allNetworkClients} bets={pendingBets} onOpenPlayer={setOpenPlayer} />}
        {tab === "history" && <HistoryTab clients={allNetworkClients} bets={resolvedBets} />}
        {tab === "commlog" && <CommLogTab log={commLog} />}
      </main>

      {openPlayer && (
        <PlayerDetailSheet
          player={openPlayer}
          bets={store.bets}
          currentUser={me}
          onClose={() => setOpenPlayer(null)}
        />
      )}
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

function OverviewTab({
  stats,
  clients,
  bets,
  onOpenPlayer,
}: {
  stats: Stats;
  clients: User[];
  bets: ReturnType<typeof useStore>["bets"];
  onOpenPlayer: (p: User) => void;
}) {
  const topByVolume = [...clients]
    .map((c) => ({ client: c, s: statsForClient(c.id, bets) }))
    .filter((x) => x.s.totalBets > 0)
    .sort((a, b) => b.s.totalStaked - a.s.totalStaked)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <StatsPanel stats={stats} perspective="admin" />
      {topByVolume.length > 0 && (
        <section>
          <h3 className="font-bold text-slate-200 mb-2.5 flex items-center gap-2">
            <TrendingUp size={14} className="text-yellow-400" /> Top Players by Volume
          </h3>
          <div className="space-y-1.5">
            {topByVolume.map(({ client, s }) => (
              <button key={client.id} onClick={() => onOpenPlayer(client)} className="w-full bg-[#111827] border border-white/5 rounded-xl p-3 flex items-center gap-3 hover:border-white/10 transition-colors text-left">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold shrink-0">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-200 truncate">{client.name}</p>
                  <p className="text-xs text-slate-500">{s.totalBets} bets · wagered {s.totalStaked.toLocaleString()}</p>
                </div>
                <span className={cn("text-sm font-bold tabular-nums shrink-0", s.profit >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {s.profit >= 0 ? "+" : ""}{s.profit.toLocaleString()}
                </span>
                <ChevronRight size={14} className="text-slate-600" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Players ───────────────────────────────────────────────────────────────────

function PlayersTab({
  directClients,
  cobookies,
  cbClients,
  allUsers,
  bets,
  admin,
  onOpenPlayer,
}: {
  directClients: User[];
  cobookies: User[];
  cbClients: User[];
  allUsers: User[];
  bets: ReturnType<typeof useStore>["bets"];
  admin: User;
  onOpenPlayer: (p: User) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [commission, setCommission] = useState("");
  const [assignTo, setAssignTo] = useState<string>(admin.id);
  const [commissionTo, setCommissionTo] = useState<string>("");
  const [createError, setCreateError] = useState("");

  // Edit commission state (rate + which co-bookie)
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editRate, setEditRate] = useState("");
  const [editCBId, setEditCBId] = useState("");
  const [editError, setEditError] = useState("");

  // Reassign / transfer player state
  const [reassignTarget, setReassignTarget] = useState<User | null>(null);
  const [reassignCB, setReassignCB] = useState("");
  const [reassignComm, setReassignComm] = useState("");
  const [reassignError, setReassignError] = useState("");
  const [reassignOptions, setReassignOptions] = useState<{ id: string; label: string; commission?: number }[]>([]);

  const totalPlayers = directClients.length + cbClients.length;

  function handleCreate() {
    setCreateError("");
    if (!name.trim() || !username.trim() || !pin.trim()) return setCreateError("All fields required");
    if (pin.length < 4) return setCreateError("PIN must be 4+ digits");
    const commVal = commission.trim() ? parseInt(commission) : undefined;
    if (commVal !== undefined && (commVal < 1 || commVal > 100)) return setCreateError("Commission must be 1–100%");
    // If assigning to a co-bookie, commissionTo = that co-bookie automatically
    const cbTo = assignTo !== admin.id ? assignTo : (commissionTo || undefined);
    const res = createUser(assignTo, { name: name.trim(), username: username.trim(), pin: pin.trim(), role: "client", commission: commVal, commissionTo: cbTo });
    if (!res.ok) return setCreateError(res.error);
    setName(""); setUsername(""); setPin(""); setCommission(""); setAssignTo(admin.id); setCommissionTo("");
    setCreateOpen(false);
  }

  // Group cbClients by cobookie
  const byCoBookieId = new Map<string, User[]>();
  for (const cb of cobookies) byCoBookieId.set(cb.id, []);
  for (const c of cbClients) {
    if (c.parentId && byCoBookieId.has(c.parentId)) {
      byCoBookieId.get(c.parentId)!.push(c);
    }
  }

  // Direct admin players that also have commission assigned to a co-bookie
  const directWithCB = directClients.filter((c) => c.commissionTo);
  // Direct admin players with no commission assignment
  const directNoCB = directClients.filter((c) => !c.commissionTo);

  // Gather co-bookie players added by co-bookies themselves (parentId = cb.id, but cb.parentId = admin.id)
  const cbOwnPlayers = allUsers.filter((u) =>
    u.role === "client" && cobookies.some((cb) => cb.id === u.parentId) && !cbClients.some((c) => c.id === u.id)
  );
  // Merge with cbClients (cbClients already covers parentId-based)
  const allCBPlayers = [...cbClients, ...cbOwnPlayers];
  const allCBPlayerIds = new Set(allCBPlayers.map((u) => u.id));
  for (const u of allCBPlayers) {
    if (u.parentId && byCoBookieId.has(u.parentId) && !byCoBookieId.get(u.parentId)!.some((x) => x.id === u.id)) {
      byCoBookieId.get(u.parentId)!.push(u);
    }
  }

  function openEditCommission(u: User) {
    setEditTarget(u);
    setEditRate(String(u.commission ?? ""));
    setEditCBId(u.commissionTo ?? (u.parentId && cobookies.some(cb => cb.id === u.parentId) ? u.parentId! : ""));
    setEditError("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{totalPlayers} player{totalPlayers !== 1 ? "s" : ""} total</p>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1 bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all">
          <Plus size={14} /> Add Player
        </button>
      </div>

      {totalPlayers === 0 ? (
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-8 text-center">
          <Users size={28} className="text-slate-700 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No players yet</p>
          <p className="text-slate-600 text-xs mt-1">Tap &quot;Add Player&quot; to create one</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Direct players — no commission assigned */}
          {directNoCB.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users size={11} /> Direct players ({directNoCB.length})
              </h3>
              <PlayerGrid
                clients={directNoCB}
                bets={bets}
                cobookies={cobookies}
                onOpenPlayer={onOpenPlayer}
                onEditCommission={openEditCommission}
                onReassign={cobookies.length > 0 ? (u) => { const opts = cobookies.map(cb => ({ id: cb.id, label: `${cb.name} (Co-Bookie)`, commission: cb.commission })); setReassignTarget(u); setReassignCB(opts[0]?.id ?? ""); setReassignComm(""); setReassignError(""); setReassignOptions(opts); } : undefined}
                reassignOptions={cobookies.map(cb => ({ id: cb.id, label: `${cb.name} (Co-Bookie)`, commission: cb.commission }))}
              />
            </section>
          )}

          {/* Direct players with commission assigned to a co-bookie */}
          {directWithCB.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-yellow-400/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Percent size={11} /> Direct players (commission assigned)
              </h3>
              <PlayerGrid
                clients={directWithCB}
                bets={bets}
                cobookies={cobookies}
                onOpenPlayer={onOpenPlayer}
                onEditCommission={openEditCommission}
                onReassign={cobookies.length > 0 ? (u) => { const opts = cobookies.map(cb => ({ id: cb.id, label: `${cb.name} (Co-Bookie)`, commission: cb.commission })); setReassignTarget(u); setReassignCB(opts[0]?.id ?? ""); setReassignComm(""); setReassignError(""); setReassignOptions(opts); } : undefined}
                reassignOptions={cobookies.map(cb => ({ id: cb.id, label: `${cb.name} (Co-Bookie)`, commission: cb.commission }))}
              />
            </section>
          )}

          {/* Players under each co-bookie */}
          {cobookies.map((cb) => {
            const group = byCoBookieId.get(cb.id) ?? [];
            const otherDestinations = [
              { id: admin.id, label: "Admin (direct — me)", commission: undefined as number | undefined },
              ...cobookies.filter(c => c.id !== cb.id).map(c => ({ id: c.id, label: `${c.name} (Co-Bookie)`, commission: c.commission })),
            ];
            return (
              <section key={cb.id}>
                <h3 className="text-xs font-bold text-purple-400/80 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Percent size={11} /> Under {cb.name} ({group.length})
                </h3>
                {group.length === 0 ? (
                  <p className="text-xs text-slate-600 pl-3">No players yet</p>
                ) : (
                  <PlayerGrid
                    clients={group}
                    bets={bets}
                    cobookies={cobookies}
                    onOpenPlayer={onOpenPlayer}
                    onEditCommission={openEditCommission}
                    onReassign={(u) => {
                      setReassignTarget(u);
                      setReassignCB(otherDestinations[0]?.id ?? "");
                      setReassignComm("");
                      setReassignError("");
                      setReassignOptions(otherDestinations);
                    }}
                    reassignOptions={otherDestinations}
                  />
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
          <div className="relative w-full sm:max-w-sm bg-[#111827] border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl">
            <h3 className="font-bold text-slate-200 mb-4">Add Player</h3>
            <div className="space-y-3">
              <Input label="Display name" value={name} onChange={setName} placeholder="John Doe" />
              <Input label="Username" value={username} onChange={setUsername} placeholder="johndoe" />
              <Input label="PIN" value={pin} onChange={setPin} placeholder="4+ digits" type="password" inputMode="numeric" />

              {/* Assign to (who manages them / gives chips) */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Managed by</label>
                <select
                  value={assignTo}
                  onChange={(e) => { setAssignTo(e.target.value); setCommissionTo(""); }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-base text-slate-200 focus:outline-none focus:border-yellow-400/50 transition-colors"
                >
                  <option value={admin.id}>Admin (me)</option>
                  {cobookies.map((cb) => (
                    <option key={cb.id} value={cb.id}>{cb.name} (Co-Bookie)</option>
                  ))}
                </select>
              </div>

              {/* Commission — only relevant when managed by admin */}
              {assignTo === admin.id && cobookies.length > 0 && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                    Commission goes to <span className="text-slate-600">(optional)</span>
                  </label>
                  <select
                    value={commissionTo}
                    onChange={(e) => setCommissionTo(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-base text-slate-200 focus:outline-none focus:border-yellow-400/50 transition-colors"
                  >
                    <option value="">None (admin keeps all)</option>
                    {cobookies.map((cb) => (
                      <option key={cb.id} value={cb.id}>{cb.name} ({cb.commission ?? 0}% default)</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Per-player commission rate */}
              {(assignTo !== admin.id || commissionTo) && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                    Commission % <span className="text-slate-600">(overrides co-bookie default)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="100"
                      value={commission}
                      onChange={(e) => setCommission(e.target.value)}
                      placeholder={assignTo !== admin.id ? `default: ${cobookies.find(cb => cb.id === assignTo)?.commission ?? 0}%` : "e.g. 15"}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-base text-slate-200 placeholder-slate-600 focus:outline-none focus:border-yellow-400/50 transition-colors"
                    />
                    <span className="text-slate-400 font-bold text-lg">%</span>
                  </div>
                </div>
              )}

              {createError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{createError}</p>}
              <button onClick={handleCreate} className="w-full bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-black font-bold py-3 rounded-xl transition-all">Create Player</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit commission modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditTarget(null)} />
          <div className="relative bg-[#0d1321] border border-white/10 rounded-2xl p-5 w-full max-w-xs shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-bold text-slate-200">Set Commission</h4>
              <button onClick={() => setEditTarget(null)} className="text-slate-500 hover:text-slate-200"><X size={16} /></button>
            </div>
            <p className="text-xs text-slate-500 mb-3">{editTarget.name} · @{editTarget.username}</p>

            {/* Co-bookie selector — show only for direct admin players */}
            {editTarget.parentId === admin.id && cobookies.length > 0 && (
              <div className="mb-3">
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Commission goes to</label>
                <select
                  value={editCBId}
                  onChange={(e) => setEditCBId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-400/50 transition-colors"
                >
                  <option value="">None (admin keeps all)</option>
                  {cobookies.map((cb) => (
                    <option key={cb.id} value={cb.id}>{cb.name} ({cb.commission ?? 0}% default)</option>
                  ))}
                </select>
              </div>
            )}

            {/* Co-bookie players: show who earns the commission */}
            {editTarget.parentId !== admin.id && (
              <div className="mb-3 bg-purple-500/5 border border-purple-500/20 rounded-xl px-3 py-2">
                <p className="text-[11px] text-purple-300">
                  Commission goes to: <span className="font-bold">{cobookies.find(cb => cb.id === editTarget.parentId)?.name ?? cobookies.find(cb => cb.id === editTarget.commissionTo)?.name ?? "co-bookie"}</span>
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                value={editRate}
                onChange={(e) => setEditRate(e.target.value)}
                placeholder="e.g. 15"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-base text-slate-200 placeholder-slate-600 focus:outline-none focus:border-yellow-400/50 transition-colors"
                autoFocus
              />
              <span className="text-slate-400 font-bold text-lg">%</span>
            </div>
            <div className="flex gap-1.5 mb-3">
              {[5, 10, 15, 20, 25].map((v) => (
                <button key={v} onClick={() => setEditRate(String(v))} className="flex-1 text-xs py-1.5 rounded-lg bg-white/5 hover:bg-purple-400/10 hover:text-purple-400 text-slate-400 transition-colors">{v}%</button>
              ))}
            </div>
            {editTarget.commission !== undefined && (
              <p className="text-[10px] text-slate-500 mb-2">
                Current: <span className="text-purple-400 font-semibold">{editTarget.commission}%</span>
                {editTarget.commissionTo && <span className="ml-1">→ {cobookies.find(cb => cb.id === editTarget.commissionTo)?.name}</span>}
              </p>
            )}
            {editError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-2">{editError}</p>}
            <button
              onClick={() => {
                setEditError("");
                const n = parseInt(editRate);
                if (isNaN(n) || n < 0 || n > 100) return setEditError("Enter a rate between 0 and 100");
                // For direct admin players, use assignPlayerCommission (tracks commissionTo)
                if (editTarget.parentId === admin.id) {
                  const res = assignPlayerCommission(editTarget.id, n, editCBId || null, admin.id);
                  if (!res.ok) return setEditError(res.error);
                } else {
                  const res = updateCommission(editTarget.id, n, admin.id);
                  if (!res.ok) return setEditError(res.error);
                }
                setEditTarget(null);
              }}
              className="w-full bg-purple-500 hover:bg-purple-400 active:scale-[0.98] text-white font-bold py-2.5 rounded-xl transition-all"
            >
              Save Commission
            </button>
          </div>
        </div>
      )}

      {/* Transfer / reassign player modal */}
      {reassignTarget && reassignOptions.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setReassignTarget(null)} />
          <div className="relative bg-[#0d1321] border border-white/10 rounded-2xl p-5 w-full max-w-xs shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-bold text-slate-200">Transfer Player</h4>
              <button onClick={() => setReassignTarget(null)} className="text-slate-500 hover:text-slate-200"><X size={16} /></button>
            </div>
            <p className="text-xs text-slate-500 mb-1">
              Moving <span className="text-slate-300 font-semibold">{reassignTarget.name}</span> to a new manager.
            </p>
            <p className="text-[10px] text-yellow-400/70 mb-4">Only future bets will count toward the new co-bookie&apos;s commission.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Transfer to</label>
                <select
                  value={reassignCB}
                  onChange={(e) => setReassignCB(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-base text-slate-200 focus:outline-none focus:border-yellow-400/50 transition-colors"
                >
                  {reassignOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}{opt.commission !== undefined ? ` — ${opt.commission}% default` : ""}</option>
                  ))}
                </select>
              </div>

              {/* Commission field only when destination is a co-bookie */}
              {reassignCB !== admin.id && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                    Commission % <span className="text-slate-600">(leave blank to use default)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="100"
                      value={reassignComm}
                      onChange={(e) => setReassignComm(e.target.value)}
                      placeholder={`default: ${reassignOptions.find(o => o.id === reassignCB)?.commission ?? 0}%`}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-base text-slate-200 placeholder-slate-600 focus:outline-none focus:border-yellow-400/50 transition-colors"
                    />
                    <span className="text-slate-400 font-bold text-lg">%</span>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {[5, 10, 15, 20, 25].map((v) => (
                      <button key={v} onClick={() => setReassignComm(String(v))} className="flex-1 text-xs py-1.5 rounded-lg bg-white/5 hover:bg-purple-400/10 hover:text-purple-400 text-slate-400 transition-colors">{v}%</button>
                    ))}
                  </div>
                </div>
              )}

              {reassignError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{reassignError}</p>}

              <button
                onClick={() => {
                  setReassignError("");
                  const commVal = reassignCB !== admin.id && reassignComm.trim() ? parseInt(reassignComm) : undefined;
                  if (commVal !== undefined && (commVal < 0 || commVal > 100)) return setReassignError("Commission must be 0–100%");
                  const res = reassignPlayer(reassignTarget.id, reassignCB, commVal, admin.id);
                  if (!res.ok) return setReassignError(res.error);
                  setReassignTarget(null);
                }}
                className="w-full bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-black font-bold py-2.5 rounded-xl transition-all"
              >
                Transfer to {reassignOptions.find(o => o.id === reassignCB)?.label?.split(" (")[0] ?? "destination"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerGrid({ clients, bets, cobookies, onOpenPlayer, onEditCommission, onReassign, reassignOptions }: { clients: User[]; bets: ReturnType<typeof useStore>["bets"]; cobookies: User[]; onOpenPlayer: (p: User) => void; onEditCommission: (u: User) => void; onReassign?: (u: User) => void; reassignOptions?: { id: string; label: string }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {clients.map((c) => {
        const s = statsForClient(c.id, bets);
        const cbName = cobookies.find(cb => cb.id === (c.commissionTo ?? c.parentId))?.name;
        const commLabel = c.commission !== undefined ? `${c.commission}%` : "Set %";
        return (
          <div key={c.id} className="bg-[#111827] border border-white/5 rounded-2xl p-3 hover:border-white/10 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => onOpenPlayer(c)} className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </button>
              <button onClick={() => onOpenPlayer(c)} className="flex-1 min-w-0 text-left">
                <p className="font-semibold text-slate-200 truncate">{c.name}</p>
                <p className="text-xs text-slate-500 font-mono truncate">@{c.username}</p>
              </button>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-yellow-400 tabular-nums">{c.chips.toLocaleString()}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); onEditCommission(c); }}
                  className="flex items-center gap-0.5 text-[9px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full font-bold hover:bg-purple-500/20 transition-colors mt-0.5 max-w-[80px] truncate"
                  title={cbName ? `${commLabel} → ${cbName}` : commLabel}
                >
                  {commLabel} <Pencil size={8} />
                </button>
                {cbName && (
                  <p className="text-[8px] text-purple-400/60 truncate max-w-[80px] mt-0.5">→ {cbName}</p>
                )}
              </div>
            </div>
            <button onClick={() => onOpenPlayer(c)} className="w-full flex items-center justify-between text-[11px] mb-2">
              <div className="flex items-center gap-2 text-slate-500">
                <span>{s.totalBets} bets</span>
                {s.pending > 0 && <span className="text-blue-400">{s.pending} live</span>}
              </div>
              <span className={cn("font-bold tabular-nums", s.profit >= 0 ? "text-emerald-400" : "text-red-400")}>
                {s.profit >= 0 ? "+" : ""}{s.profit.toLocaleString()}
              </span>
            </button>
            {onReassign && (
              <button
                onClick={(e) => { e.stopPropagation(); onReassign(c); }}
                className="w-full text-[11px] font-semibold text-slate-400 hover:text-yellow-400 bg-white/5 hover:bg-yellow-400/10 border border-white/5 hover:border-yellow-400/20 rounded-lg py-1.5 transition-colors flex items-center justify-center gap-1"
              >
                <ChevronRight size={11} /> Transfer Player
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Co-Bookies ────────────────────────────────────────────────────────────────

function CoBookiesTab({
  cobookies,
  bets,
  allUsers,
  admin,
}: {
  cobookies: User[];
  bets: ReturnType<typeof useStore>["bets"];
  allUsers: User[];
  admin: User;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [commission, setCommission] = useState("10");
  const [createError, setCreateError] = useState("");

  // Chip dialog state
  const [chipDialog, setChipDialog] = useState<{ cb: User; type: "give" | "take" } | null>(null);
  const [chipAmount, setChipAmount] = useState("");
  const [chipError, setChipError] = useState("");

  // Edit commission state
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editRate, setEditRate] = useState("");
  const [editError, setEditError] = useState("");

  // Expanded state per co-bookie
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Delete co-bookie state
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteError, setDeleteError] = useState("");

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleCreate() {
    setCreateError("");
    if (!name.trim() || !username.trim() || !pin.trim()) return setCreateError("All fields required");
    if (pin.length < 4) return setCreateError("PIN must be 4+ digits");
    const commVal = parseInt(commission);
    if (!commVal || commVal < 1 || commVal > 100) return setCreateError("Commission must be 1–100%");
    const res = createUser(admin.id, { name: name.trim(), username: username.trim(), pin: pin.trim(), role: "cobookie", commission: commVal });
    if (!res.ok) return setCreateError(res.error);
    setName(""); setUsername(""); setPin(""); setCommission("10");
    setCreateOpen(false);
  }

  function handleChipTransfer() {
    setChipError("");
    if (!chipDialog) return;
    const n = parseInt(chipAmount);
    if (!n || n <= 0) return setChipError("Enter a valid amount");
    const res = chipDialog.type === "give"
      ? allocateChips(admin.id, chipDialog.cb.id, n)
      : reclaimChips(chipDialog.cb.id, admin.id, n);
    if (!res.ok) return setChipError(res.error);
    setChipAmount("");
    setChipDialog(null);
  }

  function handleSettle(cb: User, amount: number) {
    if (amount <= 0) return;
    const res = allocateChips(admin.id, cb.id, amount);
    if (!res.ok) alert(res.error);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{cobookies.length} co-book{cobookies.length !== 1 ? "ies" : "ie"}</p>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1 bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all">
          <Plus size={14} /> Add Co-Bookie
        </button>
      </div>

      {cobookies.length === 0 ? (
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-8 text-center">
          <Percent size={28} className="text-slate-700 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No co-bookies yet</p>
          <p className="text-slate-600 text-xs mt-1">Co-bookies manage their own players and earn a commission</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cobookies.map((cb) => {
            // Players managed by this co-bookie (parentId = cb.id)
            const managedClients = allUsers.filter((u) => u.role === "client" && u.parentId === cb.id);
            // Admin-direct players with commissionTo pointing to this co-bookie
            const commissionOnlyClients = allUsers.filter((u) =>
              u.role === "client" && u.parentId !== cb.id && u.commissionTo === cb.id
            );
            // For house P&L display: only managed clients' bets
            const managedIds = new Set(managedClients.map((c) => c.id));
            const cbBets = bets.filter((b) => managedIds.has(b.clientId));
            const resolved = cbBets.filter((b) => b.status !== "pending");
            const won = resolved.filter((b) => b.status === "won");
            const totalStaked = resolved.reduce((s, b) => s + b.stake, 0);
            const totalPayout = won.reduce((s, b) => s + Math.round(b.stake * b.odds), 0);
            const houseProfit = totalStaked - totalPayout;

            // Commission calculation: managed clients + admin players assigned to this co-bookie
            // Only bets placed on or after commissionAssignedAt count (future-only rule)
            const allCommissionClients = [...managedClients, ...commissionOnlyClients];
            const commissionOwed = allCommissionClients.reduce((sum, client) => {
              const rate = client.commission ?? (client.parentId === cb.id ? cb.commission ?? 0 : 0);
              const since = client.commissionAssignedAt ?? 0;
              const clientResolved = bets.filter((b) => b.clientId === client.id && b.status !== "pending" && b.placedAt >= since);
              const clientWon = clientResolved.filter((b) => b.status === "won");
              const clientStaked = clientResolved.reduce((s, b) => s + b.stake, 0);
              const clientPayout = clientWon.reduce((s, b) => s + Math.round(b.stake * b.odds), 0);
              const clientHouseProfit = clientStaked - clientPayout;
              return sum + Math.round(clientHouseProfit * rate / 100);
            }, 0);

            const adminGives = commissionOwed > 0;  // admin owes co-bookie
            const adminTakes = commissionOwed < 0;  // co-bookie owes admin
            const isExpanded = expanded.has(cb.id);

            return (
              <div key={cb.id} className="bg-[#111827] border border-white/5 rounded-2xl overflow-hidden">
                {/* Co-bookie header */}
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400/20 to-purple-600/10 border border-purple-400/20 flex items-center justify-center text-purple-400 font-bold shrink-0">
                      {cb.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-200 truncate">{cb.name}</p>
                      <p className="text-xs text-slate-500 font-mono">@{cb.username}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-yellow-400 tabular-nums">{cb.chips.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-500">chips</p>
                    </div>
                    <button
                      onClick={() => { setDeleteTarget(cb); setDeleteError(""); }}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                      title="Delete co-bookie"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Commission badge and player count */}
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => { setEditTarget(cb); setEditRate(String(cb.commission ?? "")); setEditError(""); }}
                      className="flex items-center gap-1 text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full hover:bg-purple-500/20 transition-colors"
                    >
                      {cb.commission ?? 0}% commission <Pencil size={9} />
                    </button>
                    <span className="text-xs text-slate-500">{managedClients.length} managed{commissionOnlyClients.length > 0 ? ` +${commissionOnlyClients.length} shared` : ""}</span>
                    {cbBets.filter(b => b.status === "pending").length > 0 && (
                      <span className="text-xs text-blue-400">{cbBets.filter(b => b.status === "pending").length} active bets</span>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div className="bg-white/5 rounded-xl py-2">
                      <p className="text-[10px] text-slate-500">House P&L</p>
                      <p className={cn("font-bold tabular-nums text-sm", houseProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
                        {houseProfit >= 0 ? "+" : ""}{houseProfit.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl py-2">
                      <p className="text-[10px] text-slate-500">Commission</p>
                      <p className={cn("font-bold tabular-nums text-sm", commissionOwed >= 0 ? "text-yellow-400" : "text-orange-400")}>
                        {commissionOwed >= 0 ? "" : ""}{Math.abs(commissionOwed).toLocaleString()}
                      </p>
                    </div>
                    <div className={cn("rounded-xl py-2 border", adminGives ? "bg-emerald-500/10 border-emerald-500/20" : adminTakes ? "bg-orange-500/10 border-orange-500/20" : "bg-white/5 border-transparent")}>
                      <p className="text-[10px] text-slate-500">You</p>
                      <p className={cn("font-bold text-sm", adminGives ? "text-emerald-400" : adminTakes ? "text-orange-400" : "text-slate-500")}>
                        {adminGives ? "Give" : adminTakes ? "Take" : "Even"}
                      </p>
                    </div>
                  </div>

                  {/* Settlement action */}
                  {commissionOwed !== 0 && (
                    <div className={cn("rounded-xl px-3 py-2.5 mb-3 flex items-center gap-2", adminGives ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-orange-500/10 border border-orange-500/20")}>
                      <div className="flex-1">
                        <p className={cn("text-xs font-bold", adminGives ? "text-emerald-400" : "text-orange-400")}>
                          {adminGives
                            ? `You owe ${cb.name}: ${commissionOwed.toLocaleString()} chips`
                            : `${cb.name} owes you: ${Math.abs(commissionOwed).toLocaleString()} chips`}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Based on settled bets this period</p>
                      </div>
                      {adminGives && (
                        <button
                          onClick={() => handleSettle(cb, commissionOwed)}
                          className="text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1.5 rounded-lg transition-colors shrink-0"
                        >
                          Settle
                        </button>
                      )}
                    </div>
                  )}

                  {/* Chip give/take buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setChipDialog({ cb, type: "give" }); setChipError(""); setChipAmount(""); }}
                      className="flex-1 flex items-center justify-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold py-2 rounded-lg transition-colors"
                    >
                      <ArrowUpRight size={13} /> Give chips
                    </button>
                    <button
                      onClick={() => { setChipDialog({ cb, type: "take" }); setChipError(""); setChipAmount(""); }}
                      className="flex-1 flex items-center justify-center gap-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 text-xs font-semibold py-2 rounded-lg transition-colors"
                    >
                      <ArrowDownLeft size={13} /> Take chips
                    </button>
                    {allCommissionClients.length > 0 && (
                      <button
                        onClick={() => toggleExpand(cb.id)}
                        className="flex items-center gap-1 bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        Players
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded: per-player commission breakdown */}
                {isExpanded && allCommissionClients.length > 0 && (
                  <div className="border-t border-white/5 bg-white/2">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider px-4 pt-2.5 pb-1.5">Per-player commission breakdown</p>
                    {allCommissionClients.map((client) => {
                      const rate = client.commission ?? (client.parentId === cb.id ? cb.commission ?? 0 : 0);
                      const since = client.commissionAssignedAt ?? 0;
                      const clientResolved = bets.filter((b) => b.clientId === client.id && b.status !== "pending" && b.placedAt >= since);
                      const clientWon = clientResolved.filter((b) => b.status === "won");
                      const cStaked = clientResolved.reduce((s, b) => s + b.stake, 0);
                      const cPayout = clientWon.reduce((s, b) => s + Math.round(b.stake * b.odds), 0);
                      const cHouseProfit = cStaked - cPayout;
                      const cCut = Math.round(cHouseProfit * rate / 100);
                      const isAdminDirect = client.parentId !== cb.id;
                      return (
                        <div key={client.id} className="flex items-center gap-2 px-4 py-2 border-b border-white/5 last:border-0">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold text-xs shrink-0">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="text-xs text-slate-200 font-semibold truncate">{client.name}</p>
                              {isAdminDirect && <span className="text-[8px] text-yellow-400/60 bg-yellow-400/10 px-1 rounded font-bold shrink-0">Admin</span>}
                            </div>
                            <p className="text-[10px] text-slate-500">House P&L: <span className={cn(cHouseProfit >= 0 ? "text-emerald-400" : "text-red-400")}>{cHouseProfit >= 0 ? "+" : ""}{cHouseProfit.toLocaleString()}</span></p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] text-purple-400 font-bold">{rate}% rate</p>
                            <p className={cn("text-xs font-bold tabular-nums", cCut >= 0 ? "text-yellow-400" : "text-orange-400")}>{cCut >= 0 ? "+" : ""}{cCut.toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between px-4 py-2 bg-white/3">
                      <p className="text-[10px] font-bold text-slate-400">Total owed to {cb.name}</p>
                      <p className={cn("text-sm font-black tabular-nums", commissionOwed >= 0 ? "text-emerald-400" : "text-orange-400")}>
                        {commissionOwed >= 0 ? "+" : ""}{commissionOwed.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create co-bookie modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
          <div className="relative w-full sm:max-w-sm bg-[#111827] border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl">
            <h3 className="font-bold text-slate-200 mb-1">Add Co-Bookie</h3>
            <p className="text-xs text-slate-500 mb-4">Co-bookies get their own login and manage their own players. You set their commission rate.</p>
            <div className="space-y-3">
              <Input label="Display name" value={name} onChange={setName} placeholder="Raju Bookie" />
              <Input label="Username" value={username} onChange={setUsername} placeholder="rajubookie" />
              <Input label="PIN" value={pin} onChange={setPin} placeholder="4+ digits" type="password" inputMode="numeric" />
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Commission % (of house profit)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="100"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-base text-slate-200 focus:outline-none focus:border-yellow-400/50 transition-colors"
                  />
                  <span className="text-slate-400 font-bold text-lg">%</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-1">They earn this % of the net profit from their players&apos; bets</p>
              </div>
              {createError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{createError}</p>}
              <button onClick={handleCreate} className="w-full bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-black font-bold py-3 rounded-xl transition-all">Create Co-Bookie</button>
            </div>
          </div>
        </div>
      )}

      {/* Chip give/take dialog */}
      {chipDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setChipDialog(null)} />
          <div className="relative bg-[#0d1321] border border-white/10 rounded-2xl p-5 w-full max-w-xs shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-200">
                {chipDialog.type === "give" ? `Give chips to ${chipDialog.cb.name}` : `Take chips from ${chipDialog.cb.name}`}
              </h4>
              <button onClick={() => setChipDialog(null)} className="text-slate-500 hover:text-slate-200"><X size={16} /></button>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs mb-3 space-y-1">
              <div className="flex justify-between"><span className="text-slate-400">Your balance</span><span className="font-bold text-yellow-400 tabular-nums">{admin.chips.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">{chipDialog.cb.name}&apos;s balance</span><span className="font-bold text-slate-300 tabular-nums">{chipDialog.cb.chips.toLocaleString()}</span></div>
            </div>
            <input
              type="number"
              inputMode="numeric"
              value={chipAmount}
              onChange={(e) => setChipAmount(e.target.value)}
              placeholder="Amount"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-base text-slate-200 focus:outline-none focus:border-yellow-400/50 mb-2"
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

      {/* Edit co-bookie commission modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditTarget(null)} />
          <div className="relative bg-[#0d1321] border border-white/10 rounded-2xl p-5 w-full max-w-xs shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-bold text-slate-200">Edit Commission</h4>
              <button onClick={() => setEditTarget(null)} className="text-slate-500 hover:text-slate-200"><X size={16} /></button>
            </div>
            <p className="text-xs text-slate-500 mb-3">{editTarget.name} · co-bookie</p>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                value={editRate}
                onChange={(e) => setEditRate(e.target.value)}
                placeholder="e.g. 20"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-base text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-400/50 transition-colors"
                autoFocus
              />
              <span className="text-slate-400 font-bold text-lg">%</span>
            </div>
            <div className="flex gap-1.5 mb-3">
              {[5, 10, 15, 20, 25, 30].map((v) => (
                <button key={v} onClick={() => setEditRate(String(v))} className="flex-1 text-xs py-1.5 rounded-lg bg-white/5 hover:bg-purple-400/10 hover:text-purple-400 text-slate-400 transition-colors">{v}%</button>
              ))}
            </div>
            {editTarget.commission !== undefined && (
              <p className="text-[10px] text-slate-500 mb-2">Current: <span className="text-purple-400 font-semibold">{editTarget.commission}%</span></p>
            )}
            {editError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-2">{editError}</p>}
            <button
              onClick={() => {
                setEditError("");
                const n = parseInt(editRate);
                if (isNaN(n) || n < 0 || n > 100) return setEditError("Enter a rate between 0 and 100");
                const res = updateCommission(editTarget.id, n, admin.id);
                if (!res.ok) return setEditError(res.error);
                setEditTarget(null);
              }}
              className="w-full bg-purple-500 hover:bg-purple-400 active:scale-[0.98] text-white font-bold py-2.5 rounded-xl transition-all"
            >
              Save Commission
            </button>
          </div>
        </div>
      )}

      {/* Delete co-bookie confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-[#0d1321] border border-red-500/20 rounded-2xl p-5 w-full max-w-xs shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-red-400">Delete Co-Bookie</h4>
              <button onClick={() => setDeleteTarget(null)} className="text-slate-500 hover:text-slate-200"><X size={16} /></button>
            </div>
            <p className="text-sm text-slate-300 mb-1">
              Delete <span className="font-bold text-white">{deleteTarget.name}</span>?
            </p>
            <p className="text-xs text-slate-500 mb-1">
              · Their <span className="text-yellow-400 font-semibold">{deleteTarget.chips.toLocaleString()} chips</span> will be returned to you.
            </p>
            <p className="text-xs text-slate-500 mb-4">
              · All their players will be moved back to your direct list.
            </p>
            {deleteError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">{deleteError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-400 font-semibold text-sm hover:bg-white/10 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => {
                  setDeleteError("");
                  const res = deleteCobookie(deleteTarget.id, admin.id);
                  if (!res.ok) return setDeleteError(res.error);
                  setDeleteTarget(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 active:scale-[0.98] text-white font-bold text-sm transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Live ──────────────────────────────────────────────────────────────────────

function LiveTab({
  clients,
  bets,
  onOpenPlayer,
}: {
  clients: User[];
  bets: ReturnType<typeof useStore>["bets"];
  onOpenPlayer: (p: User) => void;
}) {
  const byMatch = new Map<string, typeof bets>();
  for (const b of bets) {
    const arr = byMatch.get(b.match) ?? [];
    arr.push(b);
    byMatch.set(b.match, arr);
  }

  if (bets.length === 0) {
    return (
      <div className="bg-[#111827] border border-white/5 rounded-2xl p-8 text-center">
        <Activity size={28} className="text-slate-700 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">No active bets right now</p>
        <p className="text-slate-600 text-xs mt-1">Players&apos; live bets will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">{bets.length} active bet{bets.length !== 1 ? "s" : ""} across {byMatch.size} match{byMatch.size !== 1 ? "es" : ""}</p>
      {Array.from(byMatch.entries()).map(([matchLabel, matchBets]) => {
        const totalExposure = matchBets.reduce((s, b) => s + Math.round(b.stake * (b.odds - 1)), 0);
        return (
          <div key={matchLabel} className="bg-[#111827] border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-white/3 border-b border-white/5 flex items-center justify-between gap-3">
              <p className="font-bold text-slate-200 text-sm truncate">{matchLabel}</p>
              <span className="text-xs text-red-400 tabular-nums shrink-0">House risk: -{totalExposure.toLocaleString()}</span>
            </div>
            <div className="divide-y divide-white/5">
              {matchBets.map((b) => {
                const client = clients.find((c) => c.id === b.clientId);
                if (!client) return null;
                const ageMin = Math.floor((Date.now() - b.placedAt) / 60_000);
                return (
                  <button key={b.id} onClick={() => onOpenPlayer(client)} className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-white/3 transition-colors text-left">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold text-xs shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-200 truncate">{client.name}</span>
                        {b.market && <span className="text-[10px] text-yellow-400/70 bg-yellow-400/10 border border-yellow-400/20 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">{b.market}</span>}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{b.pick} @ {b.odds.toFixed(2)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold tabular-nums text-slate-200">{b.stake.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-500 flex items-center justify-end gap-0.5">
                        <Clock size={9} /> {ageMin === 0 ? "now" : `${ageMin}m`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── History ───────────────────────────────────────────────────────────────────

function HistoryTab({
  clients,
  bets,
}: {
  clients: User[];
  bets: ReturnType<typeof useStore>["bets"];
}) {
  if (bets.length === 0) {
    return (
      <div className="bg-[#111827] border border-white/5 rounded-2xl p-8 text-center">
        <History size={28} className="text-slate-700 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">No settled bets yet</p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {bets.slice(0, 100).map((b) => {
        const client = clients.find((c) => c.id === b.clientId);
        const houseProfit = b.status === "lost" ? b.stake : -Math.round(b.stake * (b.odds - 1));
        return (
          <div key={b.id} className="bg-[#111827] border border-white/5 rounded-xl p-2.5 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-slate-300 font-semibold truncate">{client?.name}</p>
                {b.market && (
                  <span className="text-[9px] text-yellow-400/60 bg-yellow-400/5 border border-yellow-400/15 px-1 rounded font-semibold uppercase tracking-wider">{b.market}</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate">{b.pick} @ {b.odds.toFixed(2)} · {b.match}</p>
            </div>
            <span className={cn("text-sm font-bold tabular-nums shrink-0", houseProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
              {houseProfit >= 0 ? "+" : ""}{houseProfit.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Commission Log ────────────────────────────────────────────────────────────

function CommLogTab({ log }: { log: CommissionChange[] }) {
  if (log.length === 0) {
    return (
      <div className="bg-[#111827] border border-white/5 rounded-2xl p-8 text-center">
        <ScrollText size={28} className="text-slate-700 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">No commission changes yet</p>
        <p className="text-slate-600 text-xs mt-1">Changes to commission rates appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">{log.length} change{log.length !== 1 ? "s" : ""} recorded</p>
      {log.map((c) => {
        const ageMs = Date.now() - c.changedAt;
        const ageMins = Math.floor(ageMs / 60_000);
        const ageHours = Math.floor(ageMs / 3_600_000);
        const ageDays = Math.floor(ageMs / 86_400_000);
        const ageLabel = ageDays > 0 ? `${ageDays}d ago` : ageHours > 0 ? `${ageHours}h ago` : ageMins > 0 ? `${ageMins}m ago` : "just now";

        const isNew = c.fromRate === undefined;
        const increased = !isNew && c.toRate > (c.fromRate ?? 0);

        return (
          <div key={c.id} className="bg-[#111827] border border-white/5 rounded-xl p-3 flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm",
              c.userRole === "cobookie"
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/20"
                : "bg-yellow-400/20 text-yellow-400 border border-yellow-400/20"
            )}>
              {c.userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-sm font-semibold text-slate-200 truncate">{c.userName}</p>
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border",
                  c.userRole === "cobookie"
                    ? "text-purple-400 bg-purple-500/10 border-purple-500/20"
                    : "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
                )}>
                  {c.userRole === "cobookie" ? "Co-Bookie" : "Player"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                {isNew ? (
                  <span className="text-slate-400">Set to <span className="font-bold text-purple-400">{c.toRate}%</span></span>
                ) : (
                  <>
                    <span className="text-slate-500 font-mono">{c.fromRate}%</span>
                    <span className="text-slate-600">→</span>
                    <span className={cn("font-bold font-mono", increased ? "text-emerald-400" : "text-orange-400")}>{c.toRate}%</span>
                    {increased
                      ? <span className="text-emerald-400/60 text-[10px]">▲ +{c.toRate - (c.fromRate ?? 0)}%</span>
                      : <span className="text-orange-400/60 text-[10px]">▼ -{(c.fromRate ?? 0) - c.toRate}%</span>
                    }
                  </>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-slate-500 flex items-center justify-end gap-0.5">
                <Clock size={9} /> {ageLabel}
              </p>
              <p className="text-[9px] text-slate-600 mt-0.5">
                {new Date(c.changedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: "yellow" | "emerald" | "blue" | "purple" | "red" }) {
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

function Input({ label, value, onChange, placeholder, type = "text", inputMode }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; inputMode?: "numeric" | "text" }) {
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
