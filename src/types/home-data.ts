/** External data may be unavailable; null never implies a zero score or rank. */
export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  cover_image_url: string | null;
  /** ISO 8601 UTC, when supplied by the publisher. */
  published_at: string | null;
  source_url: string;
  category_tag: 'Campeonatos' | 'Atualizações';
  relative_time?: string;
  source_label?: string;
  tags?: string[];
  comments_count?: number;
  shares_count?: number;
}

export interface MatchTeam {
  /** Map wins in the series, normalized to zero when omitted. */
  seriesScore: number;
  /** Rounds in the active map, independent of series wins. */
  mapScore: number;
  name: string;
  logo_url: string | null;
  rank: number | null;
  code?: string;
  flag?: string;
  rank_label?: string;
  code_color_class?: string;
}

export interface MatchItem {
  source_url?: string;
  id: string;
  event_name: string;
  status: 'live' | 'upcoming' | 'finished';
  match_format: string | null;
  series_score: string | null;
  /** Current map rounds, separate from series map wins. Null when absent upstream. */
  team1_score?: number | null;
  team2_score?: number | null;
  team1: MatchTeam;
  team2: MatchTeam;
  current_map: {
    number?: number;
    name: string;
    team1_rounds: number | null;
    team2_rounds: number | null;
  } | null;
  /** ISO 8601 UTC; null for a start time still to be announced. */
  scheduled_at: string | null;
  scheduled_label?: string;
  breakdown_text?: string;
  breakdown_icon?: string;
  veto_forecast?: string;
}

export interface FeaturedTeam {
  name: string;
  country: string;
  rank_label: string;
  win_rate: string;
  tactical_side: string;
  side_type: 't' | 'ct';
  logo_svg_type?: 'furia' | 'navi';
}

export interface FeaturedMap {
  number: number;
  name: string;
  status: 'FINALIZADO' | 'AO VIVO' | 'SE NECESSÁRIO';
  score: string;
  pick_info: string;
  sub_info: string;
  is_active?: boolean;
}

export interface FeaturedMVP {
  nickname: string;
  title: string;
  frags: string;
  kd: string;
  adr: string;
  rating: string;
}

export interface FeaturedMatchData {
  title?: string;
  status_label?: string;
  team1: FeaturedTeam;
  team2: FeaturedTeam;
  series_format?: string;
  team1_series_score: number;
  team2_series_score: number;
  is_live: boolean;
  maps: FeaturedMap[];
  mvp: FeaturedMVP;
  active_map_telemetry?: {
    title: string;
    subtitle: string;
    telemetry_label: string;
    progress_label: string;
  };
}

export const VALVE_REGIONS = ['SA', 'EU', 'NA', 'ASIA'] as const;
export type ValveRegion = (typeof VALVE_REGIONS)[number];

export interface ValveStandingItem {
  rank: number;
  code: string;
  name: string;
  tier: string;
  points: number;
  change: string | number;
  team_name?: string;
  region?: ValveRegion;
  change_type: 'up' | 'down' | 'neutral';
  code_color?: string;
}
