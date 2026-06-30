"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface BallEvent {
  ball: string;
  description: string;
  over: number;
  delivery: number;
}

const OUTCOMES = [
  { label: "0", weight: 35, desc: "Dot ball, no run" },
  { label: "1", weight: 25, desc: "Single taken" },
  { label: "2", weight: 8, desc: "Two runs" },
  { label: "3", weight: 2, desc: "Three runs" },
  { label: "4", weight: 14, desc: "FOUR! Boundary" },
  { label: "6", weight: 8, desc: "SIX! Maximum" },
  { label: "W", weight: 6, desc: "WICKET!" },
  { label: "WD", weight: 2, desc: "Wide" },
];

function randomBall(): { label: string; desc: string } {
  const totalWeight = OUTCOMES.reduce((s, o) => s + o.weight, 0);
  let pick = Math.random() * totalWeight;
  for (const o of OUTCOMES) {
    if (pick < o.weight) return { label: o.label, desc: o.desc };
    pick -= o.weight;
  }
  return OUTCOMES[0];
}

interface Props {
  matchId: string;
}

export default function CommentaryStrip({ matchId }: Props) {
  const [balls, setBalls] = useState<BallEvent[]>([]);

  useEffect(() => {
    // Seed initial 12 balls
    const seed: BallEvent[] = [];
    for (let i = 0; i < 12; i++) {
      const r = randomBall();
      seed.push({
        ball: r.label,
        description: r.desc,
        over: Math.floor(i / 6) + 5,
        delivery: (i % 6) + 1,
      });
    }
    setBalls(seed);

    // Add a new ball every 8 seconds for live feel
    const interval = setInterval(() => {
      setBalls((prev) => {
        const last = prev[prev.length - 1];
        const r = randomBall();
        const nextOver = last.delivery === 6 ? last.over + 1 : last.over;
        const nextDelivery = last.delivery === 6 ? 1 : last.delivery + 1;
        const next: BallEvent = {
          ball: r.label,
          description: r.desc,
          over: nextOver,
          delivery: nextDelivery,
        };
        return [...prev.slice(-19), next];
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [matchId]);

  return (
    <div className="bg-[#0d1321] border border-white/5 rounded-xl p-2.5">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 live-dot" />
        <span className="text-[10px] uppercase tracking-wider font-bold text-red-400">Live Commentary</span>
        <span className="text-[10px] text-slate-500 ml-auto">
          Over {balls[balls.length - 1]?.over ?? 5}.{balls[balls.length - 1]?.delivery ?? 1}
        </span>
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {balls.map((b, i) => (
          <BallBadge key={`${i}-${b.over}-${b.delivery}`} ball={b.ball} isLatest={i === balls.length - 1} />
        ))}
      </div>
      <p className="text-[11px] text-slate-400 mt-1.5">
        {balls[balls.length - 1]?.description ?? "Waiting for play..."}
      </p>
    </div>
  );
}

function BallBadge({ ball, isLatest }: { ball: string; isLatest: boolean }) {
  const colors: Record<string, string> = {
    "0": "bg-white/5 text-slate-400 border-white/10",
    "1": "bg-white/5 text-slate-300 border-white/10",
    "2": "bg-white/5 text-slate-300 border-white/10",
    "3": "bg-white/5 text-slate-300 border-white/10",
    "4": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "6": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "W": "bg-red-500/20 text-red-400 border-red-500/30",
    "WD": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };
  return (
    <span
      className={cn(
        "shrink-0 w-7 h-7 flex items-center justify-center rounded-full border text-xs font-bold tabular-nums",
        colors[ball] ?? "bg-white/5 text-slate-400 border-white/10",
        isLatest && "ring-2 ring-yellow-400/50 scale-110"
      )}
    >
      {ball}
    </span>
  );
}
