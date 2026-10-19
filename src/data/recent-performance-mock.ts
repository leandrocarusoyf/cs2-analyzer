import type { RecentMatchTelemetry } from '../types/stats.ts';
import ingestedMatchesRaw from './ingested-matches.json';

export interface IngestedMatchStoreEntry {
  matchId: string;
  demoHash: string;
  savedAt: string;
  recentTelemetryEntry: RecentMatchTelemetry;
}

export const MOCK_RECENT_TELEMETRY: RecentMatchTelemetry[] = [
  {
    matchId: 'match-1',
    mapName: 'CACHE',
    opponentTeam: 'Liquid',
    opponentSlug: 'liquid',
    opponentLogoUrl: '/teams/liquid.svg',
    date: '10/10',
    teamScore: 13,
    opponentScore: 7,
    score: '13 - 7',
    result: 'W',
    metrics: {
      hltv: { overall: 1.15, ct: 1.25, t: 1.05 },
      adr: { overall: 81.3, ct: 88.5, t: 74.1 },
      kd: { overall: 1.20, ct: 1.35, t: 1.05 },
      kpr: { overall: 0.75, ct: 0.82, t: 0.68 },
      udr: { overall: 8.5, ct: 10.2, t: 6.8 },
      kast: { overall: 73.5, ct: 78.0, t: 69.0 },
    },
  },
  {
    matchId: 'match-2',
    mapName: 'ANCIENT',
    opponentTeam: 'MOUZ',
    opponentSlug: 'mouz',
    opponentLogoUrl: '/teams/mouz.svg',
    date: '11/10',
    teamScore: 16,
    opponentScore: 12,
    score: '16 - 12',
    result: 'W',
    metrics: {
      hltv: { overall: 1.28, ct: 1.40, t: 1.16 },
      adr: { overall: 86.7, ct: 94.2, t: 79.2 },
      kd: { overall: 1.35, ct: 1.50, t: 1.20 },
      kpr: { overall: 0.82, ct: 0.89, t: 0.75 },
      udr: { overall: 9.8, ct: 11.5, t: 8.1 },
      kast: { overall: 76.0, ct: 80.0, t: 72.0 },
    },
  },
  {
    matchId: 'match-3',
    mapName: 'ANUBIS',
    opponentTeam: 'Spirit',
    opponentSlug: 'spirit',
    opponentLogoUrl: '/teams/spirit.svg',
    date: '12/10',
    teamScore: 8,
    opponentScore: 13,
    score: '8 - 13',
    result: 'L',
    metrics: {
      hltv: { overall: 1.09, ct: 0.95, t: 1.23 },
      adr: { overall: 69.8, ct: 62.4, t: 77.2 },
      kd: { overall: 0.95, ct: 0.80, t: 1.10 },
      kpr: { overall: 0.65, ct: 0.58, t: 0.72 },
      udr: { overall: 6.2, ct: 5.5, t: 6.9 },
      kast: { overall: 68.0, ct: 63.0, t: 73.0 },
    },
  },
  {
    matchId: 'match-4',
    mapName: 'DUST2',
    opponentTeam: 'G2',
    opponentSlug: 'g2',
    opponentLogoUrl: '/teams/g2.svg',
    date: '13/10',
    teamScore: 13,
    opponentScore: 8,
    score: '13 - 8',
    result: 'W',
    metrics: {
      hltv: { overall: 1.34, ct: 1.52, t: 1.16 },
      adr: { overall: 104.1, ct: 115.0, t: 93.2 },
      kd: { overall: 1.55, ct: 1.75, t: 1.35 },
      kpr: { overall: 0.92, ct: 1.05, t: 0.79 },
      udr: { overall: 12.4, ct: 14.2, t: 10.6 },
      kast: { overall: 82.0, ct: 86.0, t: 78.0 },
    },
  },
  {
    matchId: 'match-5',
    mapName: 'NUKE',
    opponentTeam: 'Vitality',
    opponentSlug: 'vitality',
    opponentLogoUrl: '/teams/vitality.svg',
    date: '14/10',
    teamScore: 13,
    opponentScore: 10,
    score: '13 - 10',
    result: 'W',
    metrics: {
      hltv: { overall: 1.22, ct: 1.35, t: 1.09 },
      adr: { overall: 92.5, ct: 101.0, t: 84.0 },
      kd: { overall: 1.25, ct: 1.40, t: 1.10 },
      kpr: { overall: 0.78, ct: 0.86, t: 0.70 },
      udr: { overall: 8.9, ct: 10.5, t: 7.3 },
      kast: { overall: 74.0, ct: 79.0, t: 69.0 },
    },
  },
  {
    matchId: 'match-6',
    mapName: 'INFERNO',
    opponentTeam: 'FaZe',
    opponentSlug: 'faze',
    opponentLogoUrl: '/teams/faze.svg',
    date: '15/10',
    teamScore: 11,
    opponentScore: 13,
    score: '11 - 13',
    result: 'L',
    metrics: {
      hltv: { overall: 1.18, ct: 1.10, t: 1.26 },
      adr: { overall: 78.4, ct: 72.0, t: 84.8 },
      kd: { overall: 1.15, ct: 1.02, t: 1.28 },
      kpr: { overall: 0.72, ct: 0.66, t: 0.78 },
      udr: { overall: 7.6, ct: 6.8, t: 8.4 },
      kast: { overall: 71.5, ct: 67.0, t: 76.0 },
    },
  },
  {
    matchId: 'match-7',
    mapName: 'MIRAGE',
    opponentTeam: 'NaVi',
    opponentSlug: 'navi',
    opponentLogoUrl: '/teams/navi.svg',
    date: '16/10',
    teamScore: 13,
    opponentScore: 9,
    score: '13 - 9',
    result: 'W',
    metrics: {
      hltv: { overall: 1.25, ct: 1.38, t: 1.12 },
      adr: { overall: 89.2, ct: 96.5, t: 81.9 },
      kd: { overall: 1.30, ct: 1.45, t: 1.15 },
      kpr: { overall: 0.80, ct: 0.88, t: 0.72 },
      udr: { overall: 10.1, ct: 12.0, t: 8.2 },
      kast: { overall: 75.5, ct: 81.0, t: 70.0 },
    },
  },
  {
    matchId: 'match-8',
    mapName: 'INFERNO',
    opponentTeam: 'FURIA',
    opponentSlug: 'furia',
    opponentLogoUrl: '/teams/furia.svg',
    date: '17/10',
    teamScore: 16,
    opponentScore: 11,
    score: '16 - 11',
    result: 'W',
    metrics: {
      hltv: { overall: 1.50, ct: 1.62, t: 1.38 },
      adr: { overall: 98.4, ct: 106.2, t: 90.6 },
      kd: { overall: 1.65, ct: 1.80, t: 1.50 },
      kpr: { overall: 0.95, ct: 1.05, t: 0.85 },
      udr: { overall: 13.5, ct: 15.0, t: 12.0 },
      kast: { overall: 85.0, ct: 88.0, t: 82.0 },
    },
  },
  {
    matchId: 'match-9',
    mapName: 'ANCIENT',
    opponentTeam: 'Liquid',
    opponentSlug: 'liquid',
    opponentLogoUrl: '/teams/liquid.svg',
    date: '18/10',
    teamScore: 10,
    opponentScore: 13,
    score: '10 - 13',
    result: 'L',
    metrics: {
      hltv: { overall: 1.12, ct: 1.20, t: 1.04 },
      adr: { overall: 75.6, ct: 82.0, t: 69.2 },
      kd: { overall: 1.08, ct: 1.18, t: 0.98 },
      kpr: { overall: 0.70, ct: 0.76, t: 0.64 },
      udr: { overall: 8.0, ct: 9.1, t: 6.9 },
      kast: { overall: 70.0, ct: 74.0, t: 66.0 },
    },
  },
  {
    matchId: 'match-10',
    mapName: 'MIRAGE',
    opponentTeam: 'FaZe',
    opponentSlug: 'faze',
    opponentLogoUrl: '/teams/faze.svg',
    date: '19/10',
    teamScore: 16,
    opponentScore: 14,
    score: '16 - 14',
    result: 'W',
    metrics: {
      hltv: { overall: 1.64, ct: 1.78, t: 1.50 },
      adr: { overall: 112.8, ct: 121.5, t: 104.1 },
      kd: { overall: 1.82, ct: 2.05, t: 1.59 },
      kpr: { overall: 1.04, ct: 1.15, t: 0.93 },
      udr: { overall: 15.2, ct: 17.0, t: 13.4 },
      kast: { overall: 89.0, ct: 92.0, t: 86.0 },
    },
  },
];

/**
 * Retorna as 10 partidas mais recentes mesclando partidas ingeridas pelo pipeline
 * de demos (`ingested-matches.json`) com a janela histórica local, garantindo que
 * `opponentLogoUrl` aponte sempre para `/teams/${opponentSlug}.svg`.
 */
export function getSavedRecentTelemetry(
  customIngested?: IngestedMatchStoreEntry[],
): RecentMatchTelemetry[] {
  const storeEntries = Array.isArray(customIngested)
    ? customIngested
    : Array.isArray(ingestedMatchesRaw)
    ? (ingestedMatchesRaw as IngestedMatchStoreEntry[])
    : [];

  const normalizedIngested: RecentMatchTelemetry[] = storeEntries
    .map((entry) => entry?.recentTelemetryEntry)
    .filter((item): item is RecentMatchTelemetry => Boolean(item && item.matchId))
    .map((item) => {
      const rawOpponent = item.opponentTeam || 'unknown';
      const slug =
        item.opponentSlug ||
        String(rawOpponent).toLowerCase().replace(/[^a-z0-9_-]/g, '');
      return {
        ...item,
        opponentSlug: slug,
        opponentLogoUrl: item.opponentLogoUrl || `/teams/${slug}.svg`,
      };
    });

  if (normalizedIngested.length === 0) {
    return MOCK_RECENT_TELEMETRY;
  }

  if (normalizedIngested.length >= 10) {
    return normalizedIngested.slice(-10);
  }

  const keepCount = 10 - normalizedIngested.length;
  return [...MOCK_RECENT_TELEMETRY.slice(0, keepCount), ...normalizedIngested];
}


