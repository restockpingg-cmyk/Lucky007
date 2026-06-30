"use client";

import { useEffect, useState } from "react";
import { sportLabels, matches as staticMatches, type Match, type Sport, type Market, type MarketOption } from "./data";

const ALLOWED_SPORTS = new Set<string>(["cricket", "football", "tennis"]);

interface LiveApiMatch {
  id: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeOdds: number;
  awayOdds: number;
  drawOdds?: number;
  status: "live" | "upcoming";
  minute?: number;
  startsIn?: string;
  bookmaker?: string;
}

interface LiveApiResponse {
  matches: LiveApiMatch[];
  source: string | null;
  fetchedAt: number;
  quotaRemaining?: number;
  quotaUsed?: number;
  cached?: boolean;
}

function flagFor(sport: Sport): string {
  return sportLabels[sport]?.icon ?? "🏆";
}

function buildCricketMarkets(homeTeam: string, awayTeam: string, oH: number, oA: number): Market[] {
  return [
    {
      id: "winner",
      label: "Match Winner",
      options: [
        { id: "home", label: homeTeam, sublabel: "Home", odds: oH },
        { id: "away", label: awayTeam, sublabel: "Away", odds: oA },
      ],
    },
    {
      id: "next_ball",
      label: "Next Ball",
      description: "What happens on the very next ball",
      isFancy: true,
      options: [
        { id: "dot", label: "Dot ball", odds: 1.70 },
        { id: "single_two", label: "1-3 runs", odds: 2.10 },
        { id: "four", label: "Four 🔵", sublabel: "Boundary", odds: 5.50 },
        { id: "six", label: "Six 🟣", sublabel: "Maximum", odds: 9.00 },
        { id: "wicket", label: "Wicket 🔴", sublabel: "Out!", odds: 7.50 },
      ],
    },
    {
      id: "next_over",
      label: "Next Over Runs",
      description: "Runs in the very next over",
      isFancy: true,
      options: [
        { id: "0_3", label: "0-3 runs", odds: 2.50 },
        { id: "4_7", label: "4-7 runs", odds: 2.20 },
        { id: "8_12", label: "8-12 runs", odds: 2.80 },
        { id: "13_plus", label: "13+ runs 🔥", odds: 5.00 },
      ],
    },
    {
      id: "powerplay",
      label: "Powerplay Runs (1-6 ov)",
      isFancy: true,
      options: [
        { id: "over_55", label: "Over 55.5", sublabel: "More", odds: 1.85 },
        { id: "under_55", label: "Under 55.5", sublabel: "Less", odds: 1.90 },
      ],
    },
    {
      id: "session_6",
      label: "Session: 6 over runs",
      isFancy: true,
      options: [
        { id: "over", label: "Over 52.5", odds: 1.85 },
        { id: "under", label: "Under 52.5", odds: 1.90 },
      ],
    },
    {
      id: "fall_wicket",
      label: "Fall of Next Wicket",
      description: "Score when next wicket falls",
      isFancy: true,
      options: [
        { id: "under_10", label: "Under 10", odds: 2.40 },
        { id: "10_25", label: "10-25", odds: 2.10 },
        { id: "26_50", label: "26-50", odds: 2.80 },
        { id: "51_plus", label: "51+ runs", odds: 3.50 },
      ],
    },
    {
      id: "total_runs",
      label: "Total Match Runs",
      isFancy: true,
      options: [
        { id: "over", label: "Over 310.5", odds: 1.92 },
        { id: "under", label: "Under 310.5", odds: 1.88 },
      ],
    },
    {
      id: "sixes",
      label: "Total Sixes 💥",
      isFancy: true,
      options: [
        { id: "over_6", label: "Over 6.5", odds: 1.85 },
        { id: "under_6", label: "Under 6.5", odds: 1.95 },
      ],
    },
  ];
}

function buildFootballMarkets(homeTeam: string, awayTeam: string, oH: number, oA: number, oD?: number): Market[] {
  const winnerOpts: MarketOption[] = [{ id: "home", label: homeTeam, sublabel: "Home", odds: oH }];
  if (oD !== undefined) winnerOpts.push({ id: "draw", label: "Draw", odds: oD });
  winnerOpts.push({ id: "away", label: awayTeam, sublabel: "Away", odds: oA });
  return [
    { id: "winner", label: "Match Winner", options: winnerOpts },
    {
      id: "total_goals",
      label: "Total Goals",
      options: [
        { id: "over", label: "Over 2.5", odds: 1.85 },
        { id: "under", label: "Under 2.5", odds: 1.95 },
      ],
    },
    {
      id: "btts",
      label: "Both Teams to Score",
      options: [
        { id: "yes", label: "Yes", odds: 1.75 },
        { id: "no", label: "No", odds: 2.05 },
      ],
    },
  ];
}

function buildTennisMarkets(homeTeam: string, awayTeam: string, oH: number, oA: number): Market[] {
  return [
    {
      id: "winner",
      label: "Match Winner",
      options: [
        { id: "home", label: homeTeam, sublabel: "Home", odds: oH },
        { id: "away", label: awayTeam, sublabel: "Away", odds: oA },
      ],
    },
  ];
}

function mapToMatch(m: LiveApiMatch): Match | null {
  if (!ALLOWED_SPORTS.has(m.sport)) return null;
  const sport = m.sport as Sport;
  let markets: Market[];
  if (sport === "cricket") {
    markets = buildCricketMarkets(m.homeTeam, m.awayTeam, m.homeOdds, m.awayOdds);
  } else if (sport === "football") {
    markets = buildFootballMarkets(m.homeTeam, m.awayTeam, m.homeOdds, m.awayOdds, m.drawOdds);
  } else {
    markets = buildTennisMarkets(m.homeTeam, m.awayTeam, m.homeOdds, m.awayOdds);
  }
  return {
    id: m.id,
    sport,
    league: m.league,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeFlag: flagFor(sport),
    awayFlag: flagFor(sport),
    minute: m.minute,
    status: m.status,
    startsIn: m.startsIn,
    markets,
  };
}

interface LiveMatchesData {
  matches: Match[];
  source: string | null;
  loading: boolean;
  refreshing: boolean;
  bookmaker?: string;
  fetchedAt?: number;
  quotaRemaining?: number;
  quotaUsed?: number;
  isDemoData: boolean;
  refresh: () => Promise<void>;
}

export function useLiveMatches(): LiveMatchesData {
  const [state, setState] = useState<Omit<LiveMatchesData, "refresh">>({
    matches: [],
    source: null,
    loading: true,
    refreshing: false,
    isDemoData: false,
  });

  const load = async (force: boolean) => {
    setState((prev) => ({ ...prev, refreshing: force, loading: !force && prev.matches.length === 0 }));
    try {
      const res = await fetch(`/api/live${force ? "?force=1" : ""}`);
      if (!res.ok) throw new Error();
      const json: LiveApiResponse = await res.json();
      const liveMatches = json.matches.map(mapToMatch).filter((m): m is Match => m !== null);
      setState({
        matches: liveMatches,
        source: json.source,
        loading: false,
        refreshing: false,
        bookmaker: json.matches[0]?.bookmaker,
        fetchedAt: json.fetchedAt,
        quotaRemaining: json.quotaRemaining,
        quotaUsed: json.quotaUsed,
        isDemoData: false,
      });
    } catch {
      setState({
        matches: staticMatches,
        source: "demo",
        loading: false,
        refreshing: false,
        isDemoData: true,
      });
    }
  };

  useEffect(() => {
    let cancelled = false;
    const runOnce = async () => {
      if (cancelled) return;
      await load(false);
    };
    runOnce();
    const interval = setInterval(runOnce, 5 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, refresh: () => load(true) };
}
