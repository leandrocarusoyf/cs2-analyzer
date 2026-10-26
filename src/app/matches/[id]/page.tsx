import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getMatchById } from '../../../lib/queries/matches.ts';
import { PlayerStatsTable, type PlayerStatRow } from '../../../components/stats/PlayerStatsTable.tsx';

export interface MatchOverviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchOverviewPage({ params }: MatchOverviewPageProps) {
  const resolvedParams = await params;
  const matchId = resolvedParams.id;

  const currentMatch = await getMatchById(matchId);
  if (!currentMatch) notFound();
  const mapName = currentMatch.map_name || '—';
  const team1 = currentMatch.team1;
  const team2 = currentMatch.team2;
  const selectedMap = currentMatch.maps?.find(m=>m.id===matchId);
  const score1 = selectedMap?.rounds_t1 ?? currentMatch.score_t1;
  const score2 = selectedMap?.rounds_t2 ?? currentMatch.score_t2;
  const winner = currentMatch.winner;
  const roundsCount = selectedMap ? score1+score2 : currentMatch.rounds_count || 0;

  // KPIs agregados dos duelos
  const players: PlayerStatRow[] = (currentMatch?.players || []).map((p) => {
    const metrics = p.metrics_json || {};
    const gen = metrics.general || {};
    const aim = metrics.aim || {};

    return {
      steamId: p.player_steamid,
      nickname: p.nickname,
      team: p.team,
      rating: p.rating,
      adr: p.adr,
      kast: p.kast,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      ttd: p.ttd,
      ttk: p.ttk,
      k2: gen.k2 ?? 0,
      k3: gen.k3 ?? 0,
      k4: gen.k4 ?? 0,
      k5: gen.k5 ?? 0,
      spottedAccuracy: aim.spottedAccuracy ?? null,
      crosshairPlacement: aim.crosshairPlacement ?? null,
      headAccuracy: aim.headAccuracy ?? null,
      hsKillPct: aim.hsKillPct ?? null,
      firstBullet: aim.firstBullet ?? null,
      sprayAccuracy: aim.sprayAccuracy ?? null,
      counterStrafing: aim.counterStrafing ?? null,
      accuracyAll: aim.accuracyAll ?? null,
      metrics_json: metrics,
    };
  });

  const ttdList = players.map((p) => p.ttd).filter((v): v is number => typeof v === 'number');
  const ttkList = players.map((p) => p.ttk).filter((v): v is number => typeof v === 'number');

  const avgTtd = ttdList.length > 0 ? Math.round(ttdList.reduce((a, b) => a + b, 0) / ttdList.length) : null;
  const avgTtk = ttkList.length > 0 ? Math.round(ttkList.reduce((a, b) => a + b, 0) / ttkList.length) : null;

  return (
    <section aria-labelledby="match-overview-heading" className="space-y-4 select-none">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1F2629] pb-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[#00FFA3] font-mono font-bold text-sm">/</span>
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#6B7A82] uppercase">
              Post-Match Analytics
            </span>
          </div>
          <h1 id="match-overview-heading" className="text-lg font-black text-white uppercase italic tracking-tight">
            {team1} {score1} x {score2} {team2} ({mapName})
          </h1>
          <p className="text-xs font-mono text-[#6B7A82]">
            Vencedor: <span className="text-[#00FFA3] font-bold">{winner}</span> • {roundsCount} rounds registrados • Partida #{matchId}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/matches"
            className="rounded-[2px] border border-[#1F2629] bg-[#0B0E0F] px-3 py-1.5 text-xs font-mono font-semibold text-white hover:border-[#6B7A82] transition-colors"
          >
            ← Voltar ao Catálogo
          </Link>
          <Link
            href={`/replayer/${matchId}`}
            className="rounded-[2px] border border-[#00FFA3] bg-[#00FFA3] px-3.5 py-1.5 text-xs font-mono font-bold text-[#0B0E0F] hover:bg-[#00FFA3]/90 transition-colors uppercase"
          >
            Inspecionar no 2D Replayer →
          </Link>
        </div>
      </div>

      {/* Grid de KPIs Globais */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Global Avg TTD: Traço '—' quando null */}
        <div className="rounded-[2px] border border-[#1F2629] bg-[#111618] p-4">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#6B7A82]">
            Global Avg TTD
          </span>
          <p className="mt-1 text-2xl font-mono font-bold text-white tabular-nums">
            {avgTtd === null ? '—' : `${avgTtd} ms`}
          </p>
          <div className="mt-2 h-1 w-full bg-[#0B0E0F] border border-[#1F2629]">
            <div className="h-full bg-[#6B7A82]" style={{ width: avgTtd === null ? '0%' : '45%' }} />
          </div>
        </div>

        {/* Global Avg TTK */}
        <div className="rounded-[2px] border border-[#1F2629] bg-[#111618] p-4">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#6B7A82]">
            Global Avg TTK
          </span>
          <p className="mt-1 text-2xl font-mono font-bold text-white tabular-nums">
            {avgTtk !== null ? `${avgTtk} ms` : '—'}
          </p>
          <div className="mt-2 h-1 w-full bg-[#0B0E0F] border border-[#1F2629]">
            <div className="h-full bg-[#2979FF]" style={{ width: '60%' }} />
          </div>
        </div>
      </div>

      {/* Tabela de Estatísticas Avançadas dos Jogadores */}
      {players.length > 0 && (
        <div className="mt-4">
          <PlayerStatsTable
            players={players}
            title={`Estatísticas Individuais — ${team1} vs ${team2}`}
            team1Name={team1}
            team2Name={team2}
            winnerTeam={winner ?? undefined}
            totalRounds={roundsCount}
            matchId={matchId}
          />
        </div>
      )}
    </section>
  );
}
