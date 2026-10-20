'use client';

import React, { useMemo, useState, useEffect } from 'react';
import type { PlayerOverviewStats } from '../../types/analytics.ts';
import type { RecentMatchTelemetry } from '../../types/stats.ts';
import { getWeaponIconPath } from '../../utils/icon-mapper.ts';
import { liquipedia } from '../../lib/liquipedia.ts';
import { getSavedRecentTelemetry } from '../../data/recent-performance-mock.ts';
import { RecentPerformanceChart } from './RecentPerformanceChart.tsx';
import { PlayerAvatar } from './PlayerAvatar.tsx';
import { RoleDetailsModal } from './RoleDetailsModal.tsx';

export const DEFAULT_OVERVIEW_STATS: PlayerOverviewStats = {
  steamId: '76561198058500492',
  name: 'kscerato',
  avatarUrl: '/players/kscerato.png',
  teamName: 'FURIA Esports',
  matchesCount: 28,
  roundWinRatePct: 56.4,
  currentRating: 1.22,
  adr: 113.7,
  kd: 1.23,
  kpr: 0.70,
  dpr: 0.57,
  kastPct: 65.2,
  ttd: null,
  ttk: 327,
  fsp: 100.0,
  recentRatingHistory: [
    { matchId: 'm1', date: '10/10', rating: 1.15 },
    { matchId: 'm2', date: '11/10', rating: 1.28 },
    { matchId: 'm3', date: '12/10', rating: 1.09 },
    { matchId: 'm4', date: '13/10', rating: 1.34 },
    { matchId: 'm5', date: '14/10', rating: 1.22 },
    { matchId: 'm6', date: '15/10', rating: 1.18 },
    { matchId: '54e43847-2490-4751-9981-831bf7cf367c', date: '18/10', rating: 1.22 },
  ],
};

export interface TabIntroProps {
  overview?: PlayerOverviewStats;
  telemetryData?: RecentMatchTelemetry[];
}

interface RecentMatchRecord {
  id: string;
  date: string;
  map: string;
  opponent: string;
  result: 'W' | 'L';
  score: string;
  kills: number;
  deaths: number;
  adr: number;
  rating: number;
}

const RECENT_MATCHES: RecentMatchRecord[] = [
  { id: 'm7', date: '16/10', map: 'de_mirage', opponent: 'Natus Vincere', result: 'W', score: '13 - 9', kills: 19, deaths: 12, adr: 89.2, rating: 1.25 },
  { id: 'm6', date: '15/10', map: 'de_inferno', opponent: 'FaZe Clan', result: 'L', score: '11 - 13', kills: 17, deaths: 15, adr: 78.4, rating: 1.18 },
  { id: 'm5', date: '14/10', map: 'de_nuke', opponent: 'Team Vitality', result: 'W', score: '13 - 10', kills: 21, deaths: 14, adr: 92.5, rating: 1.22 },
  { id: 'm4', date: '13/10', map: 'de_dust2', opponent: 'G2 Esports', result: 'W', score: '13 - 8', kills: 24, deaths: 11, adr: 104.1, rating: 1.34 },
  { id: 'm3', date: '12/10', map: 'de_anubis', opponent: 'Team Spirit', result: 'L', score: '8 - 13', kills: 12, deaths: 16, adr: 69.8, rating: 1.09 },
  { id: 'm2', date: '11/10', map: 'de_ancient', opponent: 'MOUZ', result: 'W', score: '16 - 12', kills: 23, deaths: 15, adr: 86.7, rating: 1.28 },
  { id: 'm1', date: '10/10', map: 'de_cache', opponent: 'Team Liquid', result: 'W', score: '13 - 7', kills: 18, deaths: 11, adr: 81.3, rating: 1.15 },
];

// Converte array de coordenadas em um path de curva Bézier cúbica contínua e suave
function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
  }

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i !== points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

interface RoleEqualizerProps {
  side?: 'ct' | 't';
  compValue: string;
  benchmarkIndex?: number;
}

function RoleEqualizer({ compValue, benchmarkIndex }: RoleEqualizerProps) {
  // Quantidade total: exatamente 22 barras verticais renderizadas
  const TOTAL_BARS = 22;

  // Calcula o índice de corte proporcionalmente ao valor de benchmark
  const targetIndex = useMemo(() => {
    if (typeof benchmarkIndex === 'number' && benchmarkIndex >= 0 && benchmarkIndex < TOTAL_BARS) {
      return benchmarkIndex;
    }
    const parsed = parseFloat(compValue);
    if (!isNaN(parsed)) {
      // Mapeia rating de 0.80 a 1.60 para os índices de 0 a 21
      const normalized = Math.max(0, Math.min(1, (parsed - 0.8) / 0.8));
      return Math.round(normalized * (TOTAL_BARS - 1));
    }
    return 10; // centro por padrão
  }, [compValue, benchmarkIndex]);

  return (
    <div
      data-testid="role-equalizer"
      className="w-[200px] flex flex-col justify-end select-none shrink-0"
    >
      {/* Container do Equalizador: Flex horizontal alinhado na base h-[36px] */}
      <div
        className="flex items-end justify-between gap-1 h-[36px] select-none"
        aria-hidden="true"
      >
        {Array.from({ length: TOTAL_BARS }).map((_, i) => {
          const isBenchmark = i === targetIndex;
          const isBeforeBenchmark = i < targetIndex;

          // Barra de Benchmark / Comparativa Central:
          // Altura estendida de 36px (h-[36px]), ultrapassa 8px para cima e para baixo das barras de 28px
          if (isBenchmark) {
            return (
              <div
                key={i}
                data-testid="role-equalizer-benchmark-needle"
                style={{ height: '36px' }}
                className="w-[4px] rounded-[1px] bg-[#00FFA3] transition-colors shrink-0 shadow-[0_0_8px_rgba(0,255,163,0.6)]"
              />
            );
          }

          // Barras Normais (21 barras): altura estritamente uniforme de 28px (h-[28px]), topo plano
          // Esquema de cores tático verde:
          // Barras ativas (à esquerda do corte): Verde néon #00FFA3 sólido
          // Barras inativas (à direita do corte): Verde escuro tático apagado rgba(0, 255, 163, 0.18)
          const barBg = isBeforeBenchmark ? '#00FFA3' : 'rgba(0, 255, 163, 0.18)';

          return (
            <div
              key={i}
              style={{
                height: '28px',
                backgroundColor: barBg,
              }}
              className="w-[4px] rounded-[1px] transition-colors shrink-0"
            />
          );
        })}
      </div>

      {/* Rótulo Inferior de Comparação centralizado sob o eixo da barra estendida de 36px */}
      <div className="text-[10px] font-mono text-text-secondary leading-none text-center mt-1.5 tabular-nums">
        Comp. {compValue}
      </div>
    </div>
  );
}

export function TabIntro({ overview = DEFAULT_OVERVIEW_STATS, telemetryData }: TabIntroProps) {
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string | null>(overview.avatarUrl ?? null);
  const [dbTelemetry, setDbTelemetry] = useState<RecentMatchTelemetry[] | null>(null);
  const [activeModalRole, setActiveModalRole] = useState<{ name: string; map: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!telemetryData && typeof window !== 'undefined') {
      const steamId = overview.steamId || '76561198058500492';
      fetch(`/api/stats/player/${steamId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isMounted && data?.telemetry && data.telemetry.length > 0) {
            setDbTelemetry(data.telemetry);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [telemetryData, overview.steamId]);

  const resolvedTelemetry = useMemo(() => {
    if (telemetryData && telemetryData.length > 0) return telemetryData;
    if (dbTelemetry && dbTelemetry.length > 0) {
      return getSavedRecentTelemetry(
        dbTelemetry.map((t) => ({
          matchId: t.matchId,
          demoHash: t.matchId,
          savedAt: new Date().toISOString(),
          recentTelemetryEntry: t,
        })),
      );
    }
    return getSavedRecentTelemetry();
  }, [telemetryData, dbTelemetry]);

  useEffect(() => {
    let isMounted = true;
    setResolvedAvatarUrl(overview?.avatarUrl || null);
    if (overview.name) {
      liquipedia.getPlayerProfile(overview.name, overview.teamName).then((profile) => {
        if (isMounted && profile.avatarUrl) {
          setResolvedAvatarUrl(profile.avatarUrl);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [overview.name, overview.teamName, overview.avatarUrl]);

  const BENCHMARKS = {
    adr: '74.0',
    kd: '1.00',
    kpr: '0.67',
    dpr: '0.67',
  };

  const safeAdr = typeof overview?.adr === 'number' ? overview.adr : Number(overview?.adr) || 0;
  const safeKd = typeof overview?.kd === 'number' ? overview.kd : Number(overview?.kd) || 0;
  const safeKpr = typeof overview?.kpr === 'number' ? overview.kpr : Number(overview?.kpr) || 0;
  const safeDpr = typeof overview?.dpr === 'number' ? overview.dpr : Number(overview?.dpr) || 0;
  const safeRating = typeof overview?.currentRating === 'number' ? overview.currentRating : Number(overview?.currentRating) || 0;
  const safeWinRate = typeof overview?.roundWinRatePct === 'number' ? overview.roundWinRatePct : Number(overview?.roundWinRatePct) || 0;

  const kpis = [
    {
      id: 'adr',
      label: 'ADR',
      value: safeAdr.toFixed(1),
      benchmark: BENCHMARKS.adr,
      // Coordenadas normalizadas em viewBox 0 0 100 36
      points: [
        { x: 5, y: 26 },
        { x: 20, y: 20 },
        { x: 35, y: 22 },
        { x: 50, y: 14 },
        { x: 65, y: 17 },
        { x: 80, y: 10 },
        { x: 95, y: 12 },
      ],
    },
    {
      id: 'kd',
      label: 'K/D',
      value: safeKd.toFixed(2),
      benchmark: BENCHMARKS.kd,
      points: [
        { x: 5, y: 22 },
        { x: 20, y: 24 },
        { x: 35, y: 17 },
        { x: 50, y: 12 },
        { x: 65, y: 15 },
        { x: 80, y: 8 },
        { x: 95, y: 10 },
      ],
    },
    {
      id: 'kpr',
      label: 'KPR',
      value: safeKpr.toFixed(2),
      benchmark: BENCHMARKS.kpr,
      points: [
        { x: 5, y: 24 },
        { x: 20, y: 21 },
        { x: 35, y: 18 },
        { x: 50, y: 20 },
        { x: 65, y: 13 },
        { x: 80, y: 14 },
        { x: 95, y: 11 },
      ],
    },
    {
      id: 'dpr',
      label: 'DPR',
      value: safeDpr.toFixed(2),
      benchmark: BENCHMARKS.dpr,
      points: [
        { x: 5, y: 14 },
        { x: 20, y: 17 },
        { x: 35, y: 12 },
        { x: 50, y: 20 },
        { x: 65, y: 16 },
        { x: 80, y: 22 },
        { x: 95, y: 19 },
      ],
    },
  ];

  // Cálculo da sparkline vertical do HLTV Rating (coluna 3)
  const history = Array.isArray(overview?.recentRatingHistory) ? overview.recentRatingHistory : [];
  const ratings = history.map((h) => (typeof h?.rating === 'number' ? h.rating : Number(h?.rating) || 0));
  const minRating = ratings.length > 0 ? Math.min(...ratings, 0.8) : 0.8;
  const maxRating = ratings.length > 0 ? Math.max(...ratings, 1.5) : 1.5;
  const chartHeight = 130;
  const chartWidth = 200;

  const sparklineCoords = history.map((item, idx) => {
    const r = typeof item?.rating === 'number' ? item.rating : Number(item?.rating) || 0;
    const x =
      history.length > 1
        ? 14 + (idx / (history.length - 1)) * (chartWidth - 28)
        : chartWidth / 2;
    const y =
      chartHeight -
      18 -
      ((r - minRating) / (maxRating - minRating || 1)) * (chartHeight - 36);
    return { x, y, ...item };
  });

  // Interpolação Bézier cúbica suave contínua (C curve)
  const smoothSparklinePath = useMemo(() => {
    if (sparklineCoords.length === 0) return '';
    if (sparklineCoords.length === 1) return `M ${sparklineCoords[0].x},${sparklineCoords[0].y}`;
    if (sparklineCoords.length === 2) {
      return `M ${sparklineCoords[0].x},${sparklineCoords[0].y} L ${sparklineCoords[1].x},${sparklineCoords[1].y}`;
    }

    let d = `M ${sparklineCoords[0].x},${sparklineCoords[0].y}`;
    for (let i = 0; i < sparklineCoords.length - 1; i++) {
      const p0 = i > 0 ? sparklineCoords[i - 1] : sparklineCoords[i];
      const p1 = sparklineCoords[i];
      const p2 = sparklineCoords[i + 1];
      const p3 = i !== sparklineCoords.length - 2 ? sparklineCoords[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }, [sparklineCoords]);

  return (
    <div data-testid="tab-intro-content" className="select-none">
      {/* Linha Superior de 3 Colunas com Altura Travada: h-[285px] flex items-stretch gap-3 mb-3 */}
      <div className="h-[285px] flex items-stretch gap-3 mb-3">
        {/* Coluna 1: Identificação do Jogador e Sub-bloco CT/T Roles (w-[56%] shrink-0) */}
        <div className="w-[56%] shrink-0 bg-surface-card border border-border-card rounded-[2px] flex flex-col justify-between overflow-hidden">
          {/* Sub-bloco Superior: Identificação e Métricas Rápidas */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center">
              <PlayerAvatar playerName={overview.name} avatarUrl={resolvedAvatarUrl} />
              <div className="min-w-0">
                <h1 className="text-[24px] font-bold text-text-primary uppercase leading-none tracking-tight truncate">
                  {overview.name}
                </h1>
                <p className="text-xs font-mono text-text-secondary mt-1.5 truncate">
                  {overview.teamName} <span className="text-border-subtle">•</span> STEAMID:{' '}
                  {overview.steamId}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-5 text-right shrink-0">
              <div>
                <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider block">
                  Last Match
                </span>
                <span className="text-sm font-bold font-mono text-[#00FFA3] tabular-nums">
                  FURIA 13 x 10 Aurora
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider block">
                  TTD / TTK
                </span>
                <span className="text-sm font-bold font-mono text-text-primary tabular-nums">
                  <span data-testid="player-ttd">
                    {overview.ttd === null || overview.ttd === undefined ? '—' : `${overview.ttd} ms`}
                  </span>
                  {' '}/ <span className="text-[#2979FF]">{overview.ttk !== null && overview.ttk !== undefined ? `${Math.round(overview.ttk)} ms` : '327 ms'}</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider block">
                  Round win rate
                </span>
                <span className="text-sm font-bold font-mono text-text-primary tabular-nums">
                  {safeWinRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Sub-bloco Inferior: Roles (h-[142px] border-t border-border-card p-3.5) */}
          <div className="h-[142px] border-t border-border-card p-3.5">
            <div className="grid grid-cols-2 gap-4 h-full items-center">
              {/* Role #1 */}
              <div
                onClick={() => setActiveModalRole({ name: 'Inferno A Rotation', map: 'de_inferno' })}
                title="Clique para ver o ranking e comparar jogadores na função Inferno A Rotation"
                className="flex flex-col justify-between h-full cursor-pointer group hover:bg-[#151C20]/60 p-2 rounded-[2px] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-text-secondary">Role #1</span>
                    <div className="w-[18px] h-[18px] rounded-[2px] bg-ct-bg border border-ct-border text-ct text-[9px] font-bold font-mono flex items-center justify-center shrink-0">
                      CT
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveModalRole({ name: 'Inferno A Rotation', map: 'de_inferno' });
                    }}
                    aria-label="Inspecionar detalhes da função Inferno A Rotation"
                    className="text-[14px] font-bold text-text-primary group-hover:text-accent hover:underline flex items-center gap-1.5 cursor-pointer mt-0.5 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-[2px]"
                  >
                    <span>Inferno A Rotation</span>
                    <span className="text-[11px] text-accent" aria-hidden="true">↗</span>
                  </button>
                </div>

                <div className="flex items-end gap-3 pt-2">
                  <div className="w-[70px] shrink-0">
                    <span className="text-[10px] font-mono uppercase text-text-secondary block leading-none">
                      HLTV
                    </span>
                    <span className="text-[24px] font-bold font-mono text-text-primary leading-tight tabular-nums block">
                      1.50
                    </span>
                  </div>

                  <RoleEqualizer compValue="1.43" />
                </div>
              </div>

              {/* Role #2 */}
              <div
                onClick={() => setActiveModalRole({ name: 'Mirage B Lurk', map: 'de_mirage' })}
                title="Clique para ver o ranking e comparar jogadores na função Mirage B Lurk"
                className="flex flex-col justify-between h-full cursor-pointer group hover:bg-[#151C20]/60 p-2 rounded-[2px] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-text-secondary">Role #2</span>
                    <div className="w-[18px] h-[18px] rounded-[2px] bg-tr-bg border border-tr-border text-tr text-[9px] font-bold font-mono flex items-center justify-center shrink-0">
                      T
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveModalRole({ name: 'Mirage B Lurk', map: 'de_mirage' });
                    }}
                    aria-label="Inspecionar detalhes da função Mirage B Lurk"
                    className="text-[14px] font-bold text-text-primary group-hover:text-accent hover:underline flex items-center gap-1.5 cursor-pointer mt-0.5 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-[2px]"
                  >
                    <span>Mirage B Lurk</span>
                    <span className="text-[11px] text-accent" aria-hidden="true">↗</span>
                  </button>
                </div>

                <div className="flex items-end gap-3 pt-2">
                  <div className="w-[70px] shrink-0">
                    <span className="text-[10px] font-mono uppercase text-text-secondary block leading-none">
                      HLTV
                    </span>
                    <span className="text-[24px] font-bold font-mono text-text-primary leading-tight tabular-nums block">
                      1.09
                    </span>
                  </div>

                  <RoleEqualizer compValue="1.43" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna 2: BUY TYPES PERFORMANCE (w-[24%] shrink-0) */}
        <div className="w-[24%] shrink-0 bg-surface-card border border-border-card rounded-[2px] p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-border-card">
            <span className="text-[10px] font-bold tracking-wider text-text-secondary uppercase">
              BUY TYPES PERFORMANCE
            </span>
            <span className="text-[10px] font-mono text-text-secondary">HLTV</span>
          </div>

          <div className="space-y-1 my-auto">
            <div className="flex items-center justify-between py-2 border-b border-border-card/50">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={getWeaponIconPath('ak47')}
                  alt="Full Buy"
                  className="h-3.5 max-h-[14px] max-w-[28px] object-contain opacity-75 filter grayscale brightness-125"
                />
                <span className="text-xs font-semibold text-text-primary truncate">
                  Full Buy vs Full Buy
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-accent tabular-nums shrink-0 ml-2">
                1.21
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border-card/50">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={getWeaponIconPath('galilar')}
                  alt="Half / Eco"
                  className="h-3.5 max-h-[14px] max-w-[28px] object-contain opacity-75 filter grayscale brightness-125"
                />
                <span className="text-xs font-semibold text-text-primary truncate">
                  Full Buy vs Half Buy+Eco
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-accent tabular-nums shrink-0 ml-2">
                1.48
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={getWeaponIconPath('glock')}
                  alt="Pistol Rounds"
                  className="h-3.5 max-h-[14px] max-w-[28px] object-contain opacity-75 filter grayscale brightness-125"
                />
                <span className="text-xs font-semibold text-text-primary truncate">
                  Pistol Rounds
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-accent tabular-nums shrink-0 ml-2">
                1.14
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-border-card text-[9px] font-mono text-text-secondary text-center">
            Normalized impact
          </div>
        </div>

        {/* Coluna 3: HLTV RATING Vertical Card (w-[20%] min-w-[220px] max-w-[240px] shrink-0 h-[285px]) */}
        <div className="w-[20%] min-w-[220px] max-w-[240px] shrink-0 h-[285px] p-3.5 bg-surface-card border border-border-card rounded-[2px] flex flex-col justify-between select-none">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                HLTV RATING
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            </div>
            <div>
              <span className="text-[32px] font-bold font-mono tabular-nums text-text-primary leading-none mb-2.5 block">
                {safeRating.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Sparkline Vertical */}
          <div className="h-[135px] w-full my-auto flex items-center justify-center">
            <svg
              role="img"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
              aria-label="HLTV Rating sparkline progression"
            >
              <line
                x1="8"
                y1={chartHeight / 2}
                x2={chartWidth - 8}
                y2={chartHeight / 2}
                stroke="#1B2226"
                strokeDasharray="2 2"
              />
              {smoothSparklinePath && (
                <path
                  d={smoothSparklinePath}
                  fill="none"
                  stroke="#D1D5DB"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </div>

          {/* Eixo de Datas / Partidas */}
          <div className="h-3.5 mt-2 pt-1 border-t border-border-card/60 text-[9px] font-mono font-medium text-text-secondary flex justify-between px-1">
            {history.map((item, idx) => (
              <span key={item.matchId || idx}>{item.date}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Linha Inferior de 4 Cartões de KPI: grid grid-cols-4 gap-3 mb-6 */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            data-testid={`kpi-card-${kpi.id}`}
            className="h-[84px] bg-surface-card border border-border-card rounded-[2px] p-3 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-text-secondary uppercase block">
                  {kpi.label}
                </span>
                <span className="text-2xl font-bold font-mono text-text-primary tabular-nums leading-none mt-1 block">
                  {kpi.value}
                </span>
              </div>
              <svg
                role="img"
                width="85"
                height="32"
                viewBox="0 0 100 36"
                className="overflow-visible shrink-0"
                aria-label={`${kpi.label} trend sparkline`}
              >
                <path
                  d={buildSmoothPath(kpi.points)}
                  fill="none"
                  stroke="#D1D5DB"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="text-[9px] font-mono text-text-secondary text-center pt-1 border-t border-border-card tabular-nums">
              Comp. {kpi.benchmark}
            </div>
          </div>
        ))}
      </div>

      {/* Seção Seguinte: / Recent performance (distância de 24px mt-6 abaixo dos cards) */}
      <div className="space-y-3 mt-6">
        <div className="h-5 leading-5 flex items-center">
          <span className="text-accent font-bold mr-1.5 font-mono text-sm">/</span>
          <h2 className="text-sm font-bold uppercase tracking-[0.05em] text-text-primary">
            Recent performance
          </h2>
        </div>

        <RecentPerformanceChart telemetryData={resolvedTelemetry} />
      </div>

      <RoleDetailsModal
        isOpen={!!activeModalRole}
        roleName={activeModalRole?.name || ''}
        mapName={activeModalRole?.map}
        onClose={() => setActiveModalRole(null)}
      />
    </div>
  );
}

export default TabIntro;
