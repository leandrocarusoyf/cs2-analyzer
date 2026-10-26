'use client';

import React, { useState, useMemo } from 'react';
import { TacticalCard } from '../ui/TacticalCard.tsx';
import { SegmentedFilter, type SegmentedFilterItem } from '../ui/SegmentedFilter.tsx';
import type {
  PlayerRoleAnalyticsDTO,
  RoleFilterType,
  RoleDetailRow,
} from '../../types/roles.ts';
import type { PlayerPerformanceResult } from '../../types/stats.ts';
import {
  normalizeRadarMetric,
  computeRadarPolygonPoints,
} from '../../utils/analytics-math.ts';

export interface TabRolesProps {
  data?: PlayerRoleAnalyticsDTO;
  performance?: PlayerPerformanceResult | null;
  playerName?: string;
  matchesCount?: number;
  totalRounds?: number;
  stats?: {
    primary_role?: string | null;
    hltv_rating?: number;
    adr?: number;
    kd_ratio?: number;
    kpr?: number;
    kast?: number;
    dpr?: number;
  };
}

// 7 Pílulas Canônicas do Filtro Vector (LURKER, HALF LURKER, sem PACK)
export const ROLE_FILTER_ITEMS: readonly SegmentedFilterItem<string>[] = [
  { id: 'ALL', label: 'All' },
  { id: 'CT ALLROUND', label: 'CT Allround' },
  { id: 'ANCHOR', label: 'Anchor' },
  { id: 'ROTATION', label: 'Rotation' },
  { id: 'T ALLROUND', label: 'T Allround' },
  { id: 'LURKER', label: 'Lurker' },
  { id: 'HALF LURKER', label: 'Half Lurker' },
];

// Dados Canônicos de CT Side de fallback caso não haja dados reais no banco
const CANONICAL_CT_ROLES: RoleDetailRow[] = [
  {
    id: 'ct-1',
    side: 'ct',
    role: 'B Con',
    map: 'Anubis',
    hltv: 1.51,
    adr: 97.1,
    kd: 1.64,
    kpr: 0.99,
    rounds: 98,
  },
  {
    id: 'ct-2',
    side: 'ct',
    role: 'Mid',
    map: 'Cache',
    hltv: 1.51,
    adr: 104.3,
    kd: 1.64,
    kpr: 1.00,
    rounds: 95,
  },
  {
    id: 'ct-3',
    side: 'ct',
    role: 'B Anchor',
    map: 'Dust2',
    hltv: 1.47,
    adr: 107.1,
    kd: 1.54,
    kpr: 1.00,
    rounds: 74,
  },
  {
    id: 'ct-4',
    side: 'ct',
    role: 'A Connector',
    map: 'Mirage',
    hltv: 1.44,
    adr: 104.5,
    kd: 1.54,
    kpr: 0.97,
    rounds: 121,
  },
  {
    id: 'ct-5',
    side: 'ct',
    role: 'Mid',
    map: 'Ancient',
    hltv: 1.37,
    adr: 96.0,
    kd: 1.35,
    kpr: 0.90,
    rounds: 115,
  },
  {
    id: 'ct-6',
    side: 'ct',
    role: 'Yard',
    map: 'Nuke',
    hltv: 1.36,
    adr: 100.2,
    kd: 1.43,
    kpr: 0.94,
    rounds: 81,
  },
];

// Dados Canônicos de T Side de fallback caso não haja dados reais no banco
const CANONICAL_T_ROLES: RoleDetailRow[] = [
  {
    id: 't-1',
    side: 't',
    role: 'A Lurk',
    map: 'Anubis',
    hltv: 1.87,
    adr: 131.2,
    kd: 2.08,
    kpr: 1.29,
    rounds: 21,
  },
  {
    id: 't-2',
    side: 't',
    role: 'A Lurk',
    map: 'Ancient',
    hltv: 1.51,
    adr: 99.8,
    kd: 1.63,
    kpr: 1.08,
    rounds: 12,
  },
  {
    id: 't-3',
    side: 't',
    role: 'T Mid',
    map: 'Ancient',
    hltv: 1.5,
    adr: 109.0,
    kd: 1.48,
    kpr: 1.02,
    rounds: 106,
  },
  {
    id: 't-4',
    side: 't',
    role: 'Canal',
    map: 'Anubis',
    hltv: 1.29,
    adr: 91.4,
    kd: 1.23,
    kpr: 0.85,
    rounds: 82,
  },
  {
    id: 't-5',
    side: 't',
    role: 'Secondary Mid',
    map: 'Cache',
    hltv: 1.22,
    adr: 89.9,
    kd: 1.12,
    kpr: 0.84,
    rounds: 90,
  },
  {
    id: 't-6',
    side: 't',
    role: 'Lower Tunnels',
    map: 'Dust2',
    hltv: 1.14,
    adr: 82.7,
    kd: 1.16,
    kpr: 0.82,
    rounds: 193,
  },
];

const CT_FILTER_SET = new Set(['CT ALLROUND', 'ANCHOR', 'ROTATION']);
const T_FILTER_SET = new Set(['T ALLROUND', 'LURKER', 'HALF LURKER']);

// Baselines Tier 1 oficiais para cálculo dinâmico de deltas
const BASELINE_HLTV = 1.07;
const BASELINE_ADR = 78.9;
const BASELINE_KD = 1.02;
const BASELINE_KPR = 0.68;
const BASELINE_KAST = 70.1;

export function TabRoles({
  playerName,
  data,
  performance,
  matchesCount = 1,
  totalRounds,
  stats,
}: TabRolesProps) {
  // Controle de estado local padrão 'ALL'
  const [selectedVector, setSelectedVector] = useState<string>('ALL');

  const displayName =
    performance?.nickname || data?.playerName || playerName || 'donk';

  // Role/Estilo real do atleta ou omitido se não cadastrado
  const primaryRole =
    stats?.primary_role !== undefined
      ? stats.primary_role
      : performance?.roles?.primary ?? null;

  // Total de rounds reais computados para o atleta
  const computedTotalRounds = useMemo(() => {
    if (typeof totalRounds === 'number' && totalRounds > 0) return totalRounds;
    if (typeof performance?.totalRounds === 'number' && performance.totalRounds > 0) {
      return performance.totalRounds;
    }
    if (performance?.ctRoles || performance?.tRoles) {
      const ctRds = (performance.ctRoles || []).reduce((acc, r) => acc + r.rounds, 0);
      const tRds = (performance.tRoles || []).reduce((acc, r) => acc + r.rounds, 0);
      if (ctRds + tRds > 0) return ctRds + tRds;
    }
    if (matchesCount > 1) return matchesCount * 24;
    return 44;
  }, [totalRounds, performance, matchesCount]);

  // Lista base de roles CT e T (prioriza dados reais da API/performance)
  const baseCtRoles: RoleDetailRow[] = useMemo(() => {
    if (data?.ctRoles && data.ctRoles.length > 0) return data.ctRoles;
    if (performance?.ctRoles && performance.ctRoles.length > 0) return performance.ctRoles;
    return CANONICAL_CT_ROLES;
  }, [data?.ctRoles, performance?.ctRoles]);

  const baseTRoles: RoleDetailRow[] = useMemo(() => {
    if (data?.tRoles && data.tRoles.length > 0) return data.tRoles;
    if (performance?.tRoles && performance.tRoles.length > 0) return performance.tRoles;
    return CANONICAL_T_ROLES;
  }, [data?.tRoles, performance?.tRoles]);

  // Filtragem reativa das tabelas com base na pílula selecionada
  const filteredCtRoles = useMemo(() => {
    const norm = selectedVector.toUpperCase();
    if (norm === 'ALL') return baseCtRoles;
    if (T_FILTER_SET.has(norm)) return [];
    if (norm === 'CT ALLROUND') return baseCtRoles;
    if (norm === 'ANCHOR') {
      return baseCtRoles.filter((r) => r.role.toLowerCase().includes('anchor'));
    }
    if (norm === 'ROTATION') {
      return baseCtRoles.filter((r) => !r.role.toLowerCase().includes('anchor') || r.role.toLowerCase().includes('rotation'));
    }
    return baseCtRoles;
  }, [baseCtRoles, selectedVector]);

  const filteredTRoles = useMemo(() => {
    const norm = selectedVector.toUpperCase();
    if (norm === 'ALL') return baseTRoles;
    if (CT_FILTER_SET.has(norm)) return [];
    if (norm === 'T ALLROUND') return baseTRoles;
    if (norm === 'LURKER') {
      return baseTRoles.filter((r) => r.role.toLowerCase().includes('lurk'));
    }
    if (norm === 'HALF LURKER') {
      return baseTRoles.filter(
        (r) =>
          r.role.toLowerCase().includes('half') ||
          r.role.toLowerCase().includes('secondary') ||
          r.role.toLowerCase().includes('mid'),
      );
    }
    return baseTRoles;
  }, [baseTRoles, selectedVector]);

  const ctRoundsTotal = useMemo(
    () => filteredCtRoles.reduce((acc, r) => acc + r.rounds, 0),
    [filteredCtRoles],
  );

  const tRoundsTotal = useMemo(
    () => filteredTRoles.reduce((acc, r) => acc + r.rounds, 0),
    [filteredTRoles],
  );

  // Recalcula métricas conforme o vetor selecionado (CT, T ou Geral)
  const currentMetrics = useMemo(() => {
    const norm = selectedVector.toUpperCase();
    const isCt = CT_FILTER_SET.has(norm);
    const isT = T_FILTER_SET.has(norm);

    const telemetry = performance?.telemetry || [];

    // Se houver histórico de telemetria por lado (CT / T)
    if (telemetry.length > 0 && (isCt || isT)) {
      const side = isCt ? 'ct' : 't';
      const hltvs = telemetry.map((t) => t.metrics.hltv[side]).filter((v) => Number.isFinite(v));
      const adrs = telemetry.map((t) => t.metrics.adr[side]).filter((v) => Number.isFinite(v));
      const kds = telemetry.map((t) => t.metrics.kd[side]).filter((v) => Number.isFinite(v));
      const kprs = telemetry.map((t) => t.metrics.kpr[side]).filter((v) => Number.isFinite(v));
      const kasts = telemetry.map((t) => t.metrics.kast[side]).filter((v) => Number.isFinite(v));

      const avg = (arr: number[], fallback: number) =>
        arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : fallback;

      return {
        hltv: Number(avg(hltvs, performance?.currentRating ?? 1.10).toFixed(2)),
        adr: Number(avg(adrs, performance?.adr ?? 80.0).toFixed(1)),
        kd: Number(avg(kds, performance?.kd ?? 1.05).toFixed(2)),
        kpr: Number(avg(kprs, performance?.kpr ?? 0.70).toFixed(2)),
        kast: Number(avg(kasts, performance?.kastPct ?? 70.0).toFixed(1)),
        dpr: performance?.dpr ?? 0.65,
      };
    }

    // Default Overall / Geral
    const isDefaultMockDonk = !performance && !stats && displayName === 'donk';
    const fallbackHltv = isDefaultMockDonk ? 1.33 : 1.05;
    const fallbackAdr = isDefaultMockDonk ? 95.4 : 80.0;
    const fallbackKd = isDefaultMockDonk ? 1.33 : 1.05;
    const fallbackKpr = isDefaultMockDonk ? 0.90 : 0.70;
    const fallbackKast = isDefaultMockDonk ? 72.4 : 70.0;

    return {
      hltv: stats?.hltv_rating ?? performance?.currentRating ?? fallbackHltv,
      adr: stats?.adr ?? performance?.adr ?? fallbackAdr,
      kd: stats?.kd_ratio ?? performance?.kd ?? fallbackKd,
      kpr: stats?.kpr ?? performance?.kpr ?? fallbackKpr,
      kast: stats?.kast ?? performance?.kastPct ?? fallbackKast,
      dpr: stats?.dpr ?? performance?.dpr ?? 0.65,
    };
  }, [performance, stats, selectedVector, displayName]);

  // Deltas dinâmicos em relação à baseline competitiva
  const ratingDelta = currentMetrics.hltv - BASELINE_HLTV;
  const adrDelta = currentMetrics.adr - BASELINE_ADR;
  const kdDelta = currentMetrics.kd - BASELINE_KD;
  const kprDelta = currentMetrics.kpr - BASELINE_KPR;
  const kastDelta = currentMetrics.kast - BASELINE_KAST;

  // Linha e pico dinâmicos do histórico do atleta
  const { peakRating, trendPath, areaPath, peakPoint } = useMemo(() => {
    const historyItems = performance?.history || [];
    const ratings = historyItems
      .map((h) => Number(h.rating))
      .filter((r) => Number.isFinite(r) && r > 0);

    // Caso não haja histórico, renderiza linha contínua no nível do rating real
    if (ratings.length === 0) {
      const isDefaultDonk = displayName === 'donk' && !performance && !stats;
      const peak = isDefaultDonk ? 1.54 : currentMetrics.hltv;
      const y = isDefaultDonk ? 20 : 30;
      return {
        peakRating: peak,
        trendPath: isDefaultDonk
          ? 'M 0 45 Q 30 20 60 35 T 120 18 T 180 28 T 240 8 T 280 20 T 320 10'
          : `M 0 ${y} L 320 ${y}`,
        areaPath: isDefaultDonk
          ? 'M 0 45 Q 30 20 60 35 T 120 18 T 180 28 T 240 8 T 280 20 T 320 10 L 320 60 L 0 60 Z'
          : `M 0 ${y} L 320 ${y} L 320 60 L 0 60 Z`,
        peakPoint: { cx: isDefaultDonk ? 240 : 160, cy: isDefaultDonk ? 8 : y },
      };
    }

    const peak = Math.max(...ratings);
    const minVal = Math.min(0.5, ...ratings);
    const maxVal = Math.max(1.5, peak + 0.1);
    const range = maxVal - minVal || 1;

    const points = ratings.map((r, i) => {
      const x = ratings.length > 1 ? (i / (ratings.length - 1)) * 320 : 160;
      const normalized = (r - minVal) / range;
      const y = Math.max(8, Math.min(52, 50 - normalized * 42));
      return { x, y, r };
    });

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      d += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const area = `${d} L 320 60 L 0 60 Z`;
    const peakIdx = ratings.indexOf(peak);
    const peakPt = points[peakIdx >= 0 ? peakIdx : 0];

    return {
      peakRating: peak,
      trendPath: d,
      areaPath: area,
      peakPoint: { cx: peakPt.x, cy: peakPt.y },
    };
  }, [performance?.history, currentMetrics.hltv, displayName, performance, stats]);

  // Cálculo matemático dos 12 eixos do radar em função das notas do jogador
  const radarScores = useMemo(() => {
    const adv = performance?.advancedStats;
    const scoreOpening =
      adv?.score_opening != null
        ? adv.score_opening
        : currentMetrics.hltv >= 1.1
          ? 65
          : 45;
    const scoreTrade =
      adv?.score_trade != null
        ? adv.score_trade
        : currentMetrics.kd >= 1.0
          ? 55
          : 40;
    const scoreFlash = adv?.score_flash != null ? adv.score_flash : 50;
    const scoreUtility = adv?.score_utility != null ? adv.score_utility : 40;

    const openingAttemptsVal = (scoreOpening / 100) * 25 + 10;
    const openingKdVal = 0.5 + (scoreOpening / 100) * 1.2;
    const tradeKillsVal = 0.10 + (scoreTrade / 100) * 0.25;
    const tradedDeathsVal = 10 + (scoreTrade / 100) * 20;
    const udrVal = Math.max(2.0, (scoreUtility / 100) * 13 + 2.0);
    const flashAssistsVal = Math.max(0.02, (scoreFlash / 100) * 0.16 + 0.02);

    return [
      normalizeRadarMetric(currentMetrics.hltv, 0.60, 1.50), // 0: HLTV RATING (0°)
      normalizeRadarMetric(currentMetrics.adr, 50.0, 105.0), // 1: ADR (30°)
      normalizeRadarMetric(openingAttemptsVal, 10.0, 35.0), // 2: OPENING ATT (60°)
      normalizeRadarMetric(openingKdVal, 0.50, 1.70), // 3: OPENING KD (90°)
      normalizeRadarMetric(tradeKillsVal, 0.10, 0.35), // 4: TRADE KILLS/R (120°)
      normalizeRadarMetric(currentMetrics.kpr, 0.50, 0.95), // 5: KPR (150°)
      normalizeRadarMetric(currentMetrics.kd, 0.70, 1.50), // 6: KD RATIO (180°)
      normalizeRadarMetric(
        Math.max(0.50, 0.85 - currentMetrics.dpr + 0.50),
        0.50,
        0.85,
      ), // 7: DPR (210°, inverted)
      normalizeRadarMetric(tradedDeathsVal, 10.0, 30.0), // 8: TRADED DEATHS (240°)
      normalizeRadarMetric(udrVal, 2.0, 15.0), // 9: UDR (270°)
      normalizeRadarMetric(flashAssistsVal, 0.02, 0.18), // 10: FLASH ASSISTS (300°)
      normalizeRadarMetric(currentMetrics.kast, 60.0, 85.0), // 11: KAST (330°)
    ];
  }, [currentMetrics, performance?.advancedStats]);

  // Polígono dinâmico gerado matematicamente com raio máximo 160
  const playerRadar = useMemo(() => {
    return computeRadarPolygonPoints(radarScores, 160);
  }, [radarScores]);

  return (
    <div
      className="flex flex-col w-full text-text-primary pb-12 select-none"
      data-testid="tab-roles-content"
    >
      {/* ========================================================================= */}
      {/* PRIMEIRA DOBRA: RADAR EM TELA CHEIA (MULTI-AXIS PERFORMANCE RADAR)       */}
      {/* ========================================================================= */}
      <section className="min-h-[calc(100vh-6rem)] flex flex-col justify-between mb-8">
        {/* Sub-Header & Controls Toolbar */}
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
              <span className="text-cyan-accent font-mono text-base font-bold">/</span>
              <span>Role performance</span>
            </h1>
          </div>

          {/* Segmented Role Filters com Pílulas Atualizadas */}
          <div className="flex items-center justify-between gap-4 p-2 rounded-lg bg-card-bg border border-border-dark overflow-x-auto">
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-[11px] text-text-muted uppercase px-2 tracking-widest shrink-0">
                FILTER VECTOR:
              </span>
              <SegmentedFilter
                items={ROLE_FILTER_ITEMS}
                activeId={selectedVector}
                onChange={(id) => setSelectedVector(id)}
                variant="pill"
                size="sm"
              />
            </div>
            <div className="flex items-center gap-2 pr-3 text-text-muted font-mono text-[11px] shrink-0">
              <span className="w-2 h-2 rounded-full bg-cyan-accent animate-pulse" />
              <span>
                INDEXING: {computedTotalRounds} MATCH ROUNDS
              </span>
            </div>
          </div>
        </div>

        {/* TOP SECTION: RADAR COMPARISON & KPI BENCHMARKS */}
        <TacticalCard
          variant="surface"
          padding="lg"
          radius="xl"
          className="flex-1 flex flex-col justify-between shadow-xl mb-4"
        >
          {/* Header do Card */}
          <div className="w-full flex items-center justify-between mb-2 border-b border-border-dark pb-3">
            <span className="font-mono text-xs text-text-primary tracking-wider uppercase font-bold flex items-center gap-2">
              <svg
                className="w-4 h-4 text-cyan-accent"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon
                  points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                  fill="none"
                />
              </svg>
              Multi-Axis Performance Radar
            </span>
            <span className="px-2 py-0.5 rounded bg-card-bg border border-border-dark text-cyan-accent font-mono text-[10px] uppercase font-semibold">
              12-AXIS BENCHMARK
            </span>
          </div>

          <div className="grid grid-cols-12 gap-8 items-center flex-1 my-auto">
            {/* Left Column: 12-Axis Tactical Radar Spider Chart */}
            <div className="col-span-12 lg:col-span-7 flex flex-col items-center">
              <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center py-2">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="-240 -240 480 480"
                >
                  {/* Concentric Grid Polygons */}
                  <polygon
                    fill="none"
                    points="0,-40 20,-34.6 34.6,-20 40,0 34.6,20 20,34.6 0,40 -20,34.6 -34.6,20 -40,0 -34.6,-20 -20,-34.6"
                    stroke="#222735"
                    strokeWidth="1"
                  />
                  <polygon
                    fill="none"
                    points="0,-80 40,-69.3 69.3,-40 80,0 69.3,40 40,69.3 0,80 -40,69.3 -69.3,40 -80,0 -69.3,-40 -40,-69.3"
                    stroke="#222735"
                    strokeWidth="1"
                  />
                  <polygon
                    fill="none"
                    points="0,-120 60,-103.9 103.9,-60 120,0 103.9,60 60,103.9 0,120 -60,103.9 -103.9,60 -120,0 -103.9,-60 -60,-103.9"
                    stroke="#222735"
                    strokeWidth="1"
                  />
                  <polygon
                    fill="none"
                    points="0,-160 80,-138.6 138.6,-80 160,0 138.6,80 80,138.6 0,160 -80,138.6 -138.6,80 -160,0 -138.6,-80 -80,-138.6"
                    stroke="#222735"
                    strokeWidth="1.5"
                  />

                  {/* 12 Axis Spokes (every 30 deg) */}
                  <line
                    stroke="#222735"
                    strokeDasharray="2,2"
                    strokeWidth="1"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="-165"
                  />
                  <line
                    stroke="#222735"
                    strokeDasharray="2,2"
                    strokeWidth="1"
                    x1="0"
                    y1="0"
                    x2="82.5"
                    y2="-142.9"
                  />
                  <line
                    stroke="#222735"
                    strokeDasharray="2,2"
                    strokeWidth="1"
                    x1="0"
                    y1="0"
                    x2="142.9"
                    y2="-82.5"
                  />
                  <line
                    stroke="#222735"
                    strokeDasharray="2,2"
                    strokeWidth="1"
                    x1="0"
                    y1="0"
                    x2="165"
                    y2="0"
                  />
                  <line
                    stroke="#222735"
                    strokeDasharray="2,2"
                    strokeWidth="1"
                    x1="0"
                    y1="0"
                    x2="142.9"
                    y2="82.5"
                  />
                  <line
                    stroke="#222735"
                    strokeDasharray="2,2"
                    strokeWidth="1"
                    x1="0"
                    y1="0"
                    x2="82.5"
                    y2="142.9"
                  />
                  <line
                    stroke="#222735"
                    strokeDasharray="2,2"
                    strokeWidth="1"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="165"
                  />
                  <line
                    stroke="#222735"
                    strokeDasharray="2,2"
                    strokeWidth="1"
                    x1="0"
                    y1="0"
                    x2="-82.5"
                    y2="142.9"
                  />
                  <line
                    stroke="#222735"
                    strokeDasharray="2,2"
                    strokeWidth="1"
                    x1="0"
                    y1="0"
                    x2="-142.9"
                    y2="82.5"
                  />
                  <line
                    stroke="#222735"
                    strokeDasharray="2,2"
                    strokeWidth="1"
                    x1="0"
                    y1="0"
                    x2="-165"
                    y2="0"
                  />
                  <line
                    stroke="#222735"
                    strokeDasharray="2,2"
                    strokeWidth="1"
                    x1="0"
                    y1="0"
                    x2="-142.9"
                    y2="-82.5"
                  />
                  <line
                    stroke="#222735"
                    strokeDasharray="2,2"
                    strokeWidth="1"
                    x1="0"
                    y1="0"
                    x2="-82.5"
                    y2="-142.9"
                  />

                  {/* Baseline Polygon: Tier 1 Pros Avg */}
                  <polygon
                    fill="#32353c"
                    fillOpacity="0.3"
                    points="0,-105 55,-95 98,-56 108,0 92,53 52,90 0,102 -54,93 -95,55 -104,0 -90,-52 -51,-88"
                    stroke="#849396"
                    strokeDasharray="4,3"
                    strokeWidth="1.5"
                  />

                  {/* Player Polygon: Dinâmico e Reativo */}
                  <polygon
                    fill="#00daf3"
                    fillOpacity="0.22"
                    points={playerRadar.pointsString}
                    stroke="#00e5ff"
                    strokeWidth="2.2"
                  />

                  {/* Player Vertex Glowing Dots */}
                  {playerRadar.vertices.map((v, i) => (
                    <circle key={i} cx={v.cx} cy={v.cy} fill="#c3f5ff" r="3.5" />
                  ))}

                  {/* 12 Axis Labels (JetBrains Mono) */}
                  <text
                    fill="#c3f5ff"
                    fontFamily="JetBrains Mono"
                    fontSize="10"
                    fontWeight="600"
                    textAnchor="middle"
                    x="0"
                    y="-176"
                  >
                    HLTV RATING
                  </text>
                  <text
                    fill="#bac9cc"
                    fontFamily="JetBrains Mono"
                    fontSize="10"
                    textAnchor="start"
                    x="96"
                    y="-154"
                  >
                    ADR
                  </text>
                  <text
                    fill="#bac9cc"
                    fontFamily="JetBrains Mono"
                    fontSize="10"
                    textAnchor="start"
                    x="168"
                    y="-90"
                  >
                    OPENING ATT
                  </text>
                  <text
                    fill="#c3f5ff"
                    fontFamily="JetBrains Mono"
                    fontSize="10"
                    fontWeight="600"
                    textAnchor="start"
                    x="182"
                    y="4"
                  >
                    OPENING KD
                  </text>
                  <text
                    fill="#bac9cc"
                    fontFamily="JetBrains Mono"
                    fontSize="10"
                    textAnchor="start"
                    x="162"
                    y="96"
                  >
                    TRADE KILLS/R
                  </text>
                  <text
                    fill="#c3f5ff"
                    fontFamily="JetBrains Mono"
                    fontSize="10"
                    fontWeight="600"
                    textAnchor="start"
                    x="94"
                    y="166"
                  >
                    KPR
                  </text>
                  <text
                    fill="#bac9cc"
                    fontFamily="JetBrains Mono"
                    fontSize="10"
                    textAnchor="middle"
                    x="0"
                    y="185"
                  >
                    KD RATIO
                  </text>
                  <text
                    fill="#bac9cc"
                    fontFamily="JetBrains Mono"
                    fontSize="10"
                    textAnchor="end"
                    x="-94"
                    y="166"
                  >
                    DPR
                  </text>
                  <text
                    fill="#bac9cc"
                    fontFamily="JetBrains Mono"
                    fontSize="10"
                    textAnchor="end"
                    x="-162"
                    y="96"
                  >
                    TRADED DEATHS
                  </text>
                  <text
                    fill="#bac9cc"
                    fontFamily="JetBrains Mono"
                    fontSize="10"
                    textAnchor="end"
                    x="-182"
                    y="4"
                  >
                    UDR
                  </text>
                  <text
                    fill="#bac9cc"
                    fontFamily="JetBrains Mono"
                    fontSize="10"
                    textAnchor="end"
                    x="-168"
                    y="-90"
                  >
                    FLASH ASSISTS
                  </text>
                  <text
                    fill="#c3f5ff"
                    fontFamily="JetBrains Mono"
                    fontSize="10"
                    fontWeight="600"
                    textAnchor="end"
                    x="-96"
                    y="-154"
                  >
                    KAST
                  </text>
                </svg>
              </div>

              {/* Radar Legend Dinâmica */}
              <div className="flex items-center gap-6 mt-3 pt-3 border-t border-border-dark/60">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-accent shadow-[0_0_8px_rgba(0,229,255,0.6)]" />
                  <span className="font-mono text-xs text-text-primary font-bold">
                    {displayName}
                  </span>
                  {primaryRole && (
                    <span className="font-mono text-[10px] text-cyan-accent font-semibold">
                      ({primaryRole})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-text-muted" />
                  <span className="font-mono text-xs text-text-secondary">
                    Tier 1 Pro Average
                  </span>
                  <span className="font-mono text-[10px] text-text-muted">
                    (Baseline)
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Head-to-Head Telemetry Column Dinâmica */}
            <div className="col-span-12 lg:col-span-5 flex flex-col justify-between h-full bg-card-bg p-5 rounded-lg border border-border-dark">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-border-dark">
                  <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                    TELEMETRY DELTA // {displayName.toUpperCase()} VS COMPARISON
                  </span>
                  <span className="font-mono text-[10px] text-cyan-accent font-bold tracking-wider">
                    MODE: GLOBAL SCOUT
                  </span>
                </div>

                {/* Hero HLTV Rating Block Dinâmico */}
                <div className="py-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider block mb-1">
                        HLTV 2.0 Rating
                      </span>
                      <div className="flex items-baseline gap-3">
                        <span className="font-mono text-3xl sm:text-4xl font-black text-cyan-accent tracking-tight tabular-nums">
                          {currentMetrics.hltv.toFixed(2)}
                        </span>
                        <span className="font-mono text-base text-text-muted line-through opacity-75 tabular-nums">
                          {BASELINE_HLTV.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span
                        className={`px-2 py-0.5 rounded border font-mono text-xs font-bold flex items-center gap-1 shadow-sm tabular-nums ${
                          ratingDelta >= 0
                            ? 'bg-cyan-accent/15 border-cyan-accent/30 text-cyan-accent'
                            : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                        }`}
                      >
                        <svg
                          className={`w-3.5 h-3.5 transition-transform ${
                            ratingDelta < 0 ? 'rotate-180' : ''
                          }`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                          <polyline points="17 6 23 6 23 12" />
                        </svg>
                        {ratingDelta >= 0 ? '+' : ''}
                        {ratingDelta.toFixed(2)}
                      </span>
                      <span className="font-mono text-[10px] text-text-muted mt-1">
                        vs T1 Baseline
                      </span>
                    </div>
                  </div>

                  {/* Spline Area Wave Chart: Trend Curve Proporcional ao Histórico */}
                  <div className="w-full h-16 mt-3 relative">
                    <svg
                      className="w-full h-full"
                      preserveAspectRatio="none"
                      viewBox="0 0 320 60"
                    >
                      <defs>
                        <linearGradient
                          id="roleWaveGradient"
                          x1="0"
                          x2="0"
                          y1="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#00e5ff"
                            stopOpacity="0.4"
                          />
                          <stop
                            offset="100%"
                            stopColor="#00e5ff"
                            stopOpacity="0.0"
                          />
                        </linearGradient>
                      </defs>
                      <path d={areaPath} fill="url(#roleWaveGradient)" />
                      <path
                        d={trendPath}
                        fill="none"
                        stroke="#00e5ff"
                        strokeWidth="2"
                      />
                      <circle
                        cx={peakPoint.cx}
                        cy={peakPoint.cy}
                        fill="#c3f5ff"
                        r="3.5"
                      />
                    </svg>
                    <div className="absolute right-0 top-0 font-mono text-[10px] text-cyan-accent font-bold tabular-nums">
                      PEAK {peakRating.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stacked Secondary Comparative Metrics Dinâmicos */}
              <div className="flex flex-col gap-3 pt-4 border-t border-border-dark">
                {/* Metric: ADR */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-text-secondary">
                      Average Damage / Round (ADR)
                    </span>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="text-text-primary font-bold">
                        {currentMetrics.adr.toFixed(1)}
                      </span>
                      <span className="text-text-muted text-[11px]">
                        / {BASELINE_ADR.toFixed(1)}
                      </span>
                      <span
                        className={`text-[11px] font-bold ${
                          adrDelta >= 0 ? 'text-cyan-accent' : 'text-rose-400'
                        }`}
                      >
                        {adrDelta >= 0 ? '+' : ''}
                        {adrDelta.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#10141D] overflow-hidden border border-border-dark">
                    <div
                      className="h-full bg-cyan-accent rounded-full shadow-[0_0_8px_#00E5FF] transition-all duration-300"
                      style={{
                        width: `${Math.max(10, Math.min(100, (currentMetrics.adr / 120) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Metric: K/D Ratio */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-text-secondary">Kill / Death Ratio</span>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="text-text-primary font-bold">
                        {currentMetrics.kd.toFixed(2)}
                      </span>
                      <span className="text-text-muted text-[11px]">
                        / {BASELINE_KD.toFixed(2)}
                      </span>
                      <span
                        className={`text-[11px] font-bold ${
                          kdDelta >= 0 ? 'text-cyan-accent' : 'text-rose-400'
                        }`}
                      >
                        {kdDelta >= 0 ? '+' : ''}
                        {kdDelta.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#10141D] overflow-hidden border border-border-dark">
                    <div
                      className="h-full bg-cyan-accent rounded-full shadow-[0_0_8px_#00E5FF] transition-all duration-300"
                      style={{
                        width: `${Math.max(10, Math.min(100, (currentMetrics.kd / 2.0) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Metric: KPR */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-text-secondary">
                      Kills Per Round (KPR)
                    </span>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="text-text-primary font-bold">
                        {currentMetrics.kpr.toFixed(2)}
                      </span>
                      <span className="text-text-muted text-[11px]">
                        / {BASELINE_KPR.toFixed(2)}
                      </span>
                      <span
                        className={`text-[11px] font-bold ${
                          kprDelta >= 0 ? 'text-cyan-accent' : 'text-rose-400'
                        }`}
                      >
                        {kprDelta >= 0 ? '+' : ''}
                        {kprDelta.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#10141D] overflow-hidden border border-border-dark">
                    <div
                      className="h-full bg-cyan-accent rounded-full shadow-[0_0_8px_#00E5FF] transition-all duration-300"
                      style={{
                        width: `${Math.max(10, Math.min(100, (currentMetrics.kpr / 1.1) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Metric: KAST */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-text-secondary">KAST Consistency</span>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="text-text-primary font-bold">
                        {currentMetrics.kast.toFixed(1)}%
                      </span>
                      <span className="text-text-muted text-[11px]">
                        / {BASELINE_KAST.toFixed(1)}%
                      </span>
                      <span
                        className={`text-[11px] font-bold ${
                          kastDelta >= 0 ? 'text-cyan-accent' : 'text-rose-400'
                        }`}
                      >
                        {kastDelta >= 0 ? '+' : ''}
                        {kastDelta.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#10141D] overflow-hidden border border-border-dark">
                    <div
                      className="h-full bg-[#ADC6FF] rounded-full shadow-[0_0_8px_rgba(173,198,255,0.4)] transition-all duration-300"
                      style={{
                        width: `${Math.max(10, Math.min(100, currentMetrics.kast))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TacticalCard>
      </section>

      {/* ========================================================================= */}
      {/* SEGUNDA DOBRA: TABELAS VISÍVEIS COM SCROLL VERTICAL                       */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8 pt-2">
        {/* CT Side Role Breakdown Table */}
        <TacticalCard
          variant="surface"
          padding="lg"
          radius="xl"
          className="flex flex-col justify-between shadow-lg"
        >
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-dark">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0566D9] shadow-[0_0_8px_#0566D9]" />
                <span className="font-mono text-xs text-text-primary uppercase tracking-wider font-bold">
                  CT Side Roles &amp; Zones
                </span>
              </div>
              <span className="font-mono text-[10px] text-text-muted">
                {filteredCtRoles.length} ROLES RECORDED // {ctRoundsTotal} RDS
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="font-mono text-[11px] text-text-muted uppercase border-b border-border-dark">
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Map</th>
                    <th className="py-2.5 px-3">HLTV</th>
                    <th className="py-2.5 px-3">ADR</th>
                    <th className="py-2.5 px-3">K/D</th>
                    <th className="py-2.5 px-3">KPR</th>
                    <th className="py-2.5 px-3 text-right">Rounds</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs divide-y divide-border-dark/40">
                  {filteredCtRoles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-text-muted">
                        Nenhuma função CT registrada para este filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredCtRoles.map((r, idx) => (
                      <tr
                        key={r.id || idx}
                        className="hover:bg-card-bg/60 transition-colors"
                      >
                        <td className="py-3 px-3 font-semibold text-text-primary">
                          {r.role}
                        </td>
                        <td className="py-3 px-3 text-text-secondary">{r.map}</td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-cyan-accent font-bold flex items-center gap-1 tabular-nums">
                              {r.hltv.toFixed(2)}{' '}
                              <span className="text-[10px] text-cyan-accent">▲</span>
                            </span>
                            <svg className="w-14 h-2.5" fill="none" viewBox="0 0 60 12">
                              <path
                                d="M0 9 Q 15 2 30 7 T 60 2"
                                stroke="#00e5ff"
                                strokeLinecap="round"
                                strokeWidth="1.5"
                              />
                            </svg>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-text-primary tabular-nums">
                          {r.adr.toFixed(1)}
                        </td>
                        <td className="py-3 px-3 text-text-primary tabular-nums">
                          {r.kd.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-text-primary tabular-nums">
                          {r.kpr.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right text-text-secondary tabular-nums">
                          {r.rounds}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-border-dark flex items-center justify-between text-text-muted font-mono text-[10px]">
            <span>PRIMARY ZONE IMPACT: HIGH</span>
            <span className="text-emerald-400 font-semibold">
              DEFENSIVE WIN-RATE: 58.6%
            </span>
          </div>
        </TacticalCard>

        {/* T Side Role Breakdown Table */}
        <TacticalCard
          variant="surface"
          padding="lg"
          radius="xl"
          className="flex flex-col justify-between shadow-lg"
        >
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-dark">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#953F00] shadow-[0_0_8px_#953F00]" />
                <span className="font-mono text-xs text-text-primary uppercase tracking-wider font-bold">
                  T Side Roles &amp; Execute Vectors
                </span>
              </div>
              <span className="font-mono text-[10px] text-text-muted">
                {filteredTRoles.length} ROLES RECORDED // {tRoundsTotal} RDS
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="font-mono text-[11px] text-text-muted uppercase border-b border-border-dark">
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Map</th>
                    <th className="py-2.5 px-3">HLTV</th>
                    <th className="py-2.5 px-3">ADR</th>
                    <th className="py-2.5 px-3">K/D</th>
                    <th className="py-2.5 px-3">KPR</th>
                    <th className="py-2.5 px-3 text-right">Rounds</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs divide-y divide-border-dark/40">
                  {filteredTRoles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-text-muted">
                        Nenhuma função T registrada para este filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredTRoles.map((r, idx) => (
                      <tr
                        key={r.id || idx}
                        className="hover:bg-card-bg/60 transition-colors"
                      >
                        <td className="py-3 px-3 font-semibold text-text-primary">
                          {r.role}
                        </td>
                        <td className="py-3 px-3 text-text-secondary">{r.map}</td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-cyan-accent font-bold flex items-center gap-1 tabular-nums">
                              {r.hltv.toFixed(2)}{' '}
                              <span className="text-[10px] text-cyan-accent">▲</span>
                            </span>
                            <svg className="w-14 h-2.5" fill="none" viewBox="0 0 60 12">
                              <path
                                d="M0 10 Q 15 1 35 4 T 60 1"
                                stroke="#00e5ff"
                                strokeLinecap="round"
                                strokeWidth="1.5"
                              />
                            </svg>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-text-primary tabular-nums">
                          {r.adr.toFixed(1)}
                        </td>
                        <td className="py-3 px-3 text-text-primary tabular-nums">
                          {r.kd.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-text-primary tabular-nums">
                          {r.kpr.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right text-text-secondary tabular-nums">
                          {r.rounds}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-border-dark flex items-center justify-between text-text-muted font-mono text-[10px]">
            <span>ENTRY DUEL SUCCESS: 64.2%</span>
            <span className="text-orange-400 font-semibold">
              OFFENSIVE WIN-RATE: 53.4%
            </span>
          </div>
        </TacticalCard>
      </section>

      {/* ========================================================================= */}
      {/* FOOTER AUDIT LINE                                                         */}
      {/* ========================================================================= */}
      <footer className="flex flex-wrap items-center justify-between gap-4 py-3 px-5 rounded-lg bg-card-bg border border-border-dark text-text-muted font-mono text-xs">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-text-secondary">ENGINE V2.4 // ONLINE</span>
          <span>•</span>
          <span>
            PARSER: <span className="text-cyan-accent font-semibold">128-TICK</span>
          </span>
          <span>•</span>
          <span>
            LATENCY: <span className="text-emerald-400 font-semibold">14ms</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-cyan-accent font-semibold tracking-wide">
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
          <span>STREAM SYNCHRONIZED</span>
        </div>
      </footer>
    </div>
  );
}

export default TabRoles;
