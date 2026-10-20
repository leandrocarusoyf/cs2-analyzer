export interface RecentMatchMetricsBreakdown {
  overall: number;
  ct: number;
  t: number;
}

export interface RecentMatchTelemetry {
  matchId: string;
  mapName: string;
  opponentTeam: string;
  opponentSlug?: string;
  opponentLogoUrl: string;
  date: string;
  teamScore?: number;
  opponentScore?: number;
  score?: string;
  result?: 'W' | 'L';
  metrics: {
    hltv: RecentMatchMetricsBreakdown;
    adr: RecentMatchMetricsBreakdown;
    kd: RecentMatchMetricsBreakdown;
    kpr: RecentMatchMetricsBreakdown;
    udr: RecentMatchMetricsBreakdown;
    kast: RecentMatchMetricsBreakdown;
  };
}

export interface PlayerPerformanceHistoryItem {
  matchId: string;
  mapName: string;
  date: string;
  opponent: string;
  score: string;
  result: 'W' | 'L';
  rating: number;
  adr: number;
  kills: number;
  deaths: number;
  ttd: number | null;
  ttk: number | null;
  fsp: number | null;
}

export interface PlayerPerformanceResult {
  steamId: string;
  nickname: string;
  team: string;
  matchesCount: number;
  currentRating: number;
  adr: number;
  kd: number;
  kpr: number;
  dpr: number;
  kastPct: number;
  ttd: number | null;
  ttk: number | null;
  fsp: number | null;
  history: PlayerPerformanceHistoryItem[];
  telemetry: RecentMatchTelemetry[];
}

export interface DbPlayerStat {
  id?: string;
  match_id: string;
  map_id?: string | null;
  player_steamid: string;
  nickname: string;
  team: string;
  rating: number | null;
  adr: number | null;
  kast: number | null;
  kills: number;
  deaths: number;
  assists: number;
  ttd: number | null;
  ttk: number | null;
  fsp: number | null;
  metrics_json?: Record<string, any> | null;
}

export interface MatchMapDetail {
  id: string;
  map_name: string;
  rounds_t1: number;
  rounds_t2: number;
  duration?: number;
  pick_type?: string | null;
  pick_team?: string | null;
}

export interface MatchWithDetails {
  id: string;
  match_date: Date | string;
  team1: string;
  team2: string;
  format: string;
  score_t1: number;
  score_t2: number;
  winner: string | null;
  replay_path: string | null;
  demo_hash: string | null;
  created_at?: Date | string;
  map_id?: string | null;
  map_name?: string | null;
  rounds_t1?: number;
  rounds_t2?: number;
  duration?: number;
  rounds_count?: number;
  event_name?: string | null;
  bans?: Array<{ team: string; maps: string[] }> | null;
  maps?: MatchMapDetail[];
  players: DbPlayerStat[];
}

