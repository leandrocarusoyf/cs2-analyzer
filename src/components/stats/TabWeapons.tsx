'use client';

import React from 'react';
import type { WeaponPerformanceStat } from '../../types/analytics.ts';
import { getWeaponIconPath } from '../../utils/icon-mapper.ts';

export const DEFAULT_WEAPONS_STATS: WeaponPerformanceStat[] = [
  {
    weaponId: 7,
    weaponName: 'AK-47',
    usagePct: 44.5,
    roundsPlayed: 184,
    adr: 92.4,
    roundWinRatePct: 58.2,
    openingDuelsCount: 42,
    economyRating: 112.5,
    damagePerDollar: 0.1125,
  },
  {
    weaponId: 16,
    weaponName: 'M4A1-S',
    usagePct: 28.0,
    roundsPlayed: 116,
    adr: 81.6,
    roundWinRatePct: 55.4,
    openingDuelsCount: 22,
    economyRating: 98.2,
    damagePerDollar: 0.0982,
  },
  {
    weaponId: 9,
    weaponName: 'AWP',
    usagePct: 12.5,
    roundsPlayed: 52,
    adr: 74.0,
    roundWinRatePct: 61.5,
    openingDuelsCount: 28,
    economyRating: 72.0,
    damagePerDollar: 0.072,
  },
  {
    weaponId: 4,
    weaponName: 'Galil AR',
    usagePct: 7.5,
    roundsPlayed: 31,
    adr: 68.5,
    roundWinRatePct: 45.2,
    openingDuelsCount: 6,
    economyRating: 125.4,
    damagePerDollar: 0.1254,
  },
  {
    weaponId: 61,
    weaponName: 'USP-S',
    usagePct: 7.5,
    roundsPlayed: 31,
    adr: 54.0,
    roundWinRatePct: 52.0,
    openingDuelsCount: 14,
    economyRating: 180.0,
    damagePerDollar: 0.18,
  },
];

export interface TabWeaponsProps {
  weapons?: WeaponPerformanceStat[];
}

export function TabWeapons({ weapons = DEFAULT_WEAPONS_STATS }: TabWeaponsProps) {
  // Encontrar as 2 armas mais utilizadas para os cartões de destaque
  const topWeapons = [...weapons].sort((a, b) => b.usagePct - a.usagePct).slice(0, 2);
  const maxDpd = Math.max(...weapons.map((w) => w.economyRating), 150);

  return (
    <div data-testid="tab-weapons-content" className="space-y-4 select-none">
      {/* Cabeçalho de Seção com Barra Neon */}
      <div className="flex items-center gap-1.5">
        <span className="text-[#00FFA3] font-mono font-bold text-sm">/</span>
        <span className="text-white text-xs font-bold uppercase tracking-wider">
          Weapons Analytics & Telemetry
        </span>
      </div>

      {/* Destaque das Principais Armas */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {topWeapons.map((w) => (
          <div
            key={w.weaponId}
            className="flex items-center justify-between rounded-[2px] border border-[#1F2629] bg-[#111618] p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-[2px] border border-[#1F2629] bg-[#0B0E0F] p-1">
                <img
                  src={getWeaponIconPath(w.weaponName)}
                  alt={w.weaponName}
                  className="max-h-7 max-w-full object-contain brightness-0 invert opacity-90"
                  data-testid="top-weapon-icon"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black italic tracking-tight text-white uppercase">
                    {w.weaponName}
                  </span>
                  <span className="rounded-[2px] bg-[#00FFA3]/10 border border-[#00FFA3]/30 px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#00FFA3]">
                    {w.usagePct.toFixed(1)}% uso
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-mono text-[#6B7A82]">
                  {w.roundsPlayed} rondas • {w.openingDuelsCount} aberturas
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono font-semibold text-[#6B7A82] uppercase tracking-wider">
                Economy Rating
              </span>
              <p className="text-lg font-mono font-black text-[#00FFA3] tabular-nums">
                {w.economyRating.toFixed(1)}
              </p>
              <span className="text-[9px] font-mono text-[#6B7A82]">Dano / $1.000</span>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico de Barras Horizontais: Custo-Benefício */}
      <div className="rounded-[2px] border border-[#1F2629] bg-[#111618] p-4">
        <div className="mb-3 flex items-center gap-1.5 border-b border-[#1F2629] pb-2">
          <span className="text-[#00FFA3] font-mono font-bold text-xs">/</span>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Cost-Benefit Ratio (Economy Rating)
          </h3>
        </div>
        <div className="space-y-2.5">
          {weapons.map((w) => {
            const barWidth = Math.min(100, (w.economyRating / maxDpd) * 100);
            return (
              <div key={w.weaponId} className="flex items-center gap-3 text-xs">
                <span className="w-20 font-mono font-bold text-white truncate text-[11px]">
                  {w.weaponName}
                </span>
                <div className="flex-1 rounded-none bg-[#0B0E0F] border border-[#1F2629] h-2.5 overflow-hidden">
                  <div
                    style={{ width: `${barWidth}%` }}
                    className="h-full rounded-none bg-[#00FFA3]"
                  />
                </div>
                <span className="w-24 text-right font-mono font-bold text-white tabular-nums text-[11px]">
                  {w.economyRating.toFixed(1)} pts
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabela Analítica Completa de Armas */}
      <div className="overflow-hidden rounded-[2px] border border-[#1F2629] bg-[#111618]">
        <div className="border-b border-[#1F2629] bg-[#0B0E0F] px-4 py-2.5 flex items-center gap-1.5">
          <span className="text-[#00FFA3] font-mono font-bold text-xs">/</span>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Armas & Métricas Consolidadas
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white">
            <thead className="border-b border-[#1F2629] bg-[#0B0E0F] text-[#6B7A82] uppercase text-[10px] font-mono">
              <tr>
                <th className="px-4 py-2.5">Arma</th>
                <th className="px-3 py-2.5">Uso (%)</th>
                <th className="px-3 py-2.5">ADR</th>
                <th className="px-3 py-2.5">Win Rate (%)</th>
                <th className="px-3 py-2.5">Aberturas</th>
                <th className="px-3 py-2.5">Rondas</th>
                <th className="px-3 py-2.5">Economy Rating</th>
                <th className="px-4 py-2.5 text-right">Dano / $</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2629]">
              {weapons.map((w) => (
                <tr
                  key={w.weaponId}
                  data-testid={`weapon-row-${w.weaponId}`}
                  className="hover:bg-white/5 transition-colors font-mono"
                >
                  <td className="px-4 py-2.5 font-bold text-white">
                    <div className="flex items-center gap-2">
                      <img
                        src={getWeaponIconPath(w.weaponName)}
                        alt={w.weaponName}
                        className="h-3.5 max-w-[28px] object-contain brightness-0 invert opacity-80"
                        data-testid={`weapon-table-icon-${w.weaponId}`}
                      />
                      <span>{w.weaponName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{w.usagePct.toFixed(1)}%</td>
                  <td className="px-3 py-2.5 font-semibold text-[#00FFA3] tabular-nums">
                    {w.adr.toFixed(1)}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-[#2979FF] tabular-nums">
                    {w.roundWinRatePct.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{w.openingDuelsCount}</td>
                  <td className="px-3 py-2.5 text-[#6B7A82] tabular-nums">{w.roundsPlayed}</td>
                  <td className="px-3 py-2.5 font-bold text-white tabular-nums">
                    {w.economyRating.toFixed(1)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[#6B7A82] tabular-nums">
                    {w.damagePerDollar.toFixed(4)}
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

export default TabWeapons;
