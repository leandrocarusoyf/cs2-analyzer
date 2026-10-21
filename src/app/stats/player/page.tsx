import React from 'react';
import { getPlayerPerformance, getAllRegisteredPlayers } from '../../../lib/queries/matches.ts';
import type { PlayerPerformanceResult } from '../../../types/stats.ts';
import PlayerStatsClient from './PlayerStatsClient.tsx';

export const dynamic = 'force-dynamic';

export default async function PlayerPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  let performanceData: PlayerPerformanceResult | null = null;

  try {
    const resolvedParams = props.searchParams ? await props.searchParams : {};
    const selectedPlayerId =
      (typeof resolvedParams?.steamId === 'string' && resolvedParams.steamId) ||
      (typeof resolvedParams?.player === 'string' && resolvedParams.player) ||
      (typeof resolvedParams?.targetPlayerId === 'string' && resolvedParams.targetPlayerId) ||
      (await getAllRegisteredPlayers())[0]?.steamId || '';
    if (!selectedPlayerId) return <div className="p-8 text-zinc-400">Importe uma demo para analisar os jogadores.</div>;

    performanceData = await getPlayerPerformance(selectedPlayerId);
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest === 'DYNAMIC_SERVER_USAGE') {
      throw error;
    }
    console.error('[STATS_PLAYER_PAGE_ERROR]:', error);
  }

  const selectedKey = performanceData?.steamId || performanceData?.nickname || 'default';

  return (
    <React.Suspense fallback={<div className="p-6 text-slate-400">Carregando estatísticas...</div>}>
      <PlayerStatsClient key={selectedKey} initialPerformance={performanceData} />
    </React.Suspense>
  );
}
