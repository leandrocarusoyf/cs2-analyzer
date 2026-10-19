import React from 'react';
import Link from 'next/link';
import { getRecentMatches } from '../../lib/queries/matches.ts';

const FALLBACK_MATCHES = [
  {
    id: '54e43847-2490-4751-9981-831bf7cf367c',
    mapName: 'de_inferno',
    team1: 'FURIA',
    team2: 'Aurora',
    score1: 13,
    score2: 10,
    winner: 'FURIA',
    roundsCount: 23,
    playedAt: '18/10/2026',
  },
];

export default async function MatchesCatalogPage() {
  const dbMatches = await getRecentMatches(10);

  const matches =
    dbMatches.length > 0
      ? dbMatches.map((m) => {
          const dateStr = m.match_date
            ? new Date(m.match_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
            : '18/10/2026';
          return {
            id: m.id,
            mapName: m.map_name || 'de_inferno',
            team1: m.team1,
            team2: m.team2,
            score1: m.score_t1,
            score2: m.score_t2,
            winner: m.winner,
            roundsCount: m.rounds_count || m.score_t1 + m.score_t2,
            playedAt: dateStr,
          };
        })
      : FALLBACK_MATCHES;

  return (
    <section aria-labelledby="matches-heading" className="space-y-4 select-none">
      <div className="flex items-center justify-between border-b border-[#1F2629] pb-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[#00FFA3] font-mono font-bold text-sm">/</span>
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#6B7A82] uppercase">
              Match Telemetry Index
            </span>
          </div>
          <h1 id="matches-heading" className="text-lg font-black text-white uppercase italic tracking-tight">
            Catálogo de Partidas (Matches)
          </h1>
          <p className="text-xs font-mono text-[#6B7A82]">
            Histórico de demos processadas com acesso rápido ao Match Overview e ao 2D Replayer.
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        {matches.map((match) => {
          const isFuriaWinner = match.winner?.toUpperCase() === match.team1.toUpperCase();

          return (
            <article
              key={match.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-[2px] border border-[#1F2629] bg-[#111618] p-4 transition-colors hover:border-[#6B7A82]/50"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-[2px] border border-[#1F2629] bg-[#0B0E0F] px-2 py-0.5 text-[11px] font-mono font-bold text-[#00FFA3] uppercase">
                    {match.mapName}
                  </span>
                  <span className="text-xs font-mono text-[#6B7A82]">{match.playedAt}</span>
                  {match.winner && (
                    <span className="rounded-[2px] border border-[#00FFA3]/30 bg-[#00FFA3]/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#00FFA3] uppercase">
                      Vitória: {match.winner}
                    </span>
                  )}
                </div>
                <p className="text-sm font-mono font-bold text-white">
                  {match.team1}{' '}
                  <span className={isFuriaWinner ? 'text-[#00FFA3]' : 'text-[#2979FF]'}>
                    {match.score1}
                  </span>{' '}
                  :{' '}
                  <span className={!isFuriaWinner ? 'text-[#00FFA3]' : 'text-[#FF8C00]'}>
                    {match.score2}
                  </span>{' '}
                  {match.team2}
                </p>
                <p className="text-xs font-mono text-[#6B7A82]">{match.roundsCount} rounds registrados</p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/matches/${match.id}`}
                  className="rounded-[2px] border border-[#1F2629] bg-[#0B0E0F] px-3 py-1.5 text-xs font-mono font-semibold text-white hover:border-[#6B7A82] transition-colors"
                >
                  Match Overview
                </Link>
                <Link
                  href={`/replayer/${match.id}`}
                  className="rounded-[2px] border border-[#00FFA3] bg-[#00FFA3] px-3 py-1.5 text-xs font-mono font-bold text-[#0B0E0F] hover:bg-[#00FFA3]/90 transition-colors uppercase"
                >
                  Abrir 2D Replayer
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
