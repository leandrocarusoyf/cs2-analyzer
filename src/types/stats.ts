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
}

export interface PlayerPerformanceResult {
  steamId: string;
  nickname: string;
  team: string;
  matchesCount: number;
  totalRounds?: number;
  currentRating: number;
  adr: number;
  kd: number;
  kpr: number;
  dpr: number;
  kastPct: number;
  ttd: number | null;
  ttk: number | null;
  history: PlayerPerformanceHistoryItem[];
  telemetry: RecentMatchTelemetry[];
  roles?: {
    ct?: string | null;
    t?: string | null;
    primary?: string | null;
  };
  ctRoles?: Array<{
    id: string;
    side: 'ct' | 't';
    role: string;
    map: string;
    hltv: number;
    adr: number;
    kd: number;
    kpr: number;
    rounds: number;
  }>;
  tRoles?: Array<{
    id: string;
    side: 'ct' | 't';
    role: string;
    map: string;
    hltv: number;
    adr: number;
    kd: number;
    kpr: number;
    rounds: number;
  }>;
  advancedStats?: PlayerAdvancedStatsRow | null;
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

export interface PlayerAdvancedStatsRow {
  match_id: string;
  steamid: string;
  hltv_rating: number | null;
  adr: number | null;
  kast: number | null;
  impact: number | null;
  hs_percent: number | null;
  hit_head_pct: number | null;
  hit_chest_pct: number | null;
  hit_stomach_pct: number | null;
  hit_limbs_pct: number | null;
  reaction_time_ms: number | null;
  headlock_offset: number | null;
  first_5_bullets_pct: number | null;
  prefire_pct: number | null;
  score_opening: number | null;
  score_trade: number | null;
  score_utility: number | null;
  score_flash: number | null;
  score_clutch: number | null;
  he_damage?: number | null;
}

export interface MatchDuelRow {
  id: string;
  match_id: string;
  round_number: number;
  round_time: string | null;
  winner_steamid: string;
  loser_steamid: string;
  winner_weapon: string | null;
  loser_weapon: string | null;
  winner_hp_remaining: number | null;
  map_zone: string | null;
  is_opening: boolean;
  is_trade: boolean;
  is_clutch: boolean;
  duel_tag: string | null;
}

export interface MatchInspectFilters {
  roundNumber?: number | null;
  outcome?: 'win' | 'loss' | 'all' | null;
  isOpening?: boolean | null;
  isTrade?: boolean | null;
  isClutch?: boolean | null;
  mapZone?: string | null;
  weapon?: string | null;
  duelTag?: string | null;
}

export interface PlayerMatchInspectPayload {
  matchId: string;
  steamid: string;
  player_advanced_stats: PlayerAdvancedStatsRow;
  advancedStats: PlayerAdvancedStatsRow;
  match_duels: MatchDuelRow[];
  duels: MatchDuelRow[];
}


