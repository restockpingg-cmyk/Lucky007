"use client";

import { useState } from "react";
import { Plus, X, Trash2, ArrowUpRight, ArrowDownLeft, Users } from "lucide-react";
import {
  allocateChips,
  reclaimChips,
  createUser,
  deleteUser,
  statsForClient,
  statsForAdmin,
  type Role,
  type User,
  type Bet,
} from "@/lib/store";
import { PnLBadge } from "./StatsPanel";

interface UserManagerProps {
  currentUser: User;
  children: User[];
  childRole: Role;
  childLabel: string;
  allUsers?: User[];
  bets?: Bet[];
}

export default function UserManager({
  currentUser,
  children,
  childRole,
  childLabel,
  allUsers = [],
  bets = [],
}: UserManagerProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [createError, setCreateError] = useState("");

  const [allocOpen, setAllocOpen] = useState<string | null>(null);
  const [allocMode, setAllocMode] = useState<"give" | "take">("give");
  const [allocAmount, setAllocAmount] = useState("");
  const [allocError, setAllocError] = useState("");

  function handleCreate() {
    setCreateError("");
    if (!name.trim() || !username.trim() || !pin.trim()) {
      setCreateError("All fields are required");
      return;
    }
    if (pin.length < 4) {
      setCreateError("PIN must be at least 4 digits");
      return;
    }
    const res = createUser(currentUser.id, {
      name: name.trim(),
      username: username.trim(),
      pin: pin.trim(),
      role: childRole,
    });
    if (!res.ok) {
      setCreateError(res.error);
      return;
    }
    setName("");
    setUsername("");
    setPin("");
    setShowCreate(false);
  }

  function handleAllocate(targetId: string) {
    setAllocError("");
    const amount = parseInt(allocAmount);
    if (!amount || amount <= 0) {
      setAllocError("Enter a valid amount");
      return;
    }
    const res =
      allocMode === "give"
        ? allocateChips(currentUser.id, targetId, amount)
        : reclaimChips(targetId, currentUser.id, amount);
    if (!res.ok) {
      setAllocError(res.error);
      return;
    }
    setAllocAmount("");
    setAllocOpen(null);
  }

  function handleDelete(id: string, label: string) {
    if (confirm(`Delete ${label}? Their balance will be returned to you.`)) {
      deleteUser(id);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-yellow-400" />
          <h2 className="font-bold text-slate-200">{childLabel}s</h2>
          <span className="text-xs bg-white/5 text-slate-400 border border-white/10 px-2 py-0.5 rounded-full font-medium">
            {children.length}
          </span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 bg-yellow-400 hover:bg-yellow-300 text-black text-sm font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all"
        >
          <Plus size={14} /> Add {childLabel}
        </button>
      </div>

      {children.length === 0 ? (
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-8 text-center">
          <p className="text-slate-500 text-sm">No {childLabel.toLowerCase()}s yet</p>
          <p className="text-slate-600 text-xs mt-1">Tap &quot;Add {childLabel}&quot; to create one</p>
        </div>
      ) : (
        <div className="space-y-2">
          {children.map((c) => {
            // For client child: their P&L. For admin child: their cumulative house P&L from clients under them.
            const childStats =
              childRole === "client"
                ? statsForClient(c.id, bets)
                : statsForAdmin(c.id, allUsers, bets);
            return (
            <div key={c.id} className="bg-[#111827] border border-white/5 rounded-2xl p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/10 border border-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-slate-200 truncate">{c.name}</p>
                      <PnLBadge profit={childStats.profit} />
                    </div>
                    <p className="text-xs text-slate-500 font-mono truncate">@{c.username}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-bold text-yellow-400 tabular-nums">
                    ₹{c.chips.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">balance</p>
                </div>
              </div>

              {childStats.totalBets > 0 && (
                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                  <span><span className="text-slate-300 font-semibold">{childStats.totalBets}</span> bets</span>
                  <span className="text-emerald-400/80">W {childStats.won}</span>
                  <span className="text-red-400/80">L {childStats.lost}</span>
                  {childStats.pending > 0 && (
                    <span className="text-blue-400/80">P {childStats.pending}</span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1.5 mt-3">
                <button
                  onClick={() => {
                    setAllocMode("give");
                    setAllocOpen(c.id);
                    setAllocError("");
                  }}
                  className="flex-1 flex items-center justify-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold py-2 rounded-lg transition-colors"
                >
                  <ArrowUpRight size={13} /> Add Balance
                </button>
                <button
                  onClick={() => {
                    setAllocMode("take");
                    setAllocOpen(c.id);
                    setAllocError("");
                  }}
                  className="flex-1 flex items-center justify-center gap-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 text-xs font-semibold py-2 rounded-lg transition-colors"
                >
                  <ArrowDownLeft size={13} /> Deduct
                </button>
                <button
                  onClick={() => handleDelete(c.id, c.name)}
                  className="flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-2.5 py-2 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <Modal title={`Add ${childLabel}`} onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <Field label="Display name" value={name} onChange={setName} placeholder="John Doe" />
            <Field label="Username" value={username} onChange={setUsername} placeholder="johndoe" />
            <Field
              label="PIN"
              value={pin}
              onChange={setPin}
              placeholder="4+ digits"
              type="password"
              inputMode="numeric"
            />
            {createError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {createError}
              </p>
            )}
            <button
              onClick={handleCreate}
              className="w-full bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-black font-bold py-3 rounded-xl transition-all"
            >
              Create {childLabel}
            </button>
          </div>
        </Modal>
      )}

      {/* Allocate modal */}
      {allocOpen && (
        <Modal
          title={`${allocMode === "give" ? "Add Balance" : "Deduct"} — ${children.find((c) => c.id === allocOpen)?.name ?? ""}`}
          onClose={() => setAllocOpen(null)}
        >
          <div className="space-y-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Your balance</span>
                <span className="font-bold text-yellow-400 tabular-nums">
                  ₹{currentUser.chips.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-400 mt-1">
                <span>Their balance</span>
                <span className="font-bold text-slate-200 tabular-nums">
                  ₹{children.find((c) => c.id === allocOpen)?.chips.toLocaleString()}
                </span>
              </div>
            </div>
            <Field
              label="Amount"
              value={allocAmount}
              onChange={setAllocAmount}
              placeholder="0"
              type="number"
              inputMode="numeric"
            />
            <div className="flex gap-1.5">
              {[100, 500, 1000, 5000].map((v) => (
                <button
                  key={v}
                  onClick={() => setAllocAmount(String(v))}
                  className="flex-1 text-xs py-2 rounded-lg bg-white/5 hover:bg-yellow-400/10 hover:text-yellow-400 text-slate-400 transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
            {allocError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {allocError}
              </p>
            )}
            <button
              onClick={() => handleAllocate(allocOpen)}
              className={`w-full font-bold py-3 rounded-xl transition-all active:scale-[0.98] ${
                allocMode === "give"
                  ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                  : "bg-orange-500 hover:bg-orange-400 text-white"
              }`}
            >
              {allocMode === "give" ? "Add" : "Deduct"} ₹{allocAmount || "0"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-[#111827] border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl">
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "numeric" | "text";
}) {
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
