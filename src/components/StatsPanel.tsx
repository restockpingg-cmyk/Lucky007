"use client";

import { TrendingUp, TrendingDown, Trophy, Target, Coins, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Stats } from "@/lib/store";

interface StatsPanelProps {
  stats: Stats;
  perspective: "owner" | "admin" | "client";
}

export default function StatsPanel({ stats, perspective }: StatsPanelProps) {
  const isPositive = stats.profit >= 0;
  const profitLabel =
    perspective === "client" ? "Your P&L" : perspective === "admin" ? "Earnings" : "House P&L";

  return (
    <div className="bg-gradient-to-br from-[#111827] to-[#0d1321] border border-white/5 rounded-2xl overflow-hidden">
      {/* Hero P&L */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">
              {profitLabel}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  "text-3xl font-black tabular-nums",
                  isPositive ? "text-emerald-400" : "text-red-400"
                )}
              >
                {isPositive ? "+" : ""}
                {stats.profit.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500">chips</span>
            </div>
          </div>
          <div
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center border",
              isPositive
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            )}
          >
            {isPositive ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Activity size={12} />
            <span>
              {stats.totalBets} total {stats.totalBets === 1 ? "bet" : "bets"}
            </span>
          </div>
          {stats.pending > 0 && (
            <div className="flex items-center gap-1.5 text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 live-dot" />
              {stats.pending} pending
            </div>
          )}
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-4 divide-x divide-white/5">
        <Cell
          icon={<Trophy size={12} />}
          label="Won"
          value={String(stats.won)}
          color="text-emerald-400"
        />
        <Cell
          icon={<Target size={12} />}
          label="Lost"
          value={String(stats.lost)}
          color="text-red-400"
        />
        <Cell
          icon={<Activity size={12} />}
          label="Win rate"
          value={`${stats.winRate.toFixed(0)}%`}
          color="text-yellow-400"
        />
        <Cell
          icon={<Coins size={12} />}
          label="Wagered"
          value={stats.totalStaked.toLocaleString()}
          color="text-slate-300"
        />
      </div>

      {(stats.biggestWin > 0 || stats.biggestLoss > 0) && (
        <div className="grid grid-cols-2 divide-x divide-white/5 border-t border-white/5">
          <div className="p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
              {perspective === "client" ? "Biggest win" : "Biggest gain"}
            </p>
            <p className="text-sm font-bold text-emerald-400 tabular-nums">
              +{stats.biggestWin.toLocaleString()}
            </p>
          </div>
          <div className="p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
              {perspective === "client" ? "Biggest loss" : "Biggest payout"}
            </p>
            <p className="text-sm font-bold text-red-400 tabular-nums">
              -{stats.biggestLoss.toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Cell({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="p-3">
      <div className={cn("flex items-center gap-1 mb-0.5", color)}>
        {icon}
        <span className="text-[10px] uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <p className={cn("text-base font-bold tabular-nums", color)}>{value}</p>
    </div>
  );
}

export function PnLBadge({ profit }: { profit: number }) {
  if (profit === 0) {
    return (
      <span className="text-[10px] font-bold text-slate-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full">
        —
      </span>
    );
  }
  const isPositive = profit > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border tabular-nums",
        isPositive
          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
          : "text-red-400 bg-red-500/10 border-red-500/20"
      )}
    >
      {isPositive ? "+" : ""}
      {profit.toLocaleString()}
    </span>
  );
}
