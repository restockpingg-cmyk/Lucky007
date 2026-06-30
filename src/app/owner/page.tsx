"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Users, TrendingUp, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import TopBar from "@/components/TopBar";
import UserManager from "@/components/UserManager";
import StatsPanel from "@/components/StatsPanel";
import Loading from "@/components/Loading";
import { useStore, useHydrated, statsForOwner } from "@/lib/store";

export default function OwnerDashboard() {
  const router = useRouter();
  const hydrated = useHydrated();
  const store = useStore();
  const me = store.users.find((u) => u.id === store.currentUserId);
  const [statsOpen, setStatsOpen] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    if (!me) router.replace("/");
    else if (me.role !== "owner") router.replace(`/${me.role}`);
  }, [hydrated, me, router]);

  if (!hydrated) return <Loading />;
  if (!me || me.role !== "owner") return <Loading />;

  const admins = store.users.filter((u) => u.role === "admin" && u.parentId === me.id);
  const adminIds = new Set(admins.map((a) => a.id));
  const allClients = store.users.filter(
    (u) => u.role === "client" && u.parentId && adminIds.has(u.parentId)
  );
  const totalAdminChips = admins.reduce((s, a) => s + a.chips, 0);
  const totalClientChips = allClients.reduce((s, c) => s + c.chips, 0);
  const totalInSystem = me.chips + totalAdminChips + totalClientChips;
  const stats = statsForOwner(me.id, store.users, store.bets);

  return (
    <div className="min-h-screen pb-12">
      <TopBar user={me} />
      <main className="max-w-5xl mx-auto px-4 py-4 space-y-5">
        {/* Top stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Stat icon={<Coins size={16} />} label="Your chips" value={me.chips.toLocaleString()} color="yellow" />
          <Stat icon={<TrendingUp size={16} />} label="With admins" value={totalAdminChips.toLocaleString()} color="emerald" />
          <Stat icon={<Users size={16} />} label="With players" value={totalClientChips.toLocaleString()} color="blue" />
          <Stat icon={<BarChart3 size={16} />} label="Total in system" value={totalInSystem.toLocaleString()} color="purple" />
        </div>

        {/* P&L Panel */}
        <section>
          <button
            onClick={() => setStatsOpen(!statsOpen)}
            className="flex items-center gap-2 w-full mb-2.5 group"
          >
            <BarChart3 size={16} className="text-yellow-400" />
            <h2 className="font-bold text-slate-200">House Performance</h2>
            <span className="text-xs bg-white/5 text-slate-400 border border-white/10 px-2 py-0.5 rounded-full font-medium ml-auto">
              {admins.length} admin{admins.length !== 1 ? "s" : ""} · {allClients.length} player
              {allClients.length !== 1 ? "s" : ""}
            </span>
            {statsOpen ? (
              <ChevronUp size={16} className="text-slate-500 group-hover:text-slate-300" />
            ) : (
              <ChevronDown size={16} className="text-slate-500 group-hover:text-slate-300" />
            )}
          </button>
          {statsOpen && <StatsPanel stats={stats} perspective="owner" />}
        </section>

        <UserManager
          currentUser={me}
          children={admins}
          childRole="admin"
          childLabel="Admin"
          allUsers={store.users}
          bets={store.bets}
        />
      </main>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "yellow" | "emerald" | "blue" | "purple";
}) {
  const colors = {
    yellow: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };
  return (
    <div className={`border rounded-2xl px-3 py-3 ${colors[color]}`}>
      <div className="flex items-center gap-1 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <p className="font-bold text-base sm:text-lg tabular-nums">{value}</p>
    </div>
  );
}
