import { NextResponse } from "next/server";

const API_BASE = "https://api.the-odds-api.com/v4/sports";

type Sport =
  | "football"
  | "cricket"
  | "basketball"
  | "tennis"
  | "baseball"
  | "hockey"
  | "americanfootball"
  | "rugby"
  | "aussierules"
  | "mma"
  | "boxing"
  | "golf"
  | "other";

interface OddsApiSport {
  key: string;
  group: string;
  title: string;
  description: string;
  active: boolean;
  has_outrights: boolean;
}

interface OddsApiOutcome { name: string; price: number; }
interface OddsApiMarket { key: string; outcomes: OddsApiOutcome[]; }
interface OddsApiBookmaker { key: string; title: string; markets: OddsApiMarket[]; }
interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

interface LiveMatch {
  id: string;
  sport: Sport;
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

function sportFromKey(key: string): Sport {
  if (key.startsWith("soccer_")) return "football";
  if (key.startsWith("cricket_")) return "cricket";
  if (key.startsWith("basketball_")) return "basketball";
  if (key.startsWith("tennis_")) return "tennis";
  if (key.startsWith("baseball_")) return "baseball";
  if (key.startsWith("icehockey_") || key.startsWith("hockey_")) return "hockey";
  if (key.startsWith("americanfootball_")) return "americanfootball";
  if (key.startsWith("rugbyleague_") || key.startsWith("rugbyunion_")) return "rugby";
  if (key.startsWith("aussierules_")) return "aussierules";
  if (key.startsWith("mma_")) return "mma";
  if (key.startsWith("boxing_")) return "boxing";
  if (key.startsWith("golf_")) return "golf";
  return "other";
}

function formatTimeUntil(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  if (diffMs < 0) return "now";
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin}m`;
  const hours = Math.floor(diffMin / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  const mins = diffMin % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function mapEvent(ev: OddsApiEvent): LiveMatch | null {
  const bk = ev.bookmakers[0];
  const market = bk?.markets.find((m) => m.key === "h2h");
  if (!market) return null;
  const homeOutcome = market.outcomes.find((o) => o.name === ev.home_team);
  const awayOutcome = market.outcomes.find((o) => o.name === ev.away_team);
  const drawOutcome = market.outcomes.find((o) => o.name === "Draw");
  if (!homeOutcome || !awayOutcome) return null;

  const commenceTime = new Date(ev.commence_time);
  const now = new Date();
  const isLive = commenceTime <= now;
  const elapsedMin = isLive ? Math.floor((now.getTime() - commenceTime.getTime()) / 60_000) : 0;
  const sport = sportFromKey(ev.sport_key);

  const shouldShowMinute =
    isLive &&
    elapsedMin < 240 &&
    sport !== "tennis" &&
    !ev.sport_key.includes("test_match");

  return {
    id: `odds_${ev.id}`,
    sport,
    league: ev.sport_title,
    homeTeam: ev.home_team,
    awayTeam: ev.away_team,
    homeOdds: homeOutcome.price,
    awayOdds: awayOutcome.price,
    drawOdds: drawOutcome?.price,
    status: isLive ? "live" : "upcoming",
    minute: shouldShowMinute ? elapsedMin : undefined,
    startsIn: !isLive ? formatTimeUntil(commenceTime) : undefined,
    bookmaker: bk?.title,
  };
}

async function fetchSportsList(apiKey: string): Promise<OddsApiSport[]> {
  try {
    // The /sports endpoint is free (doesn't count against quota).
    const res = await fetch(`${API_BASE}/?apiKey=${apiKey}&all=false`, {
      next: { revalidate: 86400 }, // refresh sports list daily
    });
    if (!res.ok) return [];
    return (await res.json()) as OddsApiSport[];
  } catch {
    return [];
  }
}

async function fetchSport(
  sport: string,
  apiKey: string,
  force: boolean
): Promise<{ events: OddsApiEvent[]; remaining?: number; used?: number }> {
  try {
    const url = `${API_BASE}/${sport}/odds?apiKey=${apiKey}&regions=eu&markets=h2h&oddsFormat=decimal`;
    // 48h background cache. With ~30 sports = ~15 credits/day = ~450/month.
    const fetchOpts: RequestInit = force
      ? { cache: "no-store" }
      : { next: { revalidate: 172800 } };
    const res = await fetch(url, fetchOpts);
    if (!res.ok) return { events: [] };
    const events = (await res.json()) as OddsApiEvent[];
    const remaining = parseInt(res.headers.get("x-requests-remaining") ?? "");
    const used = parseInt(res.headers.get("x-requests-used") ?? "");
    return {
      events,
      remaining: Number.isFinite(remaining) ? remaining : undefined,
      used: Number.isFinite(used) ? used : undefined,
    };
  } catch {
    return { events: [] };
  }
}

function isRelevantSport(sport: OddsApiSport): boolean {
  // Skip outright/future bets — they're "league winner" predictions, not match bets
  if (sport.has_outrights) return false;
  if (sport.key.endsWith("_winner")) return false;
  if (sport.key.startsWith("politics_")) return false;
  return true;
}

export async function GET(request: Request) {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      matches: [],
      source: null,
      error: "ODDS_API_KEY not configured",
      fetchedAt: Date.now(),
    });
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  // Discover what's currently in season
  const allSports = await fetchSportsList(apiKey);
  const activeSports = allSports.filter(isRelevantSport).map((s) => s.key);

  // Cap at 30 sports to keep quota under control
  const sportsToFetch = activeSports.slice(0, 30);

  const results = await Promise.allSettled(sportsToFetch.map((s) => fetchSport(s, apiKey, force)));

  let remaining: number | undefined;
  let used: number | undefined;
  const events: OddsApiEvent[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    events.push(...r.value.events);
    if (r.value.remaining !== undefined) remaining = r.value.remaining;
    if (r.value.used !== undefined) used = r.value.used;
  }

  const matches = events
    .map(mapEvent)
    .filter((m): m is LiveMatch => m !== null)
    .sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1;
      if (a.status !== "live" && b.status === "live") return 1;
      return 0;
    })
    .slice(0, 200);

  return NextResponse.json({
    matches,
    source: matches.length > 0 ? "The Odds API" : null,
    quotaRemaining: remaining,
    quotaUsed: used,
    sportsScanned: sportsToFetch.length,
    fetchedAt: Date.now(),
    cached: !force,
  });
}
