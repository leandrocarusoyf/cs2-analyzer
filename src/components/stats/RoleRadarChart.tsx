'use client';

import React from 'react';
import type { RadarAxisPoint } from '../../types/roles.ts';

export interface RoleRadarChartProps {
  points: RadarAxisPoint[];
  comparisonPoints?: RadarAxisPoint[];
  showComparison?: boolean;
}

export function RoleRadarChart({
  points,
  comparisonPoints,
  showComparison = false,
}: RoleRadarChartProps) {
  // Geometria da teia do Radar (~330px de envergadura total)
  const width = 450;
  const height = 330;
  const cx = width / 2;
  const cy = height / 2;
  const radius = 108; // raio da teia a 100%

  const totalAxes = points && points.length > 0 ? points.length : 10;
  const gridLevels = [25, 50, 75, 100];

  const getCoordinates = (index: number, pct: number) => {
    const angle = (index * 2 * Math.PI) / (totalAxes || 1) - Math.PI / 2;
    const safePct = typeof pct === 'number' && !isNaN(pct) ? pct : 0;
    const r = (Math.max(0, Math.min(100, safePct)) / 100) * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      angle,
    };
  };

  const getLabelCoordinates = (index: number) => {
    const angle = (index * 2 * Math.PI) / (totalAxes || 1) - Math.PI / 2;
    // Afastamento do rótulo entre 8px e 12px da borda da teia
    const labelR = radius + 11;
    return {
      x: cx + labelR * Math.cos(angle),
      y: cy + labelR * Math.sin(angle),
      angle,
    };
  };

  // Polígono do Jogador
  const safePoints = points || [];
  const playerPointsString = safePoints
    .map((pt, i) => {
      const coord = getCoordinates(i, pt.normalizedPct);
      return `${coord.x.toFixed(1)},${coord.y.toFixed(1)}`;
    })
    .join(' ');

  // Polígono de Comparação
  const safeComparisonPoints = comparisonPoints || [];
  const comparisonPointsString = comparisonPoints
    ? safeComparisonPoints
        .map((pt, i) => {
          const coord = getCoordinates(i, pt.normalizedPct);
          return `${coord.x.toFixed(1)},${coord.y.toFixed(1)}`;
        })
        .join(' ')
    : '';

  return (
    <div className="relative w-full flex items-center justify-center select-none py-1">
      <svg
        role="img"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-[450px] h-[310px] overflow-visible"
        aria-label="10-axis role performance radar chart"
      >
        {/* Linhas da teia interna: polígonos concêntricos em #1E262A com espessura 1px */}
        {gridLevels.map((lvl) => {
          const pts = Array.from({ length: totalAxes })
            .map((_, i) => {
              const coord = getCoordinates(i, lvl);
              return `${coord.x.toFixed(1)},${coord.y.toFixed(1)}`;
            })
            .join(' ');
          return (
            <polygon
              key={lvl}
              points={pts}
              fill="none"
              stroke="#1E262A"
              strokeWidth="1"
            />
          );
        })}

        {/* Raios dos 10 eixos canónicos */}
        {Array.from({ length: totalAxes }).map((_, i) => {
          const coord = getCoordinates(i, 100);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={coord.x}
              y2={coord.y}
              stroke="#1E262A"
              strokeWidth="1"
            />
          );
        })}

        {/* Polígono de Comparação (se ativo) */}
        {showComparison && comparisonPointsString && (
          <>
            <polygon
              points={comparisonPointsString}
              fill="rgba(142, 156, 163, 0.08)"
              stroke="#8E9CA3"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            {comparisonPoints!.map((pt, i) => {
              const coord = getCoordinates(i, pt.normalizedPct);
              return (
                <circle
                  key={`comp-${pt.axis}`}
                  cx={coord.x}
                  cy={coord.y}
                  r="2"
                  fill="#8E9CA3"
                  stroke="#FFFFFF"
                  strokeWidth="1"
                />
              );
            })}
          </>
        )}

        {/* Polígono do Atleta: stroke #00FFA3 1.5px e preenchimento rgba(0, 255, 163, 0.14) */}
        <polygon
          points={playerPointsString}
          fill="rgba(0, 255, 163, 0.14)"
          stroke="#00FFA3"
          strokeWidth="1.5"
        />

        {/* Vértices e Valores nos Vértices */}
        {safePoints.map((pt, i) => {
          const coord = getCoordinates(i, pt.normalizedPct);

          // Deslocamento sutil do valor para ficar logo acima do ponto
          const valOffsetX = Math.cos(coord.angle) * 7;
          const valOffsetY = Math.sin(coord.angle) * 7 - 5;

          return (
            <g key={`vertex-${pt.axis}`}>
              {/* Marcadores circulares de 4px x 4px com borda branca e preenchimento #00FFA3 */}
              <circle
                cx={coord.x}
                cy={coord.y}
                r="2"
                fill="#00FFA3"
                stroke="#FFFFFF"
                strokeWidth="1"
              />
              {/* Valores nos Vértices: text-[10px] font-bold font-mono fill-white tabular-nums */}
              <text
                x={coord.x + valOffsetX}
                y={coord.y + valOffsetY}
                textAnchor="middle"
                className="text-[10px] font-bold font-mono fill-white tabular-nums select-none"
              >
                {pt.formattedValue}
              </text>
            </g>
          );
        })}

        {/* Rótulos Externos dos Eixos: text-[10px] font-medium fill-[#8E9CA3] select-none */}
        {safePoints.map((pt, i) => {
          const lbl = getLabelCoordinates(i);
          const cos = Math.cos(lbl.angle);
          const sin = Math.sin(lbl.angle);

          let textAnchor: 'start' | 'middle' | 'end' = 'middle';
          if (cos > 0.25) textAnchor = 'start';
          else if (cos < -0.25) textAnchor = 'end';

          let dominantBaseline: 'auto' | 'middle' | 'hanging' = 'middle';
          if (sin > 0.35) dominantBaseline = 'hanging';
          else if (sin < -0.35) dominantBaseline = 'auto';

          return (
            <text
              key={`lbl-${pt.axis}`}
              x={lbl.x}
              y={lbl.y}
              textAnchor={textAnchor}
              dominantBaseline={dominantBaseline}
              className="text-[10px] font-medium fill-[#8E9CA3] select-none"
            >
              {pt.axis}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export default RoleRadarChart;

