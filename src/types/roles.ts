export type RoleFilterType =
  | 'ALL'
  | 'CT ALLROUND'
  | 'ANCHOR'
  | 'ROTATION'
  | 'T ALLROUND'
  | 'LURKER'
  | 'HALF LURKER'
  | 'All'
  | 'CT Allround'
  | 'Anchor'
  | 'Rotation'
  | 'T Allround'
  | 'Lurker'
  | 'Half Lurker';

export interface RadarAxisPoint {
  axis: string;
  rawValue: number;
  normalizedPct: number;
  formattedValue: string;
  benchmarkValue?: number;
}

export interface RoleComparisonMetric {
  id: 'hltv' | 'adr' | 'kd' | 'kpr' | 'kast';
  label: string;
  playerValue: string;
  comparisonValue: string;
  comparisonLabel?: string;
}

export interface RoleComparisonDTO {
  comparisonPlayerName: string;
  metrics: RoleComparisonMetric[];
}

export interface RoleTableRow {
  id: string;
  side: 'ct' | 't';
  role: string;
  map: string;
  hltv: number;
  adr: number;
  kd: number;
  kpr: number;
  rounds: number;
}

export type RoleDetailRow = RoleTableRow;

export interface RoleMetrics {
  hltv: number;
  adr: number;
  kd: number;
  kpr: number;
  kast: number;
  openingAttemptsPct?: number;
  openingKd?: number;
  tradeKillsPerRound?: number;
  dpr?: number;
  tradedDeathsPerRound?: number;
}

export interface PlayerRoleAnalyticsDTO {
  steamId: string;
  playerName: string;
  avatarUrl?: string;
  activeRoleFilter?: RoleFilterType;
  radarPoints: RadarAxisPoint[];
  comparison: RoleComparisonDTO;
  ctRoles: RoleDetailRow[];
  tRoles: RoleDetailRow[];
}

