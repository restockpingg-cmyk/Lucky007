"use client";

import { cn } from "@/lib/utils";

interface Props {
  label: string;
  sublabel?: string;
  odds: number;
  activeSide?: "back" | "lay" | null;
  onPick: (side: "back" | "lay") => void;
  layOdds?: number;
  stake?: number; // when set, shows the payout amount on the button
}

export default function BackLayOdds({ label, sublabel, odds, activeSide, onPick, layOdds, stake }: Props) {
  const computedLayOdds = layOdds ?? Math.round((odds + 0.05) * 100) / 100;

  const backPayout = stake ? Math.round(stake * odds) : null;
  const layPayout = stake ? Math.round(stake * computedLayOdds) : null;

  return (
    <div className="bg-[#0d1321] rounded-xl overflow-hidden border border-white/5">
      <div className="px-2 py-1.5 text-center">
        <p className="text-[11px] font-semibold text-slate-300 truncate">{label}</p>
        {sublabel && <p className="text-[9px] text-slate-500 truncate">{sublabel}</p>}
      </div>
      <div className="grid grid-cols-2 gap-px bg-white/5">
        <button
          onClick={() => onPick("back")}
          className={cn(
            "flex flex-col items-center justify-center py-2 transition-all active:scale-95",
            activeSide === "back"
              ? "bg-cyan-400 text-black"
              : "bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25"
          )}
        >
          <span className="text-[8px] uppercase tracking-wider opacity-70 font-semibold">Back</span>
          <span className="text-sm font-bold tabular-nums">{odds.toFixed(2)}</span>
          {backPayout !== null && (
            <span className={cn("text-[9px] tabular-nums font-semibold mt-0.5", activeSide === "back" ? "text-black/70" : "text-cyan-400/70")}>
              ₹{backPayout.toLocaleString("en-IN")}
            </span>
          )}
        </button>
        <button
          onClick={() => onPick("lay")}
          className={cn(
            "flex flex-col items-center justify-center py-2 transition-all active:scale-95",
            activeSide === "lay"
              ? "bg-pink-400 text-black"
              : "bg-pink-500/15 text-pink-300 hover:bg-pink-500/25"
          )}
        >
          <span className="text-[8px] uppercase tracking-wider opacity-70 font-semibold">Lay</span>
          <span className="text-sm font-bold tabular-nums">{computedLayOdds.toFixed(2)}</span>
          {layPayout !== null && (
            <span className={cn("text-[9px] tabular-nums font-semibold mt-0.5", activeSide === "lay" ? "text-black/70" : "text-pink-400/70")}>
              ₹{layPayout.toLocaleString("en-IN")}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
