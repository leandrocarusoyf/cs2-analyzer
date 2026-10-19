'use client';

import React from 'react';

export interface PlayerStatRow {
  steamId: string;
  nickname: string;
  team: string;
  rating?: number | null;
  adr?: number | null;
  kd?: number | null;
  kills?: number;
  deaths?: number;
  assists?: number;
  kast?: number | null;
  ttd?: number | null;
  ttk?: number | null;
  fsp?: number | null;
}

export interface PlayerStatsTableProps {
  players: PlayerStatRow[];
  title?: string;
}

export function PlayerStatsTable({
  players,
  title = 'Estatísticas Avançadas dos Jogadores',
}: PlayerStatsTableProps) {
  return (
    <div
      data-testid="player-stats-table"
      className="w-full bg-[#111618] border border-[#1F2629] rounded-[2px] overflow-hidden select-none"
    >
      {title && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1F2629] bg-[#0E1214]">
          <div className="flex items-center gap-2">
            <span className="text-[#00FFA3] font-mono font-bold text-xs">/</span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              {title}
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#6B7A82] uppercase">
            Foco: Rating • K/D • TTK • FSP
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1F2629] bg-[#0B0E0F] text-[10px] font-mono font-bold text-[#6B7A82] uppercase tracking-wider">
              <th className="py-2.5 px-3">Jogador</th>
              <th className="py-2.5 px-2 text-center">Time</th>
              <th className="py-2.5 px-2 text-right">Rating</th>
              <th className="py-2.5 px-2 text-right">K - D</th>
              <th className="py-2.5 px-2 text-right">K/D</th>
              <th className="py-2.5 px-2 text-right">ADR</th>
              <th className="py-2.5 px-2 text-right">KAST</th>
              <th className="py-2.5 px-2 text-right text-[#2979FF]">TTK</th>
              <th className="py-2.5 px-2 text-right">TTD</th>
              <th className="py-2.5 px-3 text-right text-[#00FFA3]">FSP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F2629]/60 text-xs font-mono">
            {players.map((p) => {
              const kills = p.kills ?? 0;
              const deaths = p.deaths ?? 0;
              const calculatedKd =
                p.kd !== undefined && p.kd !== null
                  ? p.kd
                  : deaths > 0
                  ? Number((kills / deaths).toFixed(2))
                  : kills;
              const diff = kills - deaths;
              const isPositiveDiff = diff > 0;

              return (
                <tr
                  key={p.steamId}
                  data-testid={`player-row-${p.steamId}`}
                  className="hover:bg-[#141C20] transition-colors"
                >
                  {/* Jogador */}
                  <td className="py-2 px-3">
                    <span className="font-bold text-white block truncate">{p.nickname}</span>
                    <span className="text-[9px] text-[#6B7A82] block truncate">
                      {p.steamId}
                    </span>
                  </td>

                  {/* Time */}
                  <td className="py-2 px-2 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold uppercase ${
                        p.team.toLowerCase().includes('furia')
                          ? 'bg-[#00FFA3]/10 text-[#00FFA3] border border-[#00FFA3]/30'
                          : 'bg-[#2979FF]/10 text-[#2979FF] border border-[#2979FF]/30'
                      }`}
                    >
                      {p.team}
                    </span>
                  </td>

                  {/* Rating */}
                  <td className="py-2 px-2 text-right font-bold text-white tabular-nums">
                    {p.rating !== null && p.rating !== undefined
                      ? p.rating.toFixed(2)
                      : '—'}
                  </td>

                  {/* K - D (Diff) */}
                  <td className="py-2 px-2 text-right tabular-nums">
                    <span className="text-white">
                      {kills}/{deaths}
                    </span>
                    <span
                      className={`ml-1 text-[10px] ${
                        isPositiveDiff
                          ? 'text-[#00FFA3]'
                          : diff < 0
                          ? 'text-[#EF4444]'
                          : 'text-[#6B7A82]'
                      }`}
                    >
                      ({isPositiveDiff ? `+${diff}` : diff})
                    </span>
                  </td>

                  {/* K/D */}
                  <td className="py-2 px-2 text-right font-bold tabular-nums text-white">
                    {calculatedKd.toFixed(2)}
                  </td>

                  {/* ADR */}
                  <td className="py-2 px-2 text-right tabular-nums text-[#8E9DA6]">
                    {p.adr !== null && p.adr !== undefined ? p.adr.toFixed(1) : '—'}
                  </td>

                  {/* KAST */}
                  <td className="py-2 px-2 text-right tabular-nums text-[#8E9DA6]">
                    {p.kast !== null && p.kast !== undefined ? `${p.kast.toFixed(1)}%` : '—'}
                  </td>

                  {/* TTK (Foco Principal de Combate) */}
                  <td className="py-2 px-2 text-right tabular-nums font-bold text-[#2979FF]">
                    {p.ttk !== null && p.ttk !== undefined ? `${Math.round(p.ttk)} ms` : '—'}
                  </td>

                  {/* TTD (Tratamento de Nulos com Traço —) */}
                  <td
                    data-testid={`player-ttd-${p.steamId}`}
                    className="py-2 px-2 text-right tabular-nums text-[#6B7A82]"
                  >
                    {p.ttd === null || p.ttd === undefined ? '—' : `${Math.round(p.ttd)} ms`}
                  </td>

                  {/* FSP (Precisão do Primeiro Tiro) */}
                  <td className="py-2 px-3 text-right tabular-nums font-bold text-[#00FFA3]">
                    {p.fsp !== null && p.fsp !== undefined
                      ? `${p.fsp.toFixed(1)}%`
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PlayerStatsTable;

