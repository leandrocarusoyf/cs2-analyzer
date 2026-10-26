import type { CS2Map } from './replay.ts';

export type { CS2Map };

export interface RatingHistoryPoint {
  matchId: string;
  date: string;
  rating: number;
}

export interface PlayerOverviewStats {
  steamId: string;
  name: string;
  avatarUrl: string;
  teamName: string;
  matchesCount: number;
  roundWinRatePct: number;
  currentRating: number;
  adr: number;
  kd: number;
  kpr: number;
  dpr: number;
  kastPct: number;
  ttd?: number | null;
  ttk?: number | null;
  recentRatingHistory: Array<{ matchId: string; date: string; rating: number }>;
}

export type CTRole = 'allround' | 'anchor' | 'rotation';

export type TRole = 'allround' | 'lurk' | 'half_lurk' | 'pack';

export type PlayerRadarMetricsTuple = [
  rating: number,
  adr: number,
  openingAttempts: number,
  openingKd: number,
  tradeKills: number,
  kpr: number,
  kd: number,
  dpr: number,
  tradedDeaths: number,
  udr: number,
  flashAssists: number,
  kast: number,
];

export interface PlayerRoleMetrics {
  rating: number;
  adr: number;
  openingAttempts: number;
  openingKd: number;
  tradeKills: number;
  kpr: number;
  kd: number;
  dpr: number;
  tradedDeaths: number;
  udr: number;
  flashAssists: number;
  kast: number;
  metrics?: PlayerRadarMetricsTuple;
  ctRole: CTRole;
  tRole: TRole;
}

export interface WeaponPerformanceStat {
  weaponId: number;
  weaponName: string;
  usagePct: number;
  roundsPlayed: number;
  adr: number;
  roundWinRatePct: number;
  openingDuelsCount: number;
  economyRating: number;
  damagePerDollar: number;
}

export interface BuyScenarioBucket {
  rounds: number;
  winRatePct: number;
  rating: number;
}

export interface BuyTypeStats {
  equalBuy: { rounds: number; winRatePct: number; rating: number };
  betterBuy: { rounds: number; winRatePct: number; rating: number };
  worseBuy: { rounds: number; winRatePct: number; rating: number };
  ecoAdrImpact: { withKillsAdr: number; withoutKillsAdr: number };
}

export interface SideMapPerformance {
  winRatePct: number;
  rating: number;
  adr: number;
}

export interface MapPerformanceStat {
  mapName: CS2Map;
  matchesPlayed: number;
  winRatePct: number;
  avgRating: number;
  ctStats: { winRatePct: number; rating: number; adr: number };
  tStats: { winRatePct: number; rating: number; adr: number };
  ratingHistory: number[];
}

