"use client";

import { X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import BackLayOdds from "./BackLayOdds";
import CommentaryStrip from "./CommentaryStrip";
import type { Match, Market } from "@/lib/data";
import { sportLabels } from "@/lib/data";

export interface BetSelection {
  id: string;
  matchId: string;
  match: string;
  market: string;
  pick: string;
  odds: number;
  side: "back" | "lay";
}

interface Props {
  match: Match;
  picks: BetSelection[];
  onPick: (sel: BetSelection) => void;
  onClose: () => void;
}

export default function MatchDetailSheet({ match, picks, onPick, onClose }: Props) {
  const isLive = match.status === "live";
  const matchLabel = `${match.homeTeam} vs ${match.awayTeam}`;
  const isCricket = match.sport === "cricket";

  function selectionFor(market: Market, option: { id: string; label: string; odds: number }, side: "back" | "lay"): BetSelection {
    const layOdds = Math.round((option.odds + 0.05) * 100) / 100;
    return {
      id: `${match.id}-${market.id}-${option.id}-${side}`,
      matchId: match.id,
      match: matchLabel,
      market: market.label,
      pick: option.label,
      odds: side === "lay" ? layOdds : option.odds,
      side,
    };
  }

  function activeSideFor(market: Market, option: { id: string }): "back" | "lay" | null {
    const backId = `${match.id}-${market.id}-${option.id}-back`;
    const layId = `${match.id}-${market.id}-${option.id}-lay`;
    if (picks.some((p) => p.id === backId)) return "back";
    if (picks.some((p) => p.id === layId)) return "lay";
    return null;
  }

  const fancyMarkets = match.markets.filter((mk) => mk.isFancy);
  const mainMarkets = match.markets.filter((mk) => !mk.isFancy);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-[#0d1117] border border-white/10 rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Sticky header */}
        <div className="sticky top-0 bg-[#0d1117] border-b border-white/5 px-4 pt-4 pb-3 z-10">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <span>{sportLabels[match.sport].icon}</span>
                <span>{match.league}</span>
                {isLive && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 live-dot" />
                    LIVE {match.minute ? `${match.minute}'` : ""}
                  </span>
                )}
              </div>
              <p className="font-bold text-slate-200 text-base leading-tight">{matchLabel}</p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-200 p-1 rounded-lg hover:bg-white/5 shrink-0">
              <X size={20} />
            </button>
          </div>

          {/* Score row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{match.homeFlag}</span>
                <div>
                  <p className="text-xs text-slate-400 font-medium">{match.homeTeam.split(" ").pop()}</p>
                  {match.homeScore !== undefined && (
                    <p className="text-base font-black text-white tabular-nums">
                      {match.homeScore}
                      {match.homeWickets !== undefined && <span className="text-slate-400 font-normal">/{match.homeWickets}</span>}
                      {match.homeOvers && <span className="text-[11px] text-slate-500 font-normal ml-1">({match.homeOvers})</span>}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-slate-600 text-xs font-bold">vs</span>
              <div className="flex items-center gap-2">
                <span className="text-xl">{match.awayFlag}</span>
                <div>
                  <p className="text-xs text-slate-400 font-medium">{match.awayTeam.split(" ").pop()}</p>
                  {match.awayScore !== undefined && (
                    <p className="text-base font-black text-white tabular-nums">
                      {match.awayScore}
                      {match.awayWickets !== undefined && <span className="text-slate-400 font-normal">/{match.awayWickets}</span>}
                      {match.awayOvers && <span className="text-[11px] text-slate-500 font-normal ml-1">({match.awayOvers})</span>}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {!isLive && match.startsIn && (
              <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-lg">in {match.startsIn}</span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5">
          {isLive && isCricket && <CommentaryStrip matchId={match.id} />}

          {/* Main markets */}
          {mainMarkets.length > 0 && (
            <div className="space-y-4">
              {mainMarkets.map((mk) => (
                <MarketBlock key={mk.id} market={mk} activeSideFor={activeSideFor} selectionFor={selectionFor} onPick={onPick} />
              ))}
            </div>
          )}

          {/* Fancy markets section */}
          {fancyMarkets.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-yellow-400" />
                <span className="text-xs font-black uppercase tracking-widest text-yellow-400">Fancy Bets</span>
                <span className="ml-1 text-[10px] bg-yellow-400/10 border border-yellow-400/20 px-1.5 py-0.5 rounded font-medium text-yellow-400/70">
                  {fancyMarkets.length}
                </span>
              </div>
              <div className="space-y-3">
                {fancyMarkets.map((mk) => (
                  <MarketBlock key={mk.id} market={mk} activeSideFor={activeSideFor} selectionFor={selectionFor} onPick={onPick} isFancy />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MarketBlock({
  market,
  activeSideFor,
  selectionFor,
  onPick,
  isFancy,
}: {
  market: Market;
  activeSideFor: (market: Market, opt: { id: string }) => "back" | "lay" | null;
  selectionFor: (market: Market, opt: { id: string; label: string; odds: number }, side: "back" | "lay") => BetSelection;
  onPick: (sel: BetSelection) => void;
  isFancy?: boolean;
}) {
  return (
    <div className={cn("rounded-xl overflow-hidden border", isFancy ? "border-yellow-400/15 bg-yellow-400/[0.03]" : "border-white/5")}>
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-bold", isFancy ? "text-yellow-100" : "text-slate-200")}>{market.label}</p>
          {market.description && <p className="text-[10px] text-slate-500 mt-0.5">{market.description}</p>}
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[9px] uppercase tracking-wider font-bold shrink-0">
          <span className="text-cyan-400/80">Back</span>
          <span className="text-pink-400/80">Lay</span>
        </div>
      </div>
      <div
        className={cn(
          "grid gap-1 px-2 pb-2",
          market.options.length === 2 && "grid-cols-2",
          market.options.length === 3 && "grid-cols-3",
          market.options.length >= 4 && "grid-cols-2"
        )}
      >
        {market.options.map((op) => (
          <BackLayOdds
            key={op.id}
            label={op.label}
            sublabel={op.sublabel}
            odds={op.odds}
            activeSide={activeSideFor(market, op)}
            onPick={(side) => onPick(selectionFor(market, op, side))}
          />
        ))}
      </div>
    </div>
  );
}
