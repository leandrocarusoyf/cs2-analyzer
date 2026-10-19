'use client';

import React from 'react';
import type { MapPerformanceStat } from '../../types/analytics.ts';

export const DEFAULT_MAPS_STATS: MapPerformanceStat[] = [
  {
    mapName: 'de_mirage',
    matchesPlayed: 12,
    winRatePct: 66.7,
    avgRating: 1.28,
    ctStats: { winRatePct: 61.5, rating: 1.24, adr: 86.4 },
    tStats: { winRatePct: 72.0, rating: 1.32, adr: 89.2 },
    ratingHistory: [1.18, 1.35, 1.22, 1.41],
  },
  {
    mapName: 'de_inferno',
    matchesPlayed: 8,
    winRatePct: 62.5,
    avgRating: 1.19,
    ctStats: { winRatePct: 58.0, rating: 1.15, adr: 80.1 },
    tStats: { winRatePct: 67.0, rating: 1.23, adr: 83.5 },
    ratingHistory: [1.1, 1.25, 1.15, 1.26],
  },
  {
    mapName: 'de_nuke',
    matchesPlayed: 6,
    winRatePct: 50.0,
    avgRating: 1.14,
    ctStats: { winRatePct: 64.0, rating: 1.22, adr: 84.0 },
    tStats: { winRatePct: 36.0, rating: 1.06, adr: 72.5 },
    ratingHistory: [1.05, 1.2, 1.12, 1.19],
  },
  {
    mapName: 'de_ancient',
    matchesPlayed: 5,
    winRatePct: 60.0,
    avgRating: 1.21,
    ctStats: { winRatePct: 62.0, rating: 1.25, adr: 85.0 },
    tStats: { winRatePct: 58.0, rating: 1.17, adr: 78.4 },
    ratingHistory: [1.15, 1.28, 1.2],
  },
  {
    mapName: 'de_anubis',
    matchesPlayed: 4,
    winRatePct: 50.0,
    avgRating: 1.16,
    ctStats: { winRatePct: 45.0, rating: 1.08, adr: 76.2 },
    tStats: { winRatePct: 55.0, rating: 1.24, adr: 88.0 },
    ratingHistory: [1.12, 1.2],
  },
  {
    mapName: 'de_dust2',
    matchesPlayed: 4,
    winRatePct: 75.0,
    avgRating: 1.31,
    ctStats: { winRatePct: 70.0, rating: 1.29, adr: 88.5 },
    tStats: { winRatePct: 80.0, rating: 1.33, adr: 91.0 },
    ratingHistory: [1.25, 1.37],
  },
  {
    mapName: 'de_cache',
    matchesPlayed: 3,
    winRatePct: 33.3,
    avgRating: 1.05,
    ctStats: { winRatePct: 40.0, rating: 1.02, adr: 71.0 },
    tStats: { winRatePct: 26.6, rating: 1.08, adr: 74.8 },
    ratingHistory: [1.02, 1.08],
  },
];

export interface TabMapsProps {
  mapsStats?: MapPerformanceStat[];
}

export function TabMaps({ mapsStats = DEFAULT_MAPS_STATS }: TabMapsProps) {
  return (
    <div data-testid="tab-maps-content" className="space-y-4 select-none">
      {/* Cabeçalho de Seção com Barra Neon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[#00FFA3] font-mono font-bold text-sm">/</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Map Performance Telemetry
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[#6B7A82] uppercase tracking-wider">
          ACTIVE DUTY POOL + CACHE
        </span>
      </div>

      {/* Cards de Mapas Competitivos */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {mapsStats.map((m) => {
          const isHighWin = m.winRatePct >= 50;
          return (
            <div
              key={m.mapName}
              className="flex flex-col justify-between rounded-[2px] border border-[#1F2629] bg-[#111618] p-3.5 transition-colors hover:border-[#6B7A82]/50"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-black tracking-wide text-white uppercase">
                    {m.mapName.replace('de_', '')}
                  </span>
                  <span
                    className={`rounded-[2px] px-2 py-0.5 text-xs font-mono font-bold tabular-nums ${
                      isHighWin
                        ? 'border border-[#00FFA3]/30 bg-[#00FFA3]/10 text-[#00FFA3]'
                        : 'border border-[#FF4757]/30 bg-[#FF4757]/10 text-[#FF4757]'
                    }`}
                  >
                    {m.winRatePct.toFixed(1)}% Win
                  </span>
                </div>

                {/* Tactical win rate bar */}
                <div className="mt-2.5 h-1.5 w-full bg-[#0B0E0F] border border-[#1F2629]">
                  <div
                    style={{ width: `${Math.min(100, m.winRatePct)}%` }}
                    className={`h-full ${isHighWin ? 'bg-[#00FFA3]' : 'bg-[#FF4757]'}`}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#1F2629] pt-2.5 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-[#6B7A82] uppercase tracking-wider">
                    Partidas
                  </span>
                  <p className="font-mono text-sm font-bold text-white tabular-nums">
                    {m.matchesPlayed}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-[#6B7A82] uppercase tracking-wider">
                    Rating Médio
                  </span>
                  <p className="font-mono text-sm font-bold text-[#00FFA3] tabular-nums">
                    {m.avgRating.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabela Comparativa Lado CT vs Lado TR */}
      <div className="overflow-hidden rounded-[2px] border border-[#1F2629] bg-[#111618]">
        <div className="border-b border-[#1F2629] bg-[#111618] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[#00FFA3] font-mono font-bold text-sm">/</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Divisão Rigorosa de Desempenho: Lado CT vs. Lado TR
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#6B7A82] uppercase tracking-wider">
            SIDE BY SIDE MATRIX
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white">
            <thead className="border-b border-[#1F2629] bg-[#0B0E0F] text-[#6B7A82] font-mono uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-2.5">Mapa</th>
                <th className="px-3 py-2.5">Jogos</th>
                <th className="px-3 py-2.5 text-[#00FFA3]">Rating Geral</th>
                <th className="px-3 py-2.5 text-[#2979FF]">CT Win Rate</th>
                <th className="px-3 py-2.5 text-[#2979FF]">CT Rating</th>
                <th className="px-3 py-2.5 text-[#2979FF]">CT ADR</th>
                <th className="px-3 py-2.5 text-[#FF8C00]">TR Win Rate</th>
                <th className="px-3 py-2.5 text-[#FF8C00]">TR Rating</th>
                <th className="px-4 py-2.5 text-right text-[#FF8C00]">TR ADR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2629]/60 font-mono text-xs">
              {mapsStats.map((m) => (
                <tr
                  key={m.mapName}
                  data-testid={`map-row-${m.mapName}`}
                  className="hover:bg-[#0B0E0F]/80 transition-colors"
                >
                  <td className="px-4 py-2.5 font-bold text-white uppercase">
                    {m.mapName}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-white">
                    {m.matchesPlayed}
                  </td>
                  <td className="px-3 py-2.5 font-bold tabular-nums text-[#00FFA3]">
                    {m.avgRating.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-[#2979FF]">
                    {m.ctStats.winRatePct.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-[#2979FF]">
                    {m.ctStats.rating.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-[#2979FF]">
                    {m.ctStats.adr.toFixed(1)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-[#FF8C00]">
                    {m.tStats.winRatePct.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-[#FF8C00]">
                    {m.tStats.rating.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-right text-[#FF8C00]">
                    {m.tStats.adr.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default TabMaps;
