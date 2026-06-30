"use client";

import { Trophy, Activity, Receipt, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ClientView = "sports" | "inplay" | "bets" | "account";

interface Props {
  active: ClientView;
  onChange: (v: ClientView) => void;
  activeBetCount?: number;
}

export default function BottomNav({ active, onChange, activeBetCount = 0 }: Props) {
  const items: { id: ClientView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "sports", label: "Sports", icon: <Trophy size={20} /> },
    { id: "inplay", label: "In-Play", icon: <Activity size={20} /> },
    { id: "bets", label: "My Bets", icon: <Receipt size={20} />, badge: activeBetCount },
    { id: "account", label: "Account", icon: <UserIcon size={20} /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d1321]/95 backdrop-blur border-t border-white/5">
      <div className="max-w-5xl mx-auto grid grid-cols-4">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium transition-colors relative",
              active === it.id
                ? "text-yellow-400"
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            <div className="relative">
              {it.icon}
              {it.badge !== undefined && it.badge > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {it.badge > 9 ? "9+" : it.badge}
                </span>
              )}
            </div>
            <span>{it.label}</span>
            {active === it.id && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-yellow-400 rounded-b" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
