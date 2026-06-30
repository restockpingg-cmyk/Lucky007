"use client";

import { useRouter } from "next/navigation";
import { LogOut, Zap, Coins } from "lucide-react";
import { logout, type User } from "@/lib/store";

interface TopBarProps {
  user: User;
  subtitle?: string;
}

export default function TopBar({ user, subtitle }: TopBarProps) {
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/");
  }

  const roleLabel = { owner: "Owner", admin: "Admin", client: "Player" }[user.role];

  return (
    <header className="sticky top-0 z-40 bg-[#0d1321]/95 backdrop-blur border-b border-white/5">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
            <Zap size={14} className="text-black fill-black" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold">
              Lucky<span className="text-yellow-400">007</span>
            </span>
            <span className="text-[10px] text-slate-500">{subtitle ?? roleLabel}</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-3 py-1.5">
            <Coins size={14} className="text-yellow-400" />
            <span className="text-sm font-bold text-yellow-400 tabular-nums">
              {user.chips.toLocaleString()}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
