"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Users, Receipt, BarChart3, History, Clock, TrendingUp, TrendingDown, Plus, ChevronRight, Activity, Percent } from "lucide-react";
import TopBar from "@/components/TopBar";
import StatsPanel from "@/components/StatsPanel";
import PlayerDetailSheet from "@/components/PlayerDetailSheet";
import Loading from "@/components/Loading";
import { useStore, useHydrated, statsForAdmin, statsForClient, createUser, type User } from "@/lib/store";
import { cn } from "@/lib/utils";

type Tab = "overview" | "players" | "cobookies" | "live" | "history";

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
  const clients = store.users.filter((u) => u.role === "client" && u.parentId === me.id);
  const clientIds = new Set(clients.map((c) => c.id));
  const allBets = store.bets.filter((b) => clientIds.has(b.clientId)).sort((a, b) => b.placedAt - a.placedAt);
  const pendingBets = allBets.filter((b) => b.status === "pending");
  const resolvedBets = allBets.filter((b) => b.status !== "pending");
  const totalClientChips = clients.reduce((s, c) => s + c.chips, 0);
  const stats = statsForAdmin(me.id, store.users, store.bets);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: <BarChart3 size={14} /> },
    { id: "players", label: "Players", icon: <Users size={14} />, badge: clients.length },
    { id: "cobookies", label: "Co-Bookies", icon: <Percent size={14} />, badge: cobookies.length },
    { id: "live", label: "Live", icon: <Activity size={14} />, badge: pendingBets.length },
    { id: "history", label: "History", icon: <History size={14} />, badge: resolvedBets.length },
  ];

  return (
    <div className="min-h-screen pb-12">
      <TopBar user={me} />
      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Compact stat strip — always visible */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat icon={<Coins size={14} />} label="Your chips" value={me.chips.toLocaleString()} color="yellow" />
          <Stat icon={<Coins size={14} />} label="With players" value={totalClientChips.toLocaleString()} color="purple" />
          <Stat icon={<Receipt size={14} />} label="Open bets" value={String(pendingBets.length)} color="blue" />
          <Stat
            icon={stats.profit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            label="P&L"
            value={`${stats.profit >= 0 ? "+" : ""}${stats.profit.toLocaleString()}`}
            color={stats.profit >= 0 ? "emerald" : "red"}
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
        {tab === "overview" && <OverviewTab stats={stats} clients={clients} bets={store.bets} onOpenPlayer={setOpenPlayer} />}
        {tab === "players" && <PlayersTab clients={clients} bets={store.bets} owner={me} onOpenPlayer={setOpenPlayer} />}
        {tab === "cobookies" && <CoBookiesTab cobookies={cobookies} bets={store.bets} allUsers={store.users} admin={me} />}
        {tab === "live" && <LiveTab clients={clients} bets={pendingBets} onOpenPlayer={setOpenPlayer} />}
        {tab === "history" && <HistoryTab clients={clients} bets={resolvedBets} />}
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

function OverviewTab({
  stats,
  clients,
  bets,
  onOpenPlayer,
}: {
  stats: ReturnType<typeof statsForAdmin>;
  clients: User[];
  bets: ReturnType<typeof useStore>["bets"];
  onOpenPlayer: (p: User) => void;
}) {
  // Top performers (most active players)
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

function PlayersTab({
  clients,
  bets,
  owner,
  onOpenPlayer,
}: {
  clients: User[];
  bets: ReturnType<typeof useStore>["bets"];
  owner: User;
  onOpenPlayer: (p: User) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [createError, setCreateError] = useState("");

  function handleCreate() {
    setCreateError("");
    if (!name.trim() || !username.trim() || !pin.trim()) return setCreateError("All fields required");
    if (pin.length < 4) return setCreateError("PIN must be 4+ digits");
    const res = createUser(owner.id, { name: name.trim(), username: username.trim(), pin: pin.trim(), role: "client" });
    if (!res.ok) return setCreateError(res.error);
    setName(""); setUsername(""); setPin("");
    setCreateOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{clients.length} player{clients.length !== 1 ? "s" : ""}</p>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1 bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all">
          <Plus size={14} /> Add Player
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-8 text-center">
          <Users size={28} className="text-slate-700 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No players yet</p>
          <p className="text-slate-600 text-xs mt-1">Tap &quot;Add Player&quot; to create one</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {clients.map((c) => {
            const s = statsForClient(c.id, bets);
            return (
              <button key={c.id} onClick={() => onOpenPlayer(c)} className="bg-[#111827] border border-white/5 rounded-2xl p-3 hover:border-white/10 transition-colors text-left">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-200 truncate">{c.name}</p>
                    <p className="text-xs text-slate-500 font-mono truncate">@{c.username}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-yellow-400 tabular-nums">{c.chips.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span>{s.totalBets} bets</span>
                    {s.pending > 0 && <span className="text-blue-400">{s.pending} live</span>}
                  </div>
                  <span className={cn("font-bold tabular-nums", s.profit >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {s.profit >= 0 ? "+" : ""}{s.profit.toLocaleString()}
                  </span>
                </div>
              </button>
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
              {createError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{createError}</p>}
              <button onClick={handleCreate} className="w-full bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-black font-bold py-3 rounded-xl transition-all">Create Player</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveTab({
  clients,
  bets,
  onOpenPlayer,
}: {
  clients: User[];
  bets: ReturnType<typeof useStore>["bets"];
  onOpenPlayer: (p: User) => void;
}) {
  // Group bets by match
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
        <div className="space-y-2">
          {cobookies.map((cb) => {
            const cbClients = allUsers.filter((u) => u.role === "client" && u.parentId === cb.id);
            const cbClientIds = new Set(cbClients.map((c) => c.id));
            const cbBets = bets.filter((b) => cbClientIds.has(b.clientId));
            const resolved = cbBets.filter((b) => b.status !== "pending");
            const won = resolved.filter((b) => b.status === "won");
            const lost = resolved.filter((b) => b.status === "lost");
            const totalStaked = resolved.reduce((s, b) => s + b.stake, 0);
            const totalPayout = won.reduce((s, b) => s + Math.round(b.stake * b.odds), 0);
            const houseProfit = totalStaked - totalPayout;
            const cbCommission = Math.round(houseProfit * (cb.commission ?? 0) / 100);
            return (
              <div key={cb.id} className="bg-[#111827] border border-white/5 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400/20 to-purple-600/10 border border-purple-400/20 flex items-center justify-center text-purple-400 font-bold shrink-0">
                    {cb.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-200 truncate">{cb.name}</p>
                    <p className="text-xs text-slate-500 font-mono truncate">@{cb.username}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                      {cb.commission ?? 0}% commission
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/5 rounded-xl py-2">
                    <p className="text-xs text-slate-500">Players</p>
                    <p className="font-bold text-slate-200">{cbClients.length}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl py-2">
                    <p className="text-xs text-slate-500">House P&L</p>
                    <p className={cn("font-bold tabular-nums text-sm", houseProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {houseProfit >= 0 ? "+" : ""}{houseProfit.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl py-2">
                    <p className="text-xs text-slate-500">Their Cut</p>
                    <p className={cn("font-bold tabular-nums text-sm", cbCommission >= 0 ? "text-yellow-400" : "text-red-400")}>
                      {cbCommission >= 0 ? "+" : ""}{cbCommission.toLocaleString()}
                    </p>
                  </div>
                </div>
                {won.length + lost.length > 0 && (
                  <p className="text-[10px] text-slate-600 mt-2 text-center">
                    {won.length}W / {lost.length}L · {cbBets.filter(b => b.status === "pending").length} pending
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
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
    </div>
  );
}

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
