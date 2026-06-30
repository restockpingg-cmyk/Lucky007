"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, Receipt, X, Trash2, Sparkles, Clock, RefreshCw, ChevronRight, Activity, CalendarClock } from "lucide-react";
import TopBar from "@/components/TopBar";
import StatsPanel from "@/components/StatsPanel";
import MatchDetailSheet, { type BetSelection } from "@/components/MatchDetailSheet";
import BottomNav, { type ClientView } from "@/components/BottomNav";
import BackLayOdds from "@/components/BackLayOdds";
import { useStore, useHydrated, placeBet, settleBet, statsForClient, autoSettleWeeklyBets, autoSettleForMatch, autoSettleOldBets, getPendingBetMatchIds, getNextMondayIST, isMondayIST } from "@/lib/store";
import type { Bet } from "@/lib/store";
import Loading from "@/components/Loading";
import { sportLabels, primaryOdds, type Sport, type Match } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useLiveMatches } from "@/lib/useLiveMatches";

export default function ClientDashboard() {
  const router = useRouter();
  const hydrated = useHydrated();
  const store = useStore();
  const me = store.users.find((u) => u.id === store.currentUserId);
  const liveData = useLiveMatches();

  const [view, setView] = useState<ClientView>("sports");
  const [tab, setTab] = useState<"all" | Sport>("all");
  const [picks, setPicks] = useState<BetSelection[]>([]);
  const [slipOpen, setSlipOpen] = useState(false);
  const [openMatch, setOpenMatch] = useState<Match | null>(null);
  const [stake, setStake] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [reveal, setReveal] = useState<{ won: boolean; payout: number; stake: number } | null>(null);
  const [settlementBanner, setSettlementBanner] = useState<{ settled: number; netChips: number } | null>(null);
  const [countdown, setCountdown] = useState("");

  // Monday auto-settlement
  useEffect(() => {
    if (!hydrated || !me) return;
    const results = autoSettleWeeklyBets(me.id);
    if (results.length > 0) {
      const netChips = results.reduce((sum, r) => sum + (r.won ? r.payout - r.bet.stake : -r.bet.stake), 0);
      setSettlementBanner({ settled: results.length, netChips });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Auto-settle when a live match disappears from the feed (match ended)
  const prevLiveIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (liveData.loading || liveData.isDemoData) return;
    const currentLiveIds = new Set(
      liveData.matches.filter((m) => m.status === "live").map((m) => m.id)
    );
    if (prevLiveIdsRef.current === null) {
      prevLiveIdsRef.current = currentLiveIds;
      return;
    }
    const pendingIds = getPendingBetMatchIds();
    const finishedIds = [...prevLiveIdsRef.current].filter(
      (id) => !currentLiveIds.has(id) && pendingIds.has(id)
    );
    if (finishedIds.length > 0) {
      let total = 0;
      for (const matchId of finishedIds) total += autoSettleForMatch(matchId).count;
      if (total > 0) {
        setToast(`${total} bet${total !== 1 ? "s" : ""} settled — match ended`);
        setTimeout(() => setToast(""), 4000);
      }
    }
    prevLiveIdsRef.current = currentLiveIds;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveData.matches, liveData.loading, liveData.isDemoData]);

  // Fallback: time-based settlement for demo data or bets that outlive their sport's duration
  useEffect(() => {
    function check() {
      const count = autoSettleOldBets();
      if (count > 0) {
        setToast(`${count} bet${count !== 1 ? "s" : ""} auto-settled`);
        setTimeout(() => setToast(""), 4000);
      }
    }
    check();
    const i = setInterval(check, 5 * 60_000);
    return () => clearInterval(i);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown to next Monday
  useEffect(() => {
    function updateCountdown() {
      const diff = getNextMondayIST() - Date.now();
      if (diff <= 0) { setCountdown("Settlement due!"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setCountdown(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`);
    }
    updateCountdown();
    const i = setInterval(updateCountdown, 60_000);
    return () => clearInterval(i);
  }, []);

  // Tick every 5s to drive odds fluctuation
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((n) => n + 1), 5_000);
    return () => clearInterval(i);
  }, []);

  // Re-render scores every 30s
  const [, setNow] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setNow((n) => n + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  // Fluctuate odds on live matches every tick — sine wave per option so they breathe naturally
  // MUST be before early returns to satisfy React Rules of Hooks
  const allMatches = useMemo(() => {
    return liveData.matches.map((m) => {
      if (m.status !== "live") return m;
      return {
        ...m,
        markets: m.markets.map((mk) => ({
          ...mk,
          options: mk.options.map((op) => {
            const seed = op.id.split("").reduce((h, c) => ((h << 5) + h + c.charCodeAt(0)) | 0, m.id.length);
            const phase = (Math.abs(seed) % 628) / 100;
            const amp = 0.04 + (Math.abs(seed) % 12) / 100;
            const delta = Math.sin(tick * 0.9 + phase) * amp;
            return { ...op, odds: Math.max(1.01, Math.round((op.odds + delta) * 100) / 100) };
          }),
        })),
      };
    });
  }, [liveData.matches, tick]);

  useEffect(() => {
    if (!hydrated) return;
    if (!me) router.replace("/");
    else if (me.role !== "client") router.replace(`/${me.role}`);
  }, [hydrated, me, router]);

  if (!hydrated) return <Loading />;
  if (!me || me.role !== "client") return <Loading />;

  const myBets = store.bets.filter((b) => b.clientId === me.id).sort((a, b) => b.placedAt - a.placedAt);
  const pendingCount = myBets.filter((b) => b.status === "pending").length;
  const stats = statsForClient(me.id, store.bets);

  const filtered = tab === "all" ? allMatches : allMatches.filter((m) => m.sport === tab);
  const live = filtered.filter((m) => m.status === "live");
  const upcoming = filtered.filter((m) => m.status === "upcoming");
  const inplayMatches = allMatches.filter((m) => m.status === "live");

  function togglePick(p: BetSelection) {
    setPicks((prev) => {
      const exists = prev.find((x) => x.id === p.id);
      if (exists) return prev.filter((x) => x.id !== p.id);
      // Replace any prior pick for the same (match + market + option) regardless of side
      const baseId = p.id.replace(/-(back|lay)$/, "");
      const others = prev.filter((x) => !x.id.startsWith(baseId));
      return [...others, p];
    });
  }

  function handleCashOut(betId: string) {
    const bet = myBets.find((b) => b.id === betId);
    if (!bet) return;
    const result = settleBet(betId);
    if (result.ok) {
      setReveal({ won: result.won, payout: result.payout, stake: bet.stake });
    }
  }

  function handlePlace() {
    setError("");
    const amt = parseInt(stake);
    if (!amt || amt <= 0) return setError("Enter a valid stake");
    if (amt * picks.length > me!.chips) return setError("Insufficient balance");
    const queued = [...picks];
    const userId = me!.id;
    setPicks([]);
    setStake("");
    setSlipOpen(false);
    setToast(`${queued.length} bet${queued.length > 1 ? "s" : ""} placed`);
    setTimeout(() => setToast(""), 2500);
    // Hidden 5s acceptance window
    setTimeout(() => {
      for (const p of queued) {
        placeBet(userId, { id: p.matchId, label: p.match }, p.market, p.pick, p.odds, amt, p.side, p.sport);
      }
    }, 5000);
  }

  return (
    <div className="min-h-screen pb-20">
      <TopBar user={me} subtitle="Place your bets" />

      <main className="max-w-3xl mx-auto px-4 py-3 space-y-3">
        {view === "sports" && (
          <SportsView
            liveData={liveData}
            tab={tab}
            setTab={setTab}
            live={live}
            upcoming={upcoming}
            filtered={filtered}
            picks={picks}
            myBets={myBets}
            stake={parseInt(stake) || 0}
            onOpen={(m) => setOpenMatch(m)}
            onPick={togglePick}
          />
        )}

        {view === "inplay" && (
          <InPlayView
            matches={inplayMatches}
            picks={picks}
            myBets={myBets}
            stake={parseInt(stake) || 0}
            onOpen={(m) => setOpenMatch(m)}
            onPick={togglePick}
          />
        )}

        {view === "bets" && (
          <BetsView myBets={myBets} countdown={countdown} onCashOut={handleCashOut} />
        )}

        {view === "account" && <AccountView stats={stats} chips={me.chips} username={me.username} name={me.name} />}
      </main>

      {/* Bet slip FAB */}
      {picks.length > 0 && (
        <button
          onClick={() => setSlipOpen(true)}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-5 py-3 rounded-2xl shadow-2xl shadow-yellow-400/40 active:scale-95 transition-all"
        >
          <Receipt size={18} />
          {picks.length} pick{picks.length > 1 ? "s" : ""} · Review
        </button>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 animate-fade-in">
          <Check size={16} /> {toast}
        </div>
      )}

      {/* Monday settlement banner */}
      {settlementBanner && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-sm bg-[#111827] border border-yellow-400/30 rounded-2xl shadow-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-yellow-400" />
            <span className="font-black text-yellow-400 text-sm">Monday Settlement!</span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            {settlementBanner.settled} bet{settlementBanner.settled > 1 ? "s" : ""} settled this week
          </p>
          <p className={cn("text-2xl font-black tabular-nums", settlementBanner.netChips >= 0 ? "text-emerald-400" : "text-red-400")}>
            {settlementBanner.netChips >= 0 ? "+" : ""}₹{settlementBanner.netChips.toLocaleString()}
          </p>
          <button onClick={() => setSettlementBanner(null)} className="absolute top-3 right-3 text-slate-500 hover:text-slate-200">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Match detail */}
      {openMatch && (
        <MatchDetailSheet match={openMatch} picks={picks} onPick={togglePick} onClose={() => setOpenMatch(null)} />
      )}

      {/* Bet slip */}
      {slipOpen && (
        <Sheet onClose={() => setSlipOpen(false)} title="Bet Slip">
          <div className="space-y-3">
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {picks.map((p) => (
                <div key={p.id} className="flex items-start gap-2 bg-white/5 rounded-xl p-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className={cn(
                          "text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded",
                          p.side === "back" ? "bg-cyan-500/20 text-cyan-300" : "bg-pink-500/20 text-pink-300"
                        )}
                      >
                        {p.side}
                      </span>
                      <p className="text-[10px] text-yellow-400/80 uppercase tracking-wider font-semibold">{p.market}</p>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{p.match}</p>
                    <p className="text-sm font-semibold text-slate-200 truncate">{p.pick}</p>
                  </div>
                  <span className="text-yellow-400 font-bold mt-1">{p.odds.toFixed(2)}</span>
                  <button onClick={() => setPicks((prev) => prev.filter((x) => x.id !== p.id))} className="text-slate-500 hover:text-red-400 p-1 mt-0.5">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                Stake per bet (₹{me.chips.toLocaleString()} available)
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                placeholder="0"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-base text-slate-200 placeholder-slate-600 focus:outline-none focus:border-yellow-400/50 transition-colors"
              />
              <div className="flex gap-1.5 mt-2">
                {[50, 100, 500, 1000].map((v) => (
                  <button key={v} onClick={() => setStake(String(v))} className="flex-1 text-xs py-2 rounded-lg bg-white/5 hover:bg-yellow-400/10 hover:text-yellow-400 text-slate-400 transition-colors">
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {stake && parseInt(stake) > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Total stake</span>
                  <span className="font-bold tabular-nums">{(parseInt(stake) * picks.length).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-400 mt-1">
                  <span>Max win (if all win)</span>
                  <span className="font-bold tabular-nums">
                    {picks.reduce((sum, p) => sum + Math.round(parseInt(stake) * p.odds), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-2">
              <button onClick={() => setPicks([])} className="flex items-center gap-1 bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-slate-400 text-sm font-semibold px-3 py-3 rounded-xl transition-colors">
                <Trash2 size={14} /> Clear
              </button>
              <button onClick={handlePlace} className="flex-1 bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-black font-bold py-3 rounded-xl transition-all">
                Place Bet
              </button>
            </div>
          </div>
        </Sheet>
      )}

      {/* Reveal */}
      {reveal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setReveal(null)} />
          <div className="relative w-full max-w-xs bg-[#111827] border border-white/10 rounded-3xl p-6 text-center shadow-2xl">
            <div className={cn("w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 border-4", reveal.won ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-red-500/20 border-red-500/40 text-red-400")}>
              {reveal.won ? <Sparkles size={32} /> : <X size={32} />}
            </div>
            <p className="text-2xl font-black mb-1">{reveal.won ? "You won!" : "No luck"}</p>
            <p className={cn("text-3xl font-black tabular-nums mb-1", reveal.won ? "text-emerald-400" : "text-red-400")}>
              {reveal.won ? "+" : "-"}
              {(reveal.won ? reveal.payout - reveal.stake : reveal.stake).toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mb-5">
              {reveal.won ? `Payout ${reveal.payout.toLocaleString()} added to your balance` : `Stake of ${reveal.stake.toLocaleString()} lost`}
            </p>
            <button onClick={() => setReveal(null)} className="w-full bg-white/10 hover:bg-white/15 text-slate-200 font-semibold py-2.5 rounded-xl active:scale-[0.98] transition-all">
              Continue
            </button>
          </div>
        </div>
      )}

      <BottomNav active={view} onChange={setView} activeBetCount={pendingCount} />
    </div>
  );
}

// ---------- Views ----------

function SportsView({
  liveData, tab, setTab, live, upcoming, filtered, picks, myBets, stake, onOpen, onPick,
}: {
  liveData: ReturnType<typeof useLiveMatches>;
  tab: "all" | Sport;
  setTab: (t: "all" | Sport) => void;
  live: Match[];
  upcoming: Match[];
  filtered: Match[];
  picks: BetSelection[];
  myBets: Bet[];
  stake: number;
  onOpen: (m: Match) => void;
  onPick: (p: BetSelection) => void;
}) {
  const ageMin = liveData.fetchedAt ? Math.floor((Date.now() - liveData.fetchedAt) / 60_000) : 0;
  return (
    <>
      <LiveStatusBar liveData={liveData} ageMin={ageMin} />

      <div className="flex items-center gap-1.5 overflow-x-auto -mx-4 px-4 pb-1">
        <TabBtn active={tab === "all"} onClick={() => setTab("all")} icon="🏆" label="All" />
        {Object.entries(sportLabels).map(([id, s]) => (
          <TabBtn key={id} active={tab === id} onClick={() => setTab(id as Sport)} icon={s.icon} label={s.label} />
        ))}
      </div>

      {live.length > 0 && (
        <section>
          <SectionHeader title="Live Now" badge={live.length} live />
          <div className="space-y-2.5">
            {live.map((m) => (
              <MatchRow key={m.id} match={m} picks={picks} myBets={myBets} stake={stake} onOpen={() => onOpen(m)} onPick={onPick} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <SectionHeader title="Upcoming" badge={upcoming.length} />
          <div className="space-y-2.5">
            {upcoming.map((m) => (
              <MatchRow key={m.id} match={m} picks={picks} myBets={myBets} stake={stake} onOpen={() => onOpen(m)} onPick={onPick} />
            ))}
          </div>
        </section>
      )}

      {filtered.length === 0 && !liveData.loading && (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">📺</p>
          <p className="font-medium">No matches available</p>
          <p className="text-xs text-slate-600 mt-1">Tap Refresh to check again</p>
        </div>
      )}
    </>
  );
}

function InPlayView({
  matches, picks, myBets, stake, onOpen, onPick,
}: {
  matches: Match[];
  picks: BetSelection[];
  myBets: Bet[];
  stake: number;
  onOpen: (m: Match) => void;
  onPick: (p: BetSelection) => void;
}) {
  if (matches.length === 0) {
    return (
      <div className="bg-[#111827] border border-white/5 rounded-2xl p-8 text-center">
        <Activity size={28} className="text-slate-700 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">No live matches right now</p>
      </div>
    );
  }
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500 live-dot" />
        <h2 className="font-bold text-slate-200">In-Play</h2>
        <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-medium">
          {matches.length}
        </span>
      </div>
      <div className="space-y-2.5">
        {matches.map((m) => (
          <MatchRow key={m.id} match={m} picks={picks} myBets={myBets} stake={stake} onOpen={() => onOpen(m)} onPick={onPick} />
        ))}
      </div>
    </section>
  );
}

function BetsView({ myBets, countdown, onCashOut }: { myBets: Bet[]; countdown: string; onCashOut: (betId: string) => void }) {
  const active = myBets.filter((b) => b.status === "pending");
  const history = myBets.filter((b) => b.status !== "pending");
  const isMonday = isMondayIST();

  if (myBets.length === 0) {
    return (
      <div className="bg-[#111827] border border-white/5 rounded-2xl p-8 text-center">
        <Receipt size={28} className="text-slate-700 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">No bets placed yet</p>
        <p className="text-slate-600 text-xs mt-1">Browse Sports tab to place your first bet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Settlement countdown banner */}
      <div className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 border",
        isMonday
          ? "bg-yellow-400/10 border-yellow-400/30"
          : "bg-white/5 border-white/10"
      )}>
        <CalendarClock size={18} className={isMonday ? "text-yellow-400" : "text-slate-500"} />
        <div>
          <p className={cn("text-sm font-bold", isMonday ? "text-yellow-300" : "text-slate-300")}>
            {isMonday ? "Settlement Day Today 🎉" : "Next Settlement: Monday"}
          </p>
          <p className="text-xs text-slate-500">
            {isMonday ? "All this week's bets are being settled" : `Settles in ${countdown}`}
          </p>
        </div>
      </div>

      {active.length > 0 && (
        <section>
          <h2 className="font-bold text-slate-200 mb-2.5 flex items-center gap-2">
            <Activity size={14} className="text-blue-400" />
            Active Bets
            <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">
              {active.length}
            </span>
          </h2>
          <div className="space-y-2">
            {active.map((b) => <BetCard key={b.id} bet={b} onCashOut={onCashOut} />)}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section>
          <h2 className="font-bold text-slate-200 mb-2.5">History</h2>
          <div className="space-y-1.5">
            {history.map((b) => <BetCard key={b.id} bet={b} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function AccountView({ stats, chips, username, name }: { stats: ReturnType<typeof statsForClient>; chips: number; username: string; name: string }) {
  return (
    <div className="space-y-4">
      <div className="bg-[#111827] border border-white/5 rounded-2xl p-5 flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold text-xl shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-200 text-lg truncate">{name}</p>
          <p className="text-xs text-slate-500 font-mono">@{username}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-yellow-400 tabular-nums">₹{chips.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">balance</p>
        </div>
      </div>

      {stats.totalBets > 0 ? (
        <StatsPanel stats={stats} perspective="client" />
      ) : (
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 text-center text-slate-500 text-sm">
          <p>Stats will appear once you start betting</p>
        </div>
      )}
    </div>
  );
}

// ---------- Subcomponents ----------

function LiveStatusBar({ liveData, ageMin }: { liveData: ReturnType<typeof useLiveMatches>; ageMin: number }) {
  const isDemo = liveData.isDemoData;
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-[11px] border rounded-lg px-3 py-1.5",
        liveData.loading
          ? "text-slate-500 bg-white/5 border-white/10"
          : isDemo
          ? "text-yellow-400/80 bg-yellow-500/5 border-yellow-500/15"
          : "text-emerald-400/80 bg-emerald-500/5 border-emerald-500/15"
      )}
    >
      {liveData.loading ? (
        <span>Loading live data…</span>
      ) : isDemo ? (
        <>
          <span className="bg-yellow-400/20 text-yellow-300 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">DEMO</span>
          <span className="text-slate-400">Showing demo matches</span>
        </>
      ) : (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot" />
          <span>Live from {liveData.source}</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-500">{ageMin === 0 ? "just now" : `${ageMin}m ago`}</span>
          {liveData.quotaRemaining !== undefined && (
            <>
              <span className="text-slate-500">·</span>
              <span className={cn("text-slate-500", liveData.quotaRemaining < 50 && "text-orange-400")}>
                {liveData.quotaRemaining} left
              </span>
            </>
          )}
        </>
      )}
      <button onClick={() => liveData.refresh()} disabled={liveData.refreshing} className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-50 transition-colors">
        <RefreshCw size={11} className={liveData.refreshing ? "animate-spin" : ""} />
        <span>Refresh</span>
      </button>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border shrink-0",
        active ? "bg-yellow-400 text-black border-yellow-400 shadow-lg shadow-yellow-400/20" : "bg-[#111827] text-slate-400 border-white/5 hover:text-slate-200 hover:border-white/10"
      )}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

function SectionHeader({ title, badge, live }: { title: string; badge: number; live?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      {live && <span className="w-2 h-2 rounded-full bg-red-500 live-dot" />}
      <h2 className="font-bold text-slate-200">{title}</h2>
      <span className={cn("text-xs border px-2 py-0.5 rounded-full font-medium", live ? "bg-red-500/20 text-red-400 border-red-500/20" : "bg-white/5 text-slate-400 border-white/10")}>
        {badge}
      </span>
    </div>
  );
}

function MatchRow({
  match,
  picks,
  myBets,
  stake,
  onPick,
  onOpen,
}: {
  match: Match;
  picks: BetSelection[];
  myBets: Bet[];
  stake: number;
  onPick: (p: BetSelection) => void;
  onOpen: () => void;
}) {
  const isLive = match.status === "live";
  const matchLabel = `${match.homeTeam} vs ${match.awayTeam}`;
  const odds = primaryOdds(match);
  const extraMarkets = Math.max(0, match.markets.length - 1);
  const activeBetsHere = myBets.filter((b) => b.matchId === match.id && b.status === "pending");

  function activeSideFor(opt: "home" | "away" | "draw"): "back" | "lay" | null {
    const baseId = `${match.id}-winner-${opt}`;
    if (picks.some((p) => p.id === `${baseId}-back`)) return "back";
    if (picks.some((p) => p.id === `${baseId}-lay`)) return "lay";
    return null;
  }

  function pickFor(optId: "home" | "away" | "draw", label: string, value: number, side: "back" | "lay"): BetSelection {
    const layOdds = Math.round((value + 0.05) * 100) / 100;
    return {
      id: `${match.id}-winner-${optId}-${side}`,
      matchId: match.id,
      match: matchLabel,
      market: "Match Winner",
      pick: label,
      odds: side === "lay" ? layOdds : value,
      side,
      sport: match.sport,
    };
  }

  return (
    <div className="bg-[#111827] border border-white/5 rounded-2xl p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>{sportLabels[match.sport].icon}</span>
          <span className="truncate max-w-[180px]">{match.league}</span>
        </div>
        {isLive ? (
          <span className="flex items-center gap-1 text-xs font-bold text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 live-dot" />
            LIVE {match.minute ? `${match.minute}'` : ""}
          </span>
        ) : (
          <span className="text-xs text-slate-500">in {match.startsIn}</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{match.homeFlag}</span>
            <span className="text-sm font-semibold text-slate-200 truncate">{match.homeTeam}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xl">{match.awayFlag}</span>
            <span className="text-sm font-semibold text-slate-200 truncate">{match.awayTeam}</span>
          </div>
        </div>
        {isLive && match.homeScore !== undefined && (
          <div className="text-right tabular-nums shrink-0">
            <p className="text-sm font-bold text-white">
              {match.homeScore}
              {match.homeWickets !== undefined && <span className="text-slate-400 font-normal">/{match.homeWickets}</span>}
              {match.homeOvers && <span className="text-[10px] text-slate-500 font-normal ml-1">({match.homeOvers})</span>}
            </p>
            {match.awayScore !== undefined ? (
              <p className="text-sm font-bold text-white mt-1">
                {match.awayScore}
                {match.awayWickets !== undefined && <span className="text-slate-400 font-normal">/{match.awayWickets}</span>}
                {match.awayOvers && <span className="text-[10px] text-slate-500 font-normal ml-1">({match.awayOvers})</span>}
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">Yet to bat</p>
            )}
          </div>
        )}
      </div>

      {odds && (
        <div className={cn("grid gap-1.5", odds.draw !== undefined ? "grid-cols-3" : "grid-cols-2")}>
          <BackLayOdds
            label={match.homeTeam.split(" ")[0]}
            sublabel="Home"
            odds={odds.home}
            stake={stake || undefined}
            activeSide={activeSideFor("home")}
            onPick={(side) => onPick(pickFor("home", match.homeTeam, odds.home, side))}
          />
          {odds.draw !== undefined && (
            <BackLayOdds
              label="Draw"
              odds={odds.draw}
              stake={stake || undefined}
              activeSide={activeSideFor("draw")}
              onPick={(side) => onPick(pickFor("draw", "Draw", odds.draw!, side))}
            />
          )}
          <BackLayOdds
            label={match.awayTeam.split(" ")[0]}
            sublabel="Away"
            odds={odds.away}
            stake={stake || undefined}
            activeSide={activeSideFor("away")}
            onPick={(side) => onPick(pickFor("away", match.awayTeam, odds.away, side))}
          />
        </div>
      )}

      {extraMarkets > 0 && (
        <button onClick={onOpen} className="w-full mt-2.5 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-yellow-400/10 hover:text-yellow-400 text-slate-400 text-xs font-semibold py-2 rounded-lg transition-colors">
          <span className="text-yellow-400/70 text-[9px] font-black uppercase tracking-wider bg-yellow-400/10 px-1.5 py-0.5 rounded">FANCY</span>
          +{extraMarkets} more markets <ChevronRight size={12} />
        </button>
      )}

      {activeBetsHere.length > 0 && (
        <div className="mt-2.5 bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-2.5 space-y-1">
          <div className="flex items-center gap-1.5">
            <Receipt size={11} className="text-yellow-400" />
            <span className="text-[11px] font-semibold text-yellow-400">
              Your bet{activeBetsHere.length > 1 ? "s" : ""}
            </span>
            <div className="ml-auto flex items-center gap-3 text-[11px]">
              <span className="text-slate-500">
                Stake <span className="font-bold text-slate-200 tabular-nums">{activeBetsHere.reduce((s, b) => s + b.stake, 0).toLocaleString()}</span>
              </span>
              <span className="text-slate-500">
                Win <span className="font-bold text-emerald-400 tabular-nums">{activeBetsHere.reduce((s, b) => s + Math.round(b.stake * b.odds), 0).toLocaleString()}</span>
              </span>
            </div>
          </div>
          {activeBetsHere.map((b) => (
            <div key={b.id} className="flex items-center justify-between text-[11px] gap-2">
              <span className="text-slate-400 truncate">
                <span className={cn("text-[9px] uppercase font-bold mr-1", b.side === "lay" ? "text-pink-400" : "text-cyan-400")}>
                  {b.side}
                </span>
                <span className="text-yellow-400/80 font-semibold">{b.market}:</span> {b.pick}
              </span>
              <span className="text-slate-500 tabular-nums shrink-0">
                {b.stake.toLocaleString()} @ {b.odds.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BetCard({ bet, onCashOut }: { bet: Bet; onCashOut?: (betId: string) => void }) {
  const isPending = bet.status === "pending";
  const potentialPayout = Math.round(bet.stake * bet.odds);
  const ageMin = Math.floor((Date.now() - bet.placedAt) / 60_000);

  const nextMonday = new Date(getNextMondayIST());
  const settleDateLabel = nextMonday.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className={cn("rounded-xl p-3 border", isPending ? "bg-blue-500/5 border-blue-500/20" : "bg-white/5 border-transparent")}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={cn("text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded", bet.side === "back" ? "bg-cyan-500/20 text-cyan-300" : "bg-pink-500/20 text-pink-300")}>
              {bet.side}
            </span>
            {bet.market && <span className="text-[10px] text-yellow-400/80 uppercase tracking-wider font-semibold">{bet.market}</span>}
          </div>
          <p className="text-xs text-slate-500 truncate">{bet.match}</p>
          <p className="text-sm font-semibold text-slate-200 truncate">{bet.pick} @ {bet.odds.toFixed(2)}</p>
        </div>
        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0", {
          pending: "bg-blue-500/20 text-blue-400 border-blue-500/30",
          won: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
          lost: "bg-red-500/20 text-red-400 border-red-500/30",
        }[bet.status])}>
          {bet.status}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Stake <span className="text-slate-300 font-semibold">{bet.stake.toLocaleString()}</span></span>
        {bet.status === "won" && <span className="text-emerald-400 font-bold">+{potentialPayout.toLocaleString()}</span>}
        {bet.status === "lost" && <span className="text-red-400 font-bold">-{bet.stake.toLocaleString()}</span>}
        {isPending && (
          <span className="text-slate-500 flex items-center gap-1">
            <Clock size={11} /> {ageMin === 0 ? "just now" : `${ageMin}m ago`}
          </span>
        )}
      </div>

      {isPending && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
          <CalendarClock size={11} className="text-yellow-400/60" />
          <span>Settles on <span className="text-yellow-400/80 font-semibold">{settleDateLabel}</span></span>
          <span className="ml-auto text-slate-600 tabular-nums">Win: <span className="text-emerald-400/70">{potentialPayout.toLocaleString()}</span></span>
        </div>
      )}

      {isPending && onCashOut && (
        <button
          onClick={() => onCashOut(bet.id)}
          className="mt-2.5 w-full flex items-center justify-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 text-[11px] font-bold py-2 rounded-lg transition-colors active:scale-[0.98]"
        >
          <Sparkles size={11} />
          Cash Out · Win up to ₹{potentialPayout.toLocaleString()}
        </button>
      )}
    </div>
  );
}

function Sheet({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[#111827] border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-200">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 p-1 rounded-lg hover:bg-white/5">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
