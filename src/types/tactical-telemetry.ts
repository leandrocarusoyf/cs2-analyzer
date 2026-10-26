/**
 * Interfaces TypeScript rigorosas para o painel de telemetria tática 2D de CS2.
 * Define a estrutura de dados desacoplada para isolar a camada de apresentação
 * de hardcode no JSX.
 */

export type UtilityType =
  | 'smoke'
  | 'flash'
  | 'he'
  | 'molotov'
  | 'incendiary'
  | 'defuse_kit'
  | 'c4';

export type TeamSide = 'CT' | 'T';

export interface TerritoryAreaControl {
  area: string;
  status: string;
  ownerTeam?: string;
}

export interface AdvancedMatchMetrics {
  winExpectancy: {
    deltaLabel: string;
    ctPercentage: number;
    ctTeamName: string;
    tPercentage: number;
    tTeamName: string;
  };
  territoryControl: {
    badge: string;
    percentage: number;
    description: string;
    breakdown: TerritoryAreaControl[];
    paceLabel: string;
    paceBenchmark: string;
  };
  tradeFragRate: {
    badge: string;
    percentage: number;
    description: string;
    sparklinePoints: number[];
  };
  openingDuels: {
    score: string;
    ctScore: number;
    tScore: number;
    featuredDuel: {
      matchup: string;
      context: string;
    };
    firstBulletWinProbability: {
      percentage: number;
      teamName: string;
    };
  };
}

export interface PlayerMapEntity {
  x: number;
  y: number;
  label?: string;
  angleDeg?: number;
  visionConeGradientId?: string;
  visionConePath?: string;
  isAlive: boolean;
  hasC4?: boolean;
}

export interface PlayerTelemetry {
  id: string;
  name: string;
  role: string;
  side: TeamSide;
  number: number;
  primaryWeapon: string;
  secondaryWeapon?: string;
  health: number;
  maxHealth: number;
  money: number;
  hasHelmet: boolean;
  hasKevlar: boolean;
  isAlive: boolean;
  isCarryingC4?: boolean;
  hasDefuseKit?: boolean;
  deathTime?: string;
  utilities: UtilityType[];
  mapEntity?: PlayerMapEntity;
}

export interface TeamTelemetry {
  name: string;
  side: TeamSide;
  score: number;
  totalMoney: number;
  colorHex: string;
  logoType: 'navi' | 'faze' | 'generic';
  players: PlayerTelemetry[];
}

export interface ClutchScenarioState {
  ctAlive: number;
  tAlive: number;
  bannerText: string;
  isClutchActive: boolean;
}

export interface C4BombState {
  isPlanted: boolean;
  plantedSite: string;
  plantTime?: string;
}

export interface MatchState {
  currentRound: number;
  totalRounds: number;
  roundLabel: string;
  isMapPoint: boolean;
  currentTimeSeconds: number;
  maxTimeSeconds: number;
  formattedCurrentTime: string;
  formattedMaxTime: string;
  isPlaying: boolean;
  playbackSpeed: number;
  clutchScenario: ClutchScenarioState;
  c4State: C4BombState;
}

export interface KillFeedEvent {
  id: string;
  time: string;
  killerName: string;
  killerSide: TeamSide;
  weapon: string;
  isHeadshot: boolean;
  victimName: string;
  victimSide: TeamSide;
  isWallbang?: boolean;
  isThroughSmoke?: boolean;
}

export interface TimelineEvent {
  id: string;
  timeSeconds: number;
  timeFormatted: string;
  positionPercent: number;
  title: string;
  type: 'freeze' | 'smoke' | 'first_kill' | 'playhead' | 'c4_plant' | 'retake';
  badgeIcon?: string;
  colorClass?: string;
}

export interface MatchHeaderData {
  teamCT: {
    name: string;
    score: number;
    color: string;
    logoType: 'navi' | 'faze' | 'generic';
  };
  teamT: {
    name: string;
    score: number;
    color: string;
    logoType: 'navi' | 'faze' | 'generic';
  };
  mapName: string;
  matchDate: string;
  tournamentName: string;
  badgeLabel: string;
  overviewRoute: string;
}

export interface TelemetrySystemStatus {
  engineVersion: string;
  latency: string;
  tickrate: string;
}

export interface TacticalTelemetryData {
  header: MatchHeaderData;
  systemStatus: TelemetrySystemStatus;
  matchState: MatchState;
  advancedMetrics: AdvancedMatchMetrics;
  teamCT: TeamTelemetry;
  teamT: TeamTelemetry;
  killFeed: KillFeedEvent[];
  timelineEvents: TimelineEvent[];
}
