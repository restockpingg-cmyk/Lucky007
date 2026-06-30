export type Sport = "cricket" | "football" | "tennis";

export interface MarketOption {
  id: string;
  label: string;
  sublabel?: string;
  odds: number;
}

export interface Market {
  id: string;
  label: string;
  description?: string;
  options: MarketOption[];
  isFancy?: boolean;
}

export interface Match {
  id: string;
  sport: Sport;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  homeScore?: number;
  awayScore?: number;
  homeWickets?: number;
  awayWickets?: number;
  homeOvers?: string;
  awayOvers?: string;
  minute?: number;
  status: "live" | "upcoming";
  startsIn?: string;
  markets: Market[];
}

// ── helpers ──────────────────────────────────────────────────────────────────

function matchWinner(home: string, away: string, oH: number, oA: number, oD?: number): Market {
  const opts: MarketOption[] = [{ id: "home", label: home, sublabel: "Home", odds: oH }];
  if (oD !== undefined) opts.push({ id: "draw", label: "Draw", odds: oD });
  opts.push({ id: "away", label: away, sublabel: "Away", odds: oA });
  return { id: "winner", label: "Match Winner", options: opts };
}

function fancy(id: string, label: string, desc: string, opts: MarketOption[]): Market {
  return { id, label, description: desc, options: opts, isFancy: true };
}

// ── cricket fancy markets ─────────────────────────────────────────────────────

function cricketFancyMarkets(home: string, away: string, batLine = 30.5, runLine = 310.5): Market[] {
  return [
    fancy("next_ball", "Next Ball", "What happens on the very next delivery", [
      { id: "dot", label: "Dot ball", odds: 1.70 },
      { id: "single_two", label: "1-3 runs", odds: 2.10 },
      { id: "four", label: "Four 🔵", sublabel: "Boundary", odds: 5.50 },
      { id: "six", label: "Six 🟣", sublabel: "Maximum", odds: 9.00 },
      { id: "wicket", label: "Wicket 🔴", sublabel: "Out!", odds: 7.50 },
    ]),
    fancy("next_over", "Next Over Runs", "Runs in the very next over", [
      { id: "0_3", label: "0-3 runs", odds: 2.50 },
      { id: "4_7", label: "4-7 runs", odds: 2.20 },
      { id: "8_12", label: "8-12 runs", odds: 2.80 },
      { id: "13_plus", label: "13+ runs 🔥", odds: 5.00 },
    ]),
    fancy("powerplay", "Powerplay Runs (1-6 ov)", "Total runs in the powerplay", [
      { id: "over_55", label: "Over 55.5", sublabel: "More", odds: 1.85 },
      { id: "under_55", label: "Under 55.5", sublabel: "Less", odds: 1.90 },
    ]),
    fancy("death_overs", "Death Overs (17-20)", "Runs in the final 4 overs", [
      { id: "over_60", label: "Over 60.5", odds: 1.88 },
      { id: "under_60", label: "Under 60.5", odds: 1.90 },
    ]),
    fancy("session_6", "Session: 6 over runs", "Runs in any 6 over block", [
      { id: "over", label: "Over 52.5", odds: 1.85 },
      { id: "under", label: "Under 52.5", odds: 1.90 },
    ]),
    fancy("fall_wicket", "Fall of Next Wicket", "Score when next wicket falls", [
      { id: "under_10", label: "Under 10", odds: 2.40 },
      { id: "10_25", label: "10-25", odds: 2.10 },
      { id: "26_50", label: "26-50", odds: 2.80 },
      { id: "51_plus", label: "51+ runs", odds: 3.50 },
    ]),
    fancy("wicket_this_over", "Wicket This Over?", "Will a wicket fall in the current over", [
      { id: "yes", label: "Yes 🔴", odds: 3.80 },
      { id: "no", label: "No", odds: 1.28 },
    ]),
    fancy("partnership", "Current Partnership", "Runs before this partnership ends", [
      { id: "under_20", label: "Under 20", odds: 2.10 },
      { id: "20_40", label: "20-40", odds: 1.95 },
      { id: "41_70", label: "41-70", odds: 2.60 },
      { id: "71_plus", label: "71+ 💥", odds: 4.00 },
    ]),
    fancy("innings_runs", "Innings Total", "Total runs in the current innings", [
      { id: "over", label: `Over ${Math.round(runLine / 1.7)}`, odds: 1.95 },
      { id: "under", label: `Under ${Math.round(runLine / 1.7)}`, odds: 1.85 },
    ]),
    fancy("total_runs", "Total Match Runs", "Combined runs in both innings", [
      { id: "over", label: `Over ${runLine}`, odds: 1.92 },
      { id: "under", label: `Under ${runLine}`, odds: 1.88 },
    ]),
    fancy("boundaries", "Total Boundaries (4s)", "Total fours in the match", [
      { id: "over_12", label: "Over 12.5", odds: 1.90 },
      { id: "under_12", label: "Under 12.5", odds: 1.90 },
    ]),
    fancy("sixes", "Total Sixes 💥", "Total maximums hit", [
      { id: "over_6", label: "Over 6.5", odds: 1.85 },
      { id: "under_6", label: "Under 6.5", odds: 1.95 },
    ]),
    fancy("top_bat_home", `${home.split(" ").slice(-1)[0]} Top Bat`, `Top batsman from ${home}`, [
      { id: "over_30", label: `Over ${batLine}`, odds: 1.90 },
      { id: "under_30", label: `Under ${batLine}`, odds: 1.90 },
    ]),
    fancy("top_bat_away", `${away.split(" ").slice(-1)[0]} Top Bat`, `Top batsman from ${away}`, [
      { id: "over_28", label: "Over 28.5", odds: 1.90 },
      { id: "under_28", label: "Under 28.5", odds: 1.90 },
    ]),
    fancy("man_of_match", "Man of the Match", "Who wins the award", [
      { id: "bat", label: "A Batsman", odds: 1.70 },
      { id: "bowl", label: "A Bowler", odds: 2.30 },
      { id: "allrounder", label: "All-rounder", odds: 4.50 },
    ]),
  ];
}

// ── football markets ──────────────────────────────────────────────────────────

function footballMarkets(home: string, away: string, oH: number, oA: number, oD?: number): Market[] {
  const winnerOpts: MarketOption[] = [{ id: "home", label: home, sublabel: "Home", odds: oH }];
  if (oD !== undefined) winnerOpts.push({ id: "draw", label: "Draw", odds: oD });
  winnerOpts.push({ id: "away", label: away, sublabel: "Away", odds: oA });
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
    fancy("first_goal", "First Goal Time", "When will the first goal be scored", [
      { id: "0_15", label: "0-15 min", odds: 4.20 },
      { id: "16_30", label: "16-30 min", odds: 3.80 },
      { id: "31_45", label: "31-45 min", odds: 3.60 },
      { id: "no_goal", label: "No Goal HT", odds: 2.10 },
    ]),
  ];
}

// ── static match list ─────────────────────────────────────────────────────────

export const matches: Match[] = [
  // ── CRICKET (IPL + India) ──
  {
    id: "m1",
    sport: "cricket",
    league: "IPL 2026",
    homeTeam: "Mumbai Indians",
    awayTeam: "Chennai Super Kings",
    homeFlag: "🔵",
    awayFlag: "🟡",
    homeScore: 142,
    homeWickets: 4,
    homeOvers: "16.2",
    minute: 18,
    status: "live",
    markets: [
      matchWinner("Mumbai Indians", "Chennai Super Kings", 1.75, 2.05),
      ...cricketFancyMarkets("Mumbai Indians", "Chennai Super Kings", 32.5, 310.5),
    ],
  },
  {
    id: "m2",
    sport: "cricket",
    league: "IPL 2026",
    homeTeam: "Royal Challengers",
    awayTeam: "Kolkata Knight Riders",
    homeFlag: "🔴",
    awayFlag: "🟣",
    homeScore: 78,
    homeWickets: 2,
    homeOvers: "9.4",
    minute: 10,
    status: "live",
    markets: [
      matchWinner("Royal Challengers", "Kolkata Knight Riders", 2.15, 1.75),
      ...cricketFancyMarkets("Royal Challengers", "KKR", 28.5, 295.5),
    ],
  },
  {
    id: "m3",
    sport: "cricket",
    league: "IPL 2026",
    homeTeam: "Rajasthan Royals",
    awayTeam: "Lucknow Super Giants",
    homeFlag: "🩷",
    awayFlag: "🔵",
    homeScore: 192,
    homeWickets: 8,
    awayScore: 178,
    awayWickets: 6,
    awayOvers: "17.3",
    minute: 18,
    status: "live",
    markets: [
      matchWinner("Rajasthan Royals", "Lucknow Super Giants", 1.45, 2.65),
      ...cricketFancyMarkets("Rajasthan Royals", "Lucknow", 31.5, 370.5),
    ],
  },
  {
    id: "m4",
    sport: "cricket",
    league: "India vs Pakistan T20",
    homeTeam: "India",
    awayTeam: "Pakistan",
    homeFlag: "🇮🇳",
    awayFlag: "🇵🇰",
    status: "upcoming",
    startsIn: "1h 30m",
    markets: [
      matchWinner("India", "Pakistan", 1.55, 2.45),
      ...cricketFancyMarkets("India", "Pakistan", 35.5, 320.5),
    ],
  },
  {
    id: "m5",
    sport: "cricket",
    league: "India vs England ODI",
    homeTeam: "India",
    awayTeam: "England",
    homeFlag: "🇮🇳",
    awayFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    homeScore: 234,
    homeWickets: 5,
    homeOvers: "38.2",
    minute: 39,
    status: "live",
    markets: [
      matchWinner("India", "England", 1.70, 2.10),
      ...cricketFancyMarkets("India", "England", 38.5, 540.5),
    ],
  },
  {
    id: "m6",
    sport: "cricket",
    league: "IPL 2026",
    homeTeam: "Gujarat Titans",
    awayTeam: "Sunrisers Hyderabad",
    homeFlag: "🔷",
    awayFlag: "🟠",
    status: "upcoming",
    startsIn: "3h 45m",
    markets: [
      matchWinner("Gujarat Titans", "Sunrisers Hyderabad", 1.90, 1.95),
      ...cricketFancyMarkets("Gujarat Titans", "Sunrisers", 29.5, 305.5),
    ],
  },
  {
    id: "m7",
    sport: "cricket",
    league: "IPL 2026",
    homeTeam: "Delhi Capitals",
    awayTeam: "Punjab Kings",
    homeFlag: "🔵",
    awayFlag: "🔴",
    status: "upcoming",
    startsIn: "6h 00m",
    markets: [
      matchWinner("Delhi Capitals", "Punjab Kings", 2.05, 1.85),
      ...cricketFancyMarkets("Delhi Capitals", "Punjab Kings", 27.5, 300.5),
    ],
  },

  // ── FOOTBALL ──
  {
    id: "m8",
    sport: "football",
    league: "Premier League",
    homeTeam: "Man City",
    awayTeam: "Arsenal",
    homeFlag: "🔵",
    awayFlag: "🔴",
    homeScore: 1,
    awayScore: 1,
    minute: 67,
    status: "live",
    markets: footballMarkets("Man City", "Arsenal", 2.10, 3.20, 3.40),
  },
  {
    id: "m9",
    sport: "football",
    league: "La Liga",
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    homeFlag: "⚪",
    awayFlag: "🔵",
    status: "upcoming",
    startsIn: "2h 15m",
    markets: footballMarkets("Real Madrid", "Barcelona", 1.95, 3.80, 3.50),
  },
  {
    id: "m10",
    sport: "football",
    league: "Indian Super League",
    homeTeam: "Mumbai City FC",
    awayTeam: "Bengaluru FC",
    homeFlag: "🔵",
    awayFlag: "🔵",
    status: "upcoming",
    startsIn: "5h 00m",
    markets: footballMarkets("Mumbai City FC", "Bengaluru FC", 1.80, 3.50, 3.20),
  },

  // ── TENNIS ──
  {
    id: "m11",
    sport: "tennis",
    league: "Wimbledon 2026",
    homeTeam: "Djokovic",
    awayTeam: "Alcaraz",
    homeFlag: "🇷🇸",
    awayFlag: "🇪🇸",
    homeScore: 1,
    awayScore: 2,
    minute: 3,
    status: "live",
    markets: [matchWinner("Djokovic", "Alcaraz", 2.30, 1.62)],
  },
  {
    id: "m12",
    sport: "tennis",
    league: "French Open 2026",
    homeTeam: "Sinner",
    awayTeam: "Medvedev",
    homeFlag: "🇮🇹",
    awayFlag: "🇷🇺",
    status: "upcoming",
    startsIn: "4h 00m",
    markets: [matchWinner("Sinner", "Medvedev", 1.55, 2.45)],
  },
];

export const sportLabels: Record<Sport, { label: string; icon: string }> = {
  cricket: { label: "Cricket", icon: "🏏" },
  football: { label: "Football", icon: "⚽" },
  tennis: { label: "Tennis", icon: "🎾" },
};

export function primaryOdds(m: Match) {
  const winner = m.markets.find((mk) => mk.id === "winner");
  if (!winner) return null;
  const home = winner.options.find((o) => o.id === "home");
  const draw = winner.options.find((o) => o.id === "draw");
  const away = winner.options.find((o) => o.id === "away");
  return {
    home: home?.odds ?? 0,
    draw: draw?.odds,
    away: away?.odds ?? 0,
  };
}
