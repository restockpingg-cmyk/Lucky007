"use client";

import { useEffect, useState } from "react";

export type Role = "owner" | "admin" | "cobookie" | "client";

export interface User {
  id: string;
  name: string;
  username: string;
  pin: string;
  role: Role;
  chips: number;
  parentId: string | null;
  createdAt: number;
  lastLoginAt?: number;
  commission?: number;           // % of house profit that goes to the assigned co-bookie
  commissionTo?: string;         // which co-bookie receives the commission on this player's P&L
  commissionAssignedAt?: number; // timestamp — only bets placed AFTER this count toward commission
}

export type AccountEventType = "chips_in" | "chips_out" | "account_created" | "transferred";

export interface AccountEvent {
  id: string;
  playerId: string;
  type: AccountEventType;
  amount?: number;
  byId: string;
  byName: string;
  note?: string;
  timestamp: number;
}

export interface LoginEvent {
  id: string;
  userId: string;
  timestamp: number;
  device: string;
  browser: string;
}

export type BetSide = "back" | "lay";

export interface Bet {
  id: string;
  clientId: string;
  matchId: string;
  match: string;
  market: string;
  pick: string;
  odds: number;
  stake: number;
  side: BetSide;
  status: "pending" | "won" | "lost";
  placedAt: number;
}

export interface CommissionChange {
  id: string;
  userId: string;
  userName: string;
  userRole: Role;
  fromRate: number | undefined;
  toRate: number;
  commissionToId?: string;  // co-bookie who receives this commission
  changedAt: number;
  changedBy: string;
}

interface Store {
  users: User[];
  bets: Bet[];
  commissionHistory: CommissionChange[];
  accountEvents: AccountEvent[];
  loginEvents: LoginEvent[];
  currentUserId: string | null;
}

const KEY = "lucky007_store_v1";

function seed(): Store {
  const owner: User = {
    id: "u_owner",
    name: "Owner",
    username: "owner",
    pin: "1234",
    role: "owner",
    chips: 1_000_000,
    parentId: null,
    createdAt: Date.now(),
  };
  return { users: [owner], bets: [], commissionHistory: [], accountEvents: [], loginEvents: [], currentUserId: null };
}

function read(): Store {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const fresh = seed();
      localStorage.setItem(KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw) as Store;
    if (!parsed.commissionHistory) parsed.commissionHistory = [];
    if (!parsed.accountEvents) parsed.accountEvents = [];
    if (!parsed.loginEvents) parsed.loginEvents = [];
    return parsed;
  } catch {
    return seed();
  }
}

function write(s: Store) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("lucky007_store_change"));
}

export function useStore() {
  const [store, setStore] = useState<Store>(() => seed());

  useEffect(() => {
    setStore(read());
    const handler = () => setStore(read());
    window.addEventListener("lucky007_store_change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("lucky007_store_change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return store;
}

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => {
    setH(true);
  }, []);
  return h;
}

export function getStore(): Store {
  return read();
}

function parseDevice(ua: string): string {
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return "Android Phone";
  if (/Android/i.test(ua)) return "Android Tablet";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown Device";
}

function parseBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR|Opera/i.test(ua)) return "Opera";
  if (/SamsungBrowser/i.test(ua)) return "Samsung Browser";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Chrome/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua)) return "Safari";
  return "Browser";
}

export function login(username: string, pin: string, userAgent?: string): User | null {
  const s = read();
  const user = s.users.find((u) => u.username.toLowerCase() === username.toLowerCase() && u.pin === pin);
  if (!user) return null;
  s.currentUserId = user.id;
  const now = Date.now();
  user.lastLoginAt = now;
  const device = userAgent ? parseDevice(userAgent) : "Unknown Device";
  const browser = userAgent ? parseBrowser(userAgent) : "Browser";
  s.loginEvents.push({
    id: `le_${Math.random().toString(36).slice(2, 10)}`,
    userId: user.id,
    timestamp: now,
    device,
    browser,
  });
  // Keep only the last 50 login events per user
  const userLogins = s.loginEvents.filter((e) => e.userId === user.id);
  if (userLogins.length > 50) {
    const cutIds = new Set(userLogins.slice(0, userLogins.length - 50).map((e) => e.id));
    s.loginEvents = s.loginEvents.filter((e) => !cutIds.has(e.id));
  }
  write(s);
  return user;
}

export function logout() {
  const s = read();
  s.currentUserId = null;
  write(s);
}

export function createUser(
  parentId: string,
  data: { name: string; username: string; pin: string; role: Role; commission?: number; commissionTo?: string }
): { ok: true; user: User } | { ok: false; error: string } {
  const s = read();
  if (s.users.some((u) => u.username.toLowerCase() === data.username.toLowerCase())) {
    return { ok: false, error: "Username already exists" };
  }
  const user: User = {
    id: `u_${Math.random().toString(36).slice(2, 10)}`,
    name: data.name,
    username: data.username,
    pin: data.pin,
    role: data.role,
    chips: 0,
    parentId,
    createdAt: Date.now(),
    ...(data.commission !== undefined ? { commission: data.commission } : {}),
    ...(data.commissionTo !== undefined ? { commissionTo: data.commissionTo } : {}),
  };
  s.users.push(user);
  // Log account creation event for clients
  if (data.role === "client") {
    const creator = s.users.find((u) => u.id === parentId);
    s.accountEvents.push({
      id: `ae_${Math.random().toString(36).slice(2, 10)}`,
      playerId: user.id,
      type: "account_created",
      byId: parentId,
      byName: creator?.name ?? "Admin",
      timestamp: user.createdAt,
    });
  }
  write(s);
  return { ok: true, user };
}

export function deleteUser(userId: string) {
  const s = read();
  const user = s.users.find((u) => u.id === userId);
  if (!user || user.role === "owner") return;
  // return chips to parent
  if (user.parentId) {
    const parent = s.users.find((u) => u.id === user.parentId);
    if (parent) parent.chips += user.chips;
  }
  // cascade: if admin, return all client chips to that admin's chips first then back up
  const children = s.users.filter((u) => u.parentId === userId);
  for (const c of children) {
    if (user.parentId) {
      const parent = s.users.find((u) => u.id === user.parentId);
      if (parent) parent.chips += c.chips;
    }
  }
  s.users = s.users.filter((u) => u.id !== userId && u.parentId !== userId);
  write(s);
}

export function reassignPlayer(
  playerId: string,
  newParentId: string,
  commission: number | undefined,
  changedById: string
): { ok: true } | { ok: false; error: string } {
  const s = read();
  const player = s.users.find((u) => u.id === playerId);
  if (!player || player.role !== "client") return { ok: false, error: "Player not found" };
  const newParent = s.users.find((u) => u.id === newParentId);
  if (!newParent) return { ok: false, error: "Target not found" };

  const oldParent = s.users.find((u) => u.id === player.parentId);
  player.parentId = newParentId;
  const now = Date.now();

  // Log transfer event
  s.accountEvents.push({
    id: `ae_${Math.random().toString(36).slice(2, 10)}`,
    playerId: playerId,
    type: "transferred",
    byId: changedById,
    byName: s.users.find((u) => u.id === changedById)?.name ?? "Admin",
    note: `${oldParent?.name ?? "Admin"} → ${newParent.name}`,
    timestamp: now,
  });

  // If new parent is a co-bookie, point commissionTo at them and reset the cutoff
  if (newParent.role === "cobookie") {
    player.commissionTo = newParentId;
    player.commissionAssignedAt = now; // only future bets count for new co-bookie
  } else {
    // Moving back to admin — clear commission routing
    delete player.commissionTo;
    delete player.commissionAssignedAt;
  }

  if (commission !== undefined) {
    const oldRate = player.commission;
    player.commission = commission;
    s.commissionHistory.push({
      id: `cc_${Math.random().toString(36).slice(2, 10)}`,
      userId: playerId,
      userName: player.name,
      userRole: player.role,
      fromRate: oldRate,
      toRate: commission,
      commissionToId: newParent.role === "cobookie" ? newParentId : undefined,
      changedAt: now,
      changedBy: changedById,
    });
  }
  write(s);
  return { ok: true };
}

export function allocateChips(
  fromUserId: string,
  toUserId: string,
  amount: number
): { ok: true } | { ok: false; error: string } {
  if (amount <= 0) return { ok: false, error: "Amount must be positive" };
  const s = read();
  const from = s.users.find((u) => u.id === fromUserId);
  const to = s.users.find((u) => u.id === toUserId);
  if (!from || !to) return { ok: false, error: "User not found" };
  if (from.chips < amount) return { ok: false, error: "Not enough chips" };
  from.chips -= amount;
  to.chips += amount;
  const now = Date.now();
  if (to.role === "client") {
    s.accountEvents.push({ id: `ae_${Math.random().toString(36).slice(2, 10)}`, playerId: to.id, type: "chips_in", amount, byId: from.id, byName: from.name, timestamp: now });
  }
  if (from.role === "client") {
    s.accountEvents.push({ id: `ae_${Math.random().toString(36).slice(2, 10)}`, playerId: from.id, type: "chips_out", amount, byId: to.id, byName: to.name, timestamp: now });
  }
  write(s);
  return { ok: true };
}

export function reclaimChips(
  fromUserId: string,
  toUserId: string,
  amount: number
): { ok: true } | { ok: false; error: string } {
  if (amount <= 0) return { ok: false, error: "Amount must be positive" };
  const s = read();
  const from = s.users.find((u) => u.id === fromUserId);
  const to = s.users.find((u) => u.id === toUserId);
  if (!from || !to) return { ok: false, error: "User not found" };
  if (from.chips < amount) return { ok: false, error: "Not enough chips" };
  from.chips -= amount;
  to.chips += amount;
  const now = Date.now();
  if (to.role === "client") {
    s.accountEvents.push({ id: `ae_${Math.random().toString(36).slice(2, 10)}`, playerId: to.id, type: "chips_in", amount, byId: from.id, byName: from.name, timestamp: now });
  }
  if (from.role === "client") {
    s.accountEvents.push({ id: `ae_${Math.random().toString(36).slice(2, 10)}`, playerId: from.id, type: "chips_out", amount, byId: to.id, byName: to.name, timestamp: now });
  }
  write(s);
  return { ok: true };
}

export function placeBet(
  clientId: string,
  match: { id: string; label: string },
  market: string,
  pick: string,
  odds: number,
  stake: number,
  side: BetSide = "back"
): { ok: true; bet: Bet } | { ok: false; error: string } {
  if (stake <= 0) return { ok: false, error: "Stake must be positive" };
  const s = read();
  const client = s.users.find((u) => u.id === clientId);
  if (!client) return { ok: false, error: "Client not found" };
  if (client.chips < stake) return { ok: false, error: "Insufficient chips" };
  client.chips -= stake;
  const bet: Bet = {
    id: `b_${Math.random().toString(36).slice(2, 10)}`,
    clientId,
    matchId: match.id,
    match: match.label,
    market,
    pick,
    odds,
    stake,
    side,
    status: "pending",
    placedAt: Date.now(),
  };
  s.bets.push(bet);
  write(s);
  return { ok: true, bet };
}

export function resolveBet(betId: string, won: boolean) {
  const s = read();
  const bet = s.bets.find((b) => b.id === betId);
  if (!bet || bet.status !== "pending") return;
  bet.status = won ? "won" : "lost";
  if (won) {
    const client = s.users.find((u) => u.id === bet.clientId);
    if (client) client.chips += Math.round(bet.stake * bet.odds);
  }
  write(s);
}

/**
 * Client self-settle: outcome is drawn from the implied probability (1/odds).
 * Returns the outcome so the UI can show a reveal.
 */
export function settleBet(betId: string): { ok: true; won: boolean; payout: number } | { ok: false; error: string } {
  const s = read();
  const bet = s.bets.find((b) => b.id === betId);
  if (!bet) return { ok: false, error: "Bet not found" };
  if (bet.status !== "pending") return { ok: false, error: "Bet already settled" };

  const impliedProb = 1 / bet.odds;
  const outcomeHappens = Math.random() < impliedProb;
  // Lay bets win when the picked outcome does NOT happen
  const won = bet.side === "lay" ? !outcomeHappens : outcomeHappens;
  bet.status = won ? "won" : "lost";
  const payout = won ? Math.round(bet.stake * bet.odds) : 0;
  if (won) {
    const client = s.users.find((u) => u.id === bet.clientId);
    if (client) client.chips += payout;
  }
  write(s);
  return { ok: true, won, payout };
}

export function totalAllocated(parentId: string): number {
  const s = read();
  return s.users.filter((u) => u.parentId === parentId).reduce((sum, u) => sum + u.chips, 0);
}

export interface Stats {
  totalBets: number;
  won: number;
  lost: number;
  pending: number;
  totalStaked: number;
  totalPayout: number;
  profit: number;
  winRate: number;
  biggestWin: number;
  biggestLoss: number;
}

function emptyStats(): Stats {
  return {
    totalBets: 0,
    won: 0,
    lost: 0,
    pending: 0,
    totalStaked: 0,
    totalPayout: 0,
    profit: 0,
    winRate: 0,
    biggestWin: 0,
    biggestLoss: 0,
  };
}

export function statsForClient(clientId: string, bets: Bet[]): Stats {
  const all = bets.filter((b) => b.clientId === clientId);
  if (all.length === 0) return emptyStats();
  const resolved = all.filter((b) => b.status !== "pending");
  const won = resolved.filter((b) => b.status === "won");
  const lost = resolved.filter((b) => b.status === "lost");
  const totalStaked = resolved.reduce((s, b) => s + b.stake, 0);
  const totalPayout = won.reduce((s, b) => s + Math.round(b.stake * b.odds), 0);
  const profit = totalPayout - totalStaked;
  const biggestWin = won.reduce((m, b) => Math.max(m, Math.round(b.stake * (b.odds - 1))), 0);
  const biggestLoss = lost.reduce((m, b) => Math.max(m, b.stake), 0);
  return {
    totalBets: all.length,
    won: won.length,
    lost: lost.length,
    pending: all.filter((b) => b.status === "pending").length,
    totalStaked,
    totalPayout,
    profit,
    winRate: resolved.length ? (won.length / resolved.length) * 100 : 0,
    biggestWin,
    biggestLoss,
  };
}

export function statsForAdmin(adminId: string, users: User[], bets: Bet[]): Stats {
  const clients = users.filter((u) => u.parentId === adminId);
  const clientIds = new Set(clients.map((c) => c.id));
  const relevant = bets.filter((b) => clientIds.has(b.clientId));
  if (relevant.length === 0) return emptyStats();
  const resolved = relevant.filter((b) => b.status !== "pending");
  const won = resolved.filter((b) => b.status === "won");
  const lost = resolved.filter((b) => b.status === "lost");
  const totalStaked = resolved.reduce((s, b) => s + b.stake, 0);
  const totalPayout = won.reduce((s, b) => s + Math.round(b.stake * b.odds), 0);
  // Admin P&L is the inverse of clients' P&L (house perspective)
  const adminProfit = totalStaked - totalPayout;
  const biggestWin = lost.reduce((m, b) => Math.max(m, b.stake), 0);
  const biggestLoss = won.reduce((m, b) => Math.max(m, Math.round(b.stake * (b.odds - 1))), 0);
  return {
    totalBets: relevant.length,
    won: won.length,
    lost: lost.length,
    pending: relevant.filter((b) => b.status === "pending").length,
    totalStaked,
    totalPayout,
    profit: adminProfit,
    winRate: resolved.length ? (lost.length / resolved.length) * 100 : 0,
    biggestWin,
    biggestLoss,
  };
}

export function statsForOwner(ownerId: string, users: User[], bets: Bet[]): Stats {
  const admins = users.filter((u) => u.role === "admin" && u.parentId === ownerId);
  const adminIds = new Set(admins.map((a) => a.id));
  const allClients = users.filter((u) => u.role === "client" && u.parentId && adminIds.has(u.parentId));
  const clientIds = new Set(allClients.map((c) => c.id));
  const relevant = bets.filter((b) => clientIds.has(b.clientId));
  if (relevant.length === 0) return emptyStats();
  const resolved = relevant.filter((b) => b.status !== "pending");
  const won = resolved.filter((b) => b.status === "won");
  const lost = resolved.filter((b) => b.status === "lost");
  const totalStaked = resolved.reduce((s, b) => s + b.stake, 0);
  const totalPayout = won.reduce((s, b) => s + Math.round(b.stake * b.odds), 0);
  const ownerProfit = totalStaked - totalPayout;
  const biggestWin = lost.reduce((m, b) => Math.max(m, b.stake), 0);
  const biggestLoss = won.reduce((m, b) => Math.max(m, Math.round(b.stake * (b.odds - 1))), 0);
  return {
    totalBets: relevant.length,
    won: won.length,
    lost: lost.length,
    pending: relevant.filter((b) => b.status === "pending").length,
    totalStaked,
    totalPayout,
    profit: ownerProfit,
    winRate: resolved.length ? (lost.length / resolved.length) * 100 : 0,
    biggestWin,
    biggestLoss,
  };
}

export function updateCommission(
  targetUserId: string,
  newRate: number,
  changedById: string
): { ok: true } | { ok: false; error: string } {
  if (newRate < 0 || newRate > 100) return { ok: false, error: "Rate must be 0–100%" };
  const s = read();
  const target = s.users.find((u) => u.id === targetUserId);
  if (!target) return { ok: false, error: "User not found" };
  if (!["cobookie", "client"].includes(target.role)) return { ok: false, error: "Cannot set commission for this role" };
  const change: CommissionChange = {
    id: `cc_${Math.random().toString(36).slice(2, 10)}`,
    userId: targetUserId,
    userName: target.name,
    userRole: target.role,
    fromRate: target.commission,
    toRate: newRate,
    changedAt: Date.now(),
    changedBy: changedById,
  };
  target.commission = newRate;
  s.commissionHistory.push(change);
  write(s);
  return { ok: true };
}

// Assign commission from a specific player's P&L to a co-bookie.
// commissionToId = null removes the commission assignment.
// Only bets placed AFTER this call count toward the new co-bookie's commission.
export function assignPlayerCommission(
  playerId: string,
  rate: number,
  commissionToId: string | null,
  changedById: string
): { ok: true } | { ok: false; error: string } {
  if (rate < 0 || rate > 100) return { ok: false, error: "Rate must be 0–100%" };
  const s = read();
  const player = s.users.find((u) => u.id === playerId);
  if (!player || player.role !== "client") return { ok: false, error: "Player not found" };
  const now = Date.now();
  const targetChanged = commissionToId !== (player.commissionTo ?? null);
  const change: CommissionChange = {
    id: `cc_${Math.random().toString(36).slice(2, 10)}`,
    userId: playerId,
    userName: player.name,
    userRole: player.role,
    fromRate: player.commission,
    toRate: rate,
    commissionToId: commissionToId ?? undefined,
    changedAt: now,
    changedBy: changedById,
  };
  player.commission = rate;
  if (commissionToId) {
    player.commissionTo = commissionToId;
    if (targetChanged) player.commissionAssignedAt = now; // reset cutoff only when target co-bookie changes
  } else {
    delete player.commissionTo;
    delete player.commissionAssignedAt;
  }
  s.commissionHistory.push(change);
  write(s);
  return { ok: true };
}

// Delete a co-bookie: return their chips to admin, move their players back to admin.
export function deleteCobookie(
  cobookieId: string,
  adminId: string
): { ok: true } | { ok: false; error: string } {
  const s = read();
  const cb = s.users.find((u) => u.id === cobookieId && u.role === "cobookie");
  if (!cb) return { ok: false, error: "Co-bookie not found" };
  const admin = s.users.find((u) => u.id === adminId);
  if (!admin) return { ok: false, error: "Admin not found" };

  // Return chips to admin
  admin.chips += cb.chips;

  // Move managed players back to admin and clear their commission routing
  for (const u of s.users) {
    if (u.parentId === cobookieId) {
      u.parentId = adminId;
      if (u.commissionTo === cobookieId) {
        delete u.commissionTo;
        delete u.commissionAssignedAt;
      }
    }
    // Clear commissionTo for admin-direct players pointing at this co-bookie
    if (u.commissionTo === cobookieId && u.parentId !== cobookieId) {
      delete u.commissionTo;
      delete u.commissionAssignedAt;
    }
  }

  s.users = s.users.filter((u) => u.id !== cobookieId);
  write(s);
  return { ok: true };
}

export function getPlayerEvents(playerId: string): AccountEvent[] {
  const s = read();
  return (s.accountEvents ?? []).filter((e) => e.playerId === playerId).sort((a, b) => b.timestamp - a.timestamp);
}

export function getLoginEvents(userId: string): LoginEvent[] {
  const s = read();
  return (s.loginEvents ?? []).filter((e) => e.userId === userId).sort((a, b) => b.timestamp - a.timestamp);
}

export function resetAll() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("lucky007_store_change"));
}

// ── Monday settlement ─────────────────────────────────────────────────────────

// Returns the most recent Monday at 00:00 IST (UTC+5:30) as a UTC timestamp
export function getLastMondayIST(): number {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(Date.now() + istOffset);
  const dayOfWeek = istNow.getUTCDay(); // 0=Sun, 1=Mon … 6=Sat
  const daysSinceMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const lastMonIST = new Date(istNow);
  lastMonIST.setUTCDate(lastMonIST.getUTCDate() - daysSinceMon);
  lastMonIST.setUTCHours(0, 0, 0, 0);
  return lastMonIST.getTime() - istOffset; // back to UTC
}

// Returns the next Monday 00:00 IST as a UTC timestamp
export function getNextMondayIST(): number {
  return getLastMondayIST() + 7 * 24 * 60 * 60 * 1000;
}

// Returns true if today is Monday (IST)
export function isMondayIST(): boolean {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(Date.now() + istOffset);
  return istNow.getUTCDay() === 1;
}

// Settle all pending bets for a client that were placed before last Monday.
// Returns the list of settled bets with their outcomes.
export function autoSettleWeeklyBets(clientId: string): Array<{ bet: Bet; won: boolean; payout: number }> {
  const s = read();
  const cutoff = getLastMondayIST();
  const toSettle = s.bets.filter(
    (b) => b.clientId === clientId && b.status === "pending" && b.placedAt < cutoff
  );
  if (toSettle.length === 0) return [];

  const results: Array<{ bet: Bet; won: boolean; payout: number }> = [];
  for (const bet of toSettle) {
    const impliedProb = 1 / bet.odds;
    const outcomeHappens = Math.random() < impliedProb;
    const won = bet.side === "lay" ? !outcomeHappens : outcomeHappens;
    bet.status = won ? "won" : "lost";
    const payout = won ? Math.round(bet.stake * bet.odds) : 0;
    if (won) {
      const client = s.users.find((u) => u.id === bet.clientId);
      if (client) client.chips += payout;
    }
    results.push({ bet, won, payout });
  }
  write(s);
  return results;
}
