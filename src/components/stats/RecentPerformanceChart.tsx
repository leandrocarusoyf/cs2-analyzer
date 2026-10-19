'use client';

import React, { useMemo, useState } from 'react';
import type { RecentMatchTelemetry } from '../../types/stats.ts';
import { OpponentLogo } from './OpponentLogo.tsx';
import {
  MOCK_RECENT_TELEMETRY,
  getSavedRecentTelemetry,
} from '../../data/recent-performance-mock.ts';

export type TacticalSideFilter = 'BOTH' | 'T' | 'CT';
export type MetricKey = 'hltv' | 'adr' | 'kd' | 'kpr' | 'udr' | 'kast';

export interface RecentPerformanceChartProps {
  telemetryData?: RecentMatchTelemetry[];
}

export interface HoveredPointInfo {
  matchIndex: number;
  series: 'overall' | 'ct' | 't';
  x: number;
  y: number;
  val: number;
}

const METRIC_CONFIGS: Record<
  MetricKey,
  {
    label: string;
    maxScale: number;
    step: number;
    ticks: number[];
    unitLabel: string;
    formatValue: (v: number | any) => string;
  }
> = {
  hltv: {
    label: 'HLTV RATING',
    maxScale: 2.5,
    step: 0.5,
    ticks: [2.5, 2.0, 1.5, 1.0, 0.5, 0.0],
    unitLabel: 'HLTV RATING',
    formatValue: (v) => (Number(v) || 0).toFixed(2),
  },
  adr: {
    label: 'ADR',
    maxScale: 150,
    step: 30,
    ticks: [150, 120, 90, 60, 30, 0],
    unitLabel: 'DAMAGE / ROUND',
    formatValue: (v) => (Number(v) || 0).toFixed(1),
  },
  kd: {
    label: 'K/D',
    maxScale: 2.5,
    step: 0.5,
    ticks: [2.5, 2.0, 1.5, 1.0, 0.5, 0.0],
    unitLabel: 'KILL / DEATH',
    formatValue: (v) => (Number(v) || 0).toFixed(2),
  },
  kpr: {
    label: 'KPR',
    maxScale: 1.5,
    step: 0.3,
    ticks: [1.5, 1.2, 0.9, 0.6, 0.3, 0.0],
    unitLabel: 'KILLS / ROUND',
    formatValue: (v) => (Number(v) || 0).toFixed(2),
  },
  udr: {
    label: 'UDR',
    maxScale: 25,
    step: 5,
    ticks: [25, 20, 15, 10, 5, 0],
    unitLabel: 'UTIL DAMAGE / ROUND',
    formatValue: (v) => (Number(v) || 0).toFixed(1),
  },
  kast: {
    label: 'KAST',
    maxScale: 100,
    step: 20,
    ticks: [100, 80, 60, 40, 20, 0],
    unitLabel: 'KAST %',
    formatValue: (v) => `${(Number(v) || 0).toFixed(0)}%`,
  },
};

// Gera curva Bézier cúbica contínua (C curve)
function buildCubicPath(points: { x: number; y: number }[]): string {
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

export function RecentPerformanceChart({
  telemetryData,
}: RecentPerformanceChartProps) {
  const [sideFilter, setSideFilter] = useState<TacticalSideFilter>('BOTH');
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('hltv');
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPointInfo | null>(null);
  const [dbData, setDbData] = useState<RecentMatchTelemetry[] | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    if (!telemetryData && typeof window !== 'undefined') {
      fetch('/api/stats/player/76561198058500492')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isMounted && data?.telemetry && data.telemetry.length > 0) {
            setDbData(data.telemetry);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [telemetryData]);

  // Garante os 10 registros de partidas consumindo partidas salvas no banco + histórico local
  const matches = useMemo(() => {
    if (telemetryData && telemetryData.length > 0) {
      return telemetryData.slice(-10);
    }
    if (dbData && dbData.length > 0) {
      const merged = getSavedRecentTelemetry(
        dbData.map((t) => ({
          matchId: t.matchId,
          demoHash: t.matchId,
          savedAt: new Date().toISOString(),
          recentTelemetryEntry: t,
        })),
      );
      return merged.slice(-10);
    }
    const source = getSavedRecentTelemetry();
    return (source.length > 0 ? source : MOCK_RECENT_TELEMETRY).slice(-10);
  }, [telemetryData, dbData]);

  const config = METRIC_CONFIGS[selectedMetric];

  // Geometria da grade SVG: viewBox 0 0 1000 220
  const svgWidth = 1000;
  const svgHeight = 220;
  const paddingLeft = 45;
  const paddingRight = 65; // espaço para eixo Y à direita
  const paddingTop = 20;
  const paddingBottom = 25;

  const chartAreaWidth = svgWidth - paddingLeft - paddingRight;
  const chartAreaHeight = svgHeight - paddingTop - paddingBottom;

  // Mapeia valor numérico para coordenada Y no SVG
  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(config.maxScale, val));
    const ratio = clamped / (config.maxScale || 1);
    return paddingTop + chartAreaHeight - ratio * chartAreaHeight;
  };

  // Coordenadas X para cada uma das 10 partidas
  const getX = (index: number) => {
    if (matches.length <= 1) return paddingLeft + chartAreaWidth / 2;
    return paddingLeft + (index / (matches.length - 1)) * chartAreaWidth;
  };

  // Séries de pontos
  const overallPoints = useMemo(() => {
    return matches.map((m, i) => {
      const metricObj = m?.metrics?.[selectedMetric];
      const rawVal = metricObj?.overall;
      const val = typeof rawVal === 'number' ? rawVal : Number(rawVal) || 0;
      return {
        x: getX(i),
        y: getY(val),
        val,
      };
    });
  }, [matches, selectedMetric, config.maxScale]);

  const ctPoints = useMemo(() => {
    return matches.map((m, i) => {
      const metricObj = m?.metrics?.[selectedMetric];
      const rawVal = metricObj?.ct;
      const val = typeof rawVal === 'number' ? rawVal : Number(rawVal) || 0;
      return {
        x: getX(i),
        y: getY(val),
        val,
      };
    });
  }, [matches, selectedMetric, config.maxScale]);

  const tPoints = useMemo(() => {
    return matches.map((m, i) => {
      const metricObj = m?.metrics?.[selectedMetric];
      const rawVal = metricObj?.t;
      const val = typeof rawVal === 'number' ? rawVal : Number(rawVal) || 0;
      return {
        x: getX(i),
        y: getY(val),
        val,
      };
    });
  }, [matches, selectedMetric, config.maxScale]);

  // Caminhos das curvas Bézier
  const overallPath = useMemo(() => buildCubicPath(overallPoints), [overallPoints]);
  const ctPath = useMemo(() => buildCubicPath(ctPoints), [ctPoints]);
  const tPath = useMemo(() => buildCubicPath(tPoints), [tPoints]);

  // Cálculo da Média da Janela (Average Line) conforme lado selecionado
  const averageValue = useMemo(() => {
    if (!matches || matches.length === 0) return 0;
    const values = matches.map((m) => {
      const metricObj = m?.metrics?.[selectedMetric];
      if (!metricObj) return 0;
      if (sideFilter === 'CT') return typeof metricObj.ct === 'number' ? metricObj.ct : Number(metricObj.ct) || 0;
      if (sideFilter === 'T') return typeof metricObj.t === 'number' ? metricObj.t : Number(metricObj.t) || 0;
      return typeof metricObj.overall === 'number' ? metricObj.overall : Number(metricObj.overall) || 0;
    });
    const sum = values.reduce((acc, v) => acc + v, 0);
    return sum / (values.length || 1);
  }, [matches, selectedMetric, sideFilter]);

  const averageY = getY(averageValue);

  const activeMatch = hoveredPoint !== null ? matches[hoveredPoint.matchIndex] : null;

  const tooltipStyle = useMemo(() => {
    if (!hoveredPoint) return null;
    const xRatio = hoveredPoint.x / svgWidth;
    const yRatio = hoveredPoint.y / svgHeight;

    let transform = 'translate(-50%, -115%)';
    if (yRatio < 0.35) {
      transform = 'translate(-50%, 18px)';
    }
    if (xRatio > 0.75) {
      transform = 'translate(-105%, -50%)';
    } else if (xRatio < 0.22) {
      transform = 'translate(18px, -50%)';
    }

    return {
      left: `${(hoveredPoint.x / svgWidth) * 100}%`,
      top: `${(hoveredPoint.y / svgHeight) * 100}%`,
      transform,
    };
  }, [hoveredPoint, svgWidth, svgHeight]);

  return (
    <div
      data-testid="recent-performance-chart-container"
      className="w-full h-[370px] bg-[#0E1214] border border-[#1B2226] rounded-[2px] p-4 pb-3 flex flex-col justify-between select-none"
    >
      {/* 2. CABEÇALHO DE CONTROLES E FILTROS REATIVOS (h-7 flex items-center justify-between mb-4) */}
      <div className="h-7 flex items-center justify-between mb-4">
        {/* Lado Esquerdo — Seletores de Lado Tático (BOTH, T, CT) */}
        <div className="flex items-center gap-1.5" role="group" aria-label="Filtro de lado tático">
          {/* BOTH */}
          <button
            type="button"
            data-testid="side-filter-both"
            onClick={() => setSideFilter('BOTH')}
            className={`h-[26px] px-2.5 rounded-[2px] text-[10px] font-bold font-mono uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00FFA3] ${
              sideFilter === 'BOTH'
                ? 'bg-[#1A2328] border border-[#2A3840] text-text-primary'
                : 'bg-transparent border border-[#1B2226] text-text-secondary hover:text-text-primary'
            }`}
          >
            BOTH
          </button>

          {/* T */}
          <button
            type="button"
            data-testid="side-filter-t"
            onClick={() => setSideFilter('T')}
            className={`h-[26px] px-2.5 rounded-[2px] text-[10px] font-bold font-mono uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00FFA3] ${
              sideFilter === 'T'
                ? 'bg-[#26160A] border border-[#4A2A14] text-[#FF8C00]'
                : 'bg-transparent border border-[#1B2226] text-text-secondary hover:text-text-primary'
            }`}
          >
            T
          </button>

          {/* CT */}
          <button
            type="button"
            data-testid="side-filter-ct"
            onClick={() => setSideFilter('CT')}
            className={`h-[26px] px-2.5 rounded-[2px] text-[10px] font-bold font-mono uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00FFA3] ${
              sideFilter === 'CT'
                ? 'bg-[#0F1E2E] border border-[#1E3A5F] text-[#2979FF]'
                : 'bg-transparent border border-[#1B2226] text-text-secondary hover:text-text-primary'
            }`}
          >
            CT
          </button>
        </div>

        {/* Lado Direito — Seletores de Métrica (HLTV RATING, ADR, K/D, KPR, UDR, KAST) */}
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Seleção de métrica">
          {(['hltv', 'adr', 'kd', 'kpr', 'udr', 'kast'] as MetricKey[]).map((key) => {
            const isSelected = selectedMetric === key;
            const itemConfig = METRIC_CONFIGS[key];
            return (
              <button
                key={key}
                type="button"
                role="tab"
                data-testid={`metric-tab-${key}`}
                aria-selected={isSelected}
                onClick={() => setSelectedMetric(key)}
                className={`h-[26px] px-2.5 text-[10px] font-bold font-mono uppercase tracking-wider transition-colors rounded-[2px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00FFA3] ${
                  isSelected
                    ? 'bg-[#13191D] border border-white text-text-primary'
                    : 'bg-transparent border border-[#1B2226] text-text-secondary hover:text-text-primary hover:border-[#2A3840]'
                }`}
              >
                {itemConfig.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 & 4. GRID SVG RESPONSIVO COM CURVAS BÉZIER */}
      <div className="relative w-full flex-1 flex items-center justify-center">
        <svg
          role="img"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          aria-label="Recent match performance telemetry chart"
          className="w-full h-full overflow-visible"
        >
          {/* Linhas Horizontais de Escala (6 patamares) */}
          {config.ticks.map((tickVal) => {
            const y = getY(tickVal);
            return (
              <g key={tickVal}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + chartAreaWidth}
                  y2={y}
                  stroke="#192024"
                  strokeWidth="1"
                />
                {/* Rótulo Numérico do Eixo Y à Direita */}
                <text
                  x={paddingLeft + chartAreaWidth + 10}
                  y={y + 3.5}
                  className="text-[10px] font-mono fill-[#7E8F98]"
                  textAnchor="start"
                >
                  {config.formatValue(tickVal)}
                </text>
              </g>
            );
          })}

          {/* 10 Linhas Verticais Pontilhadas para as Partidas */}
          {matches.map((_, i) => {
            const x = getX(i);
            const isMatchHovered = hoveredPoint?.matchIndex === i;
            return (
              <line
                key={i}
                data-testid={`match-vertical-line-${i}`}
                x1={x}
                y1={paddingTop}
                x2={x}
                y2={paddingTop + chartAreaHeight}
                stroke={isMatchHovered ? '#00FFA3' : '#1A2226'}
                strokeWidth={isMatchHovered ? 1.5 : 1}
                strokeDasharray={isMatchHovered ? '2,2' : '3,3'}
                opacity={isMatchHovered ? 1 : 0.8}
                className="transition-colors duration-150"
              />
            );
          })}

          {/* Linha de Média da Janela (Average Line) */}
          <line
            x1={paddingLeft}
            y1={averageY}
            x2={paddingLeft + chartAreaWidth}
            y2={averageY}
            stroke="#8E9DA6"
            strokeWidth="1.25"
            strokeDasharray="4,4"
          />

          {/* Curva Azul: CT (visível em BOTH e CT) */}
          {(sideFilter === 'BOTH' || sideFilter === 'CT') && (
            <g data-testid="telemetry-series-ct">
              <path
                d={ctPath}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {ctPoints.map((pt, i) => {
                const isHovered = hoveredPoint?.matchIndex === i && hoveredPoint?.series === 'ct';
                return (
                  <g key={i}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 5.5 : 4.5}
                      fill="#0E1214"
                      stroke="#3B82F6"
                      strokeWidth={isHovered ? 2.5 : 2}
                      className="transition-all duration-150"
                    />
                    {/* Hitbox com raio r="15" */}
                    <circle
                      data-testid={`hitbox-ct-${i}`}
                      cx={pt.x}
                      cy={pt.y}
                      r="15"
                      fill="transparent"
                      className="cursor-pointer"
                      pointerEvents="all"
                      onMouseEnter={() =>
                        setHoveredPoint({
                          matchIndex: i,
                          series: 'ct',
                          x: pt.x,
                          y: pt.y,
                          val: pt.val,
                        })
                      }
                      onMouseLeave={() => setHoveredPoint(null)}
                      onFocus={() =>
                        setHoveredPoint({
                          matchIndex: i,
                          series: 'ct',
                          x: pt.x,
                          y: pt.y,
                          val: pt.val,
                        })
                      }
                      onBlur={() => setHoveredPoint(null)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Match ${i + 1} CT ${config.label}: ${config.formatValue(pt.val)}`}
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Curva Laranja: TR (visível em BOTH e T) */}
          {(sideFilter === 'BOTH' || sideFilter === 'T') && (
            <g data-testid="telemetry-series-t">
              <path
                d={tPath}
                fill="none"
                stroke="#F97316"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {tPoints.map((pt, i) => {
                const isHovered = hoveredPoint?.matchIndex === i && hoveredPoint?.series === 't';
                return (
                  <g key={i}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 5.5 : 4.5}
                      fill="#0E1214"
                      stroke="#F97316"
                      strokeWidth={isHovered ? 2.5 : 2}
                      className="transition-all duration-150"
                    />
                    {/* Hitbox com raio r="15" */}
                    <circle
                      data-testid={`hitbox-t-${i}`}
                      cx={pt.x}
                      cy={pt.y}
                      r="15"
                      fill="transparent"
                      className="cursor-pointer"
                      pointerEvents="all"
                      onMouseEnter={() =>
                        setHoveredPoint({
                          matchIndex: i,
                          series: 't',
                          x: pt.x,
                          y: pt.y,
                          val: pt.val,
                        })
                      }
                      onMouseLeave={() => setHoveredPoint(null)}
                      onFocus={() =>
                        setHoveredPoint({
                          matchIndex: i,
                          series: 't',
                          x: pt.x,
                          y: pt.y,
                          val: pt.val,
                        })
                      }
                      onBlur={() => setHoveredPoint(null)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Match ${i + 1} T ${config.label}: ${config.formatValue(pt.val)}`}
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Linha Branca: Overall Match Performance (apenas em BOTH) */}
          {sideFilter === 'BOTH' && (
            <g data-testid="telemetry-series-overall">
              <path
                d={overallPath}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {overallPoints.map((pt, i) => {
                const isHovered = hoveredPoint?.matchIndex === i && hoveredPoint?.series === 'overall';
                return (
                  <g key={i}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 5.5 : 4.5}
                      fill="#0E1214"
                      stroke="#FFFFFF"
                      strokeWidth={isHovered ? 2.5 : 2}
                      className="transition-all duration-150"
                    />
                    {/* Hitbox com raio r="15" */}
                    <circle
                      data-testid={`hitbox-overall-${i}`}
                      cx={pt.x}
                      cy={pt.y}
                      r="15"
                      fill="transparent"
                      className="cursor-pointer"
                      pointerEvents="all"
                      onMouseEnter={() =>
                        setHoveredPoint({
                          matchIndex: i,
                          series: 'overall',
                          x: pt.x,
                          y: pt.y,
                          val: pt.val,
                        })
                      }
                      onMouseLeave={() => setHoveredPoint(null)}
                      onFocus={() =>
                        setHoveredPoint({
                          matchIndex: i,
                          series: 'overall',
                          x: pt.x,
                          y: pt.y,
                          val: pt.val,
                        })
                      }
                      onBlur={() => setHoveredPoint(null)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Match ${i + 1} Overall ${config.label}: ${config.formatValue(pt.val)}`}
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Rótulo de Unidade Rotacionado (-90 graus) à direita */}
          <text
            x={-(paddingTop + chartAreaHeight / 2)}
            y={svgWidth - 4}
            transform="rotate(-90)"
            className="text-[9px] font-bold uppercase tracking-widest fill-[#7E8F98]"
            textAnchor="middle"
          >
            {config.unitLabel}
          </text>
        </svg>

        {/* Badge de Média na Extremidade Direita da Linha de Média */}
        <div
          data-testid="chart-average-badge"
          style={{
            top: `${(averageY / svgHeight) * 100}%`,
            right: `${(paddingRight / svgWidth) * 100}%`,
            transform: 'translate(100%, -50%)',
          }}
          className="absolute bg-[#0B0E0F] border border-[#1B2226] rounded-[2px] px-1.5 py-0.5 text-[9px] font-mono font-bold text-white pointer-events-none whitespace-nowrap shadow-sm"
        >
          Average: {config.formatValue(averageValue)}
        </div>

        {/* Tooltip Interativo Flutuante */}
        {hoveredPoint && activeMatch && tooltipStyle && (
          <div
            data-testid="match-tooltip"
            style={{
              left: tooltipStyle.left,
              top: tooltipStyle.top,
              transform: tooltipStyle.transform,
            }}
            className="absolute pointer-events-none select-none z-30 bg-[#0B0E0F] border border-[#2A353D] rounded-[2px] p-2.5 min-w-[145px] shadow-[0_4px_16px_rgba(0,0,0,0.6)] backdrop-blur-sm transition-opacity duration-150"
          >
            {/* Topo: data da partida (`match.date`) em 10px font-mono text-[#7E8F98] */}
            <div data-testid="tooltip-date" className="text-[10px] font-mono text-[#7E8F98] leading-tight">
              {activeMatch.date}
            </div>

            {/* Linha 2: mapa em caixa alta seguido do logo e nome do adversário ANUBIS ( [logo 14x14] Falcons ) em 12px font-bold text-white */}
            <div
              data-testid="tooltip-matchup"
              className="text-[12px] font-bold text-white flex items-center gap-1.5 mt-1 whitespace-nowrap leading-none"
            >
              <span>{activeMatch.mapName.toUpperCase()} (</span>
              <img
                src={activeMatch.opponentLogoUrl || `/teams/${activeMatch.opponentSlug || 'unknown'}.svg`}
                alt={`${activeMatch.opponentTeam} logo`}
                width={14}
                height={14}
                className="w-3.5 h-3.5 object-contain inline-block shrink-0"
              />
              <span>{activeMatch.opponentTeam} )</span>
            </div>

            {/* Linha 3: placar da partida (${teamScore} - ${opponentScore}) em 12px font-bold font-mono, em verde (#00FFA3) para vitória ou vermelho (#EF4444) para derrota */}
            {(() => {
              const teamScore =
                activeMatch.teamScore ??
                (activeMatch.score ? parseInt(activeMatch.score.split('-')[0].trim(), 10) : 13);
              const opponentScore =
                activeMatch.opponentScore ??
                (activeMatch.score ? parseInt(activeMatch.score.split('-')[1].trim(), 10) : 9);
              const isWin =
                activeMatch.result === 'W' ||
                (typeof activeMatch.teamScore === 'number' &&
                  typeof activeMatch.opponentScore === 'number' &&
                  activeMatch.teamScore > activeMatch.opponentScore) ||
                teamScore > opponentScore;

              return (
                <div
                  data-testid="tooltip-score"
                  className={`text-[12px] font-bold font-mono tabular-nums mt-1 leading-none ${
                    isWin ? 'text-[#00FFA3]' : 'text-[#EF4444]'
                  }`}
                >
                  {teamScore} - {opponentScore}
                </div>
              );
            })()}

            {/* Bloco inferior: traço lateral de 2px à esquerda (border-l-2), valor numérico grande (16px font-bold text-white) e rótulo da métrica selecionada em 9px uppercase text-[#7E8F98] */}
            <div
              data-testid="tooltip-metric"
              className="mt-2.5 pt-0.5 border-l-2 border-[#00FFA3] pl-2 flex flex-col justify-center"
            >
              <span className="text-base font-bold text-white font-mono tabular-nums leading-none">
                {config.formatValue(hoveredPoint.val)}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-[#7E8F98] font-mono mt-1">
                {config.label}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 5. RODAPÉ TÁTICO: 10 PARTIDAS E ADVERSÁRIOS */}
      <div className="w-full flex justify-between pt-2 border-t border-[#1B2226]/60 mt-1">
        {matches.map((match, i) => {
          const overallVal = match.metrics?.[selectedMetric]?.overall ?? 0;
          const isColHovered = hoveredPoint?.matchIndex === i;
          return (
            <div
              key={match.matchId}
              data-testid={`match-col-${i}`}
              onMouseEnter={() => {
                const targetSeries = sideFilter === 'CT' ? 'ct' : sideFilter === 'T' ? 't' : 'overall';
                const seriesVal = match.metrics?.[selectedMetric]?.[targetSeries] ?? overallVal;
                setHoveredPoint({
                  matchIndex: i,
                  series: targetSeries,
                  x: getX(i),
                  y: getY(seriesVal),
                  val: seriesVal,
                });
              }}
              onMouseLeave={() => setHoveredPoint(null)}
              className={`group flex-1 flex flex-col items-center justify-center text-center min-w-0 px-1 py-1 rounded-[1px] transition-colors duration-150 cursor-pointer ${
                isColHovered ? 'bg-[#141C20]' : 'hover:bg-[#141A1D]/40'
              }`}
            >
              {/* Linha 1: Nome do Mapa */}
              <span
                className={`text-[10px] font-bold font-mono uppercase truncate w-full transition-colors ${
                  isColHovered ? 'text-[#00FFA3]' : 'text-text-secondary'
                }`}
              >
                {match.mapName}
              </span>

              {/* Linha 2: Rating Global da Linha Branca */}
              <span className="text-[12px] font-bold font-mono text-text-primary tabular-nums mt-0.5">
                {config.formatValue(overallVal)}
              </span>

              {/* Linha 3: Logotipo do Adversário */}
              <OpponentLogo
                opponentTeam={match.opponentTeam}
                opponentSlug={match.opponentSlug}
                logoUrl={match.opponentLogoUrl || undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

