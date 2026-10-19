'use client';

import React from 'react';
import type { BuyTypeStats } from '../../types/analytics.ts';
import { getWeaponIconPath } from '../../utils/icon-mapper.ts';

export const DEFAULT_BUY_STATS: BuyTypeStats = {
  equalBuy: { rounds: 142, winRatePct: 53.5, rating: 1.18 },
  betterBuy: { rounds: 86, winRatePct: 74.4, rating: 1.45 },
  worseBuy: { rounds: 52, winRatePct: 28.8, rating: 0.88 },
  ecoAdrImpact: {
    withKillsAdr: 64.2,
    withoutKillsAdr: 18.5,
  },
};

export interface TabBuyTypesProps {
  buyStats?: BuyTypeStats;
}

export function TabBuyTypes({ buyStats = DEFAULT_BUY_STATS }: TabBuyTypesProps) {
  const buyScenarios = [
    {
      id: 'equal',
      title: 'Equal Buy',
      subtitle: 'Full vs Full / Armamento Equivalente',
      desc: 'Ambas as equipas possuem armamento completo ou force buy equivalente.',
      data: buyStats.equalBuy,
      color: '#2979FF',
      primaryIcon: getWeaponIconPath('ak47'),
      opponentIcon: getWeaponIconPath('m4a1_silencer'),
      primaryWeapon: 'AK-47',
      opponentWeapon: 'M4A1-S',
      bars: [45, 60, 52, 70, 55, 65, 58, 62, 53],
    },
    {
      id: 'better',
      title: 'Better Buy',
      subtitle: 'Vantagem Económica / Full vs Eco',
      desc: 'Equipa com equipamento superior ao adversário (ex: Full Buy vs Eco / Half Buy).',
      data: buyStats.betterBuy,
      color: '#00FFA3',
      primaryIcon: getWeaponIconPath('ak47'),
      opponentIcon: getWeaponIconPath('glock'),
      primaryWeapon: 'AK-47',
      opponentWeapon: 'Glock-18',
      bars: [75, 88, 70, 92, 80, 85, 95, 74, 82],
    },
    {
      id: 'worse',
      title: 'Worse Buy',
      subtitle: 'Desvantagem Económica / Eco vs Full',
      desc: 'Equipa em situação desfavorável (ex: Eco / Pistoletas vs Full Buy).',
      data: buyStats.worseBuy,
      color: '#FF8C00',
      primaryIcon: getWeaponIconPath('glock'),
      opponentIcon: getWeaponIconPath('m4a1_silencer'),
      primaryWeapon: 'Glock-18',
      opponentWeapon: 'M4A1-S',
      bars: [30, 25, 38, 22, 28, 35, 18, 29, 24],
    },
  ];

  return (
    <div data-testid="tab-buy-types-content" className="space-y-4 select-none">
      {/* Gráfico Comparativo para Cenários de Compra */}
      <div className="rounded-[2px] border border-[#1F2629] bg-[#111618] p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[#00FFA3] font-mono font-bold text-sm">/</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Desempenho por Cenário Económico (Taxa de Vitória & Rating)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#6B7A82] uppercase tracking-wider">
            ECONOMY TELEMETRY
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {buyScenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="flex flex-col justify-between rounded-[2px] border border-[#1F2629] bg-[#0B0E0F] p-4 transition-colors hover:border-[#6B7A82]/40"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      style={{ backgroundColor: scenario.color }}
                      className="inline-block h-2 w-2 rounded-none"
                    />
                    <span
                      style={{ color: scenario.color }}
                      className="font-mono text-xs font-bold tracking-wider uppercase"
                    >
                      {scenario.title}
                    </span>
                  </div>
                  {/* Micro Weapon Matchup */}
                  <div className="flex items-center gap-1 rounded-[2px] border border-[#1F2629] bg-[#111618] px-1.5 py-0.5">
                    <img
                      src={scenario.primaryIcon}
                      alt={scenario.primaryWeapon}
                      className="h-3 w-5 object-contain opacity-90 invert brightness-200"
                    />
                    <span className="text-[9px] font-mono font-bold text-[#6B7A82]">vs</span>
                    <img
                      src={scenario.opponentIcon}
                      alt={scenario.opponentWeapon}
                      className="h-3 w-5 object-contain opacity-60 invert brightness-200"
                    />
                  </div>
                </div>

                <p className="mt-1 font-mono text-[11px] text-[#6B7A82] leading-snug">
                  {scenario.subtitle}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-[#6B7A82]/80">
                  {scenario.desc}
                </p>
              </div>

              <div className="mt-5 space-y-3 pt-3 border-t border-[#1F2629]">
                {/* Win Rate & Equalizer */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono text-[#6B7A82] uppercase tracking-wider">
                      Taxa de Vitória
                    </span>
                    <span
                      style={{ color: scenario.color }}
                      className="font-mono font-bold tabular-nums text-sm"
                    >
                      {scenario.data.winRatePct.toFixed(1)}%
                    </span>
                  </div>

                  {/* Tactical segmented progress bar */}
                  <div className="mt-1.5 flex h-2 w-full gap-0.5 rounded-none bg-[#111618] p-0.5 border border-[#1F2629]">
                    <div
                      style={{
                        width: `${Math.min(100, scenario.data.winRatePct)}%`,
                        backgroundColor: scenario.color,
                      }}
                      className="h-full rounded-none transition-all"
                    />
                  </div>
                </div>

                {/* Métricas Numéricas & Equalizer Mini-Telemetry */}
                <div className="flex items-center justify-between pt-2 border-t border-[#1F2629]/60">
                  <div>
                    <span className="text-[10px] font-mono text-[#6B7A82] uppercase tracking-wider">
                      Rondas
                    </span>
                    <p className="font-mono text-sm font-bold text-white tabular-nums">
                      {scenario.data.rounds}
                    </p>
                  </div>

                  {/* Telemetry Equalizer Bars */}
                  <div className="flex items-end gap-[2px] h-5">
                    {scenario.bars.map((bar, bIdx) => (
                      <div
                        key={bIdx}
                        style={{ height: `${bar}%` }}
                        className="w-[3px] rounded-none bg-[#1F2629] hover:bg-[#00FFA3] transition-colors"
                      />
                    ))}
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-[#6B7A82] uppercase tracking-wider">
                      Rating Médio
                    </span>
                    <p
                      style={{ color: scenario.color }}
                      className="font-mono text-sm font-bold tabular-nums"
                    >
                      {scenario.data.rating.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparativo Lateral: Impacto de ADR em Rondas Económicas */}
      <div className="rounded-[2px] border border-[#1F2629] bg-[#111618] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[#00FFA3] font-mono font-bold text-sm">/</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Impacto de ADR em Rondas Económicas / Semi-Eco
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#6B7A82] uppercase tracking-wider">
            DAMAGE EFFICIENCY
          </span>
        </div>
        <p className="text-xs font-mono text-[#6B7A82] mb-4">
          Dano causado ao adversário quando a equipa está em desvantagem de armamento.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Card com abates */}
          <div className="rounded-[2px] border border-[#1F2629] bg-[#0B0E0F] p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-[#00FFA3] uppercase tracking-wider">
                Com Abates Registados (ADR com Kills)
              </span>
              <span className="rounded-[2px] border border-[#00FFA3]/30 bg-[#00FFA3]/10 px-2 py-0.5 text-[10px] font-mono font-bold text-[#00FFA3]">
                ALTO IMPACTO RESIDUAL
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-mono text-3xl font-black text-white tabular-nums">
                {buyStats.ecoAdrImpact.withKillsAdr.toFixed(1)}
              </span>
              <span className="font-mono text-xs text-[#6B7A82]">ADR MÉDIO</span>
            </div>

            <div className="mt-2.5 h-1.5 w-full bg-[#111618] border border-[#1F2629]">
              <div
                style={{ width: `${Math.min(100, (buyStats.ecoAdrImpact.withKillsAdr / 100) * 100)}%` }}
                className="h-full bg-[#00FFA3]"
              />
            </div>

            <p className="mt-3 text-[11px] font-mono text-[#6B7A82] leading-relaxed">
              Gera quebra económica severa no adversário mesmo em rondas perdidas.
            </p>
          </div>

          {/* Card sem abates */}
          <div className="rounded-[2px] border border-[#1F2629] bg-[#0B0E0F] p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-[#6B7A82] uppercase tracking-wider">
                Sem Abates Registados (ADR sem Kills)
              </span>
              <span className="rounded-[2px] border border-[#1F2629] bg-[#111618] px-2 py-0.5 text-[10px] font-mono font-semibold text-[#6B7A82]">
                CHIP DAMAGE ONLY
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-mono text-3xl font-black text-[#6B7A82] tabular-nums">
                {buyStats.ecoAdrImpact.withoutKillsAdr.toFixed(1)}
              </span>
              <span className="font-mono text-xs text-[#6B7A82]">ADR MÉDIO</span>
            </div>

            <div className="mt-2.5 h-1.5 w-full bg-[#111618] border border-[#1F2629]">
              <div
                style={{ width: `${Math.min(100, (buyStats.ecoAdrImpact.withoutKillsAdr / 100) * 100)}%` }}
                className="h-full bg-[#6B7A82]"
              />
            </div>

            <p className="mt-3 text-[11px] font-mono text-[#6B7A82] leading-relaxed">
              Rondas sem impacto estrutural na economia contrária.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TabBuyTypes;
