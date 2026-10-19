import React from 'react';
import { getPlayerPerformance } from '../../../lib/queries/matches.ts';
import type { PlayerPerformanceResult } from '../../../types/stats.ts';
import PlayerStatsClient from './PlayerStatsClient.tsx';

export const dynamic = 'force-dynamic';

export default async function PlayerPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  let performanceData: PlayerPerformanceResult | null = null;

  try {
    const resolvedParams = props.searchParams ? await props.searchParams : {};
    const steamId =
      typeof resolvedParams?.steamId === 'string'
        ? resolvedParams.steamId
        : '76561198058500492';

    performanceData = await getPlayerPerformance(steamId);
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest === 'DYNAMIC_SERVER_USAGE') {
      throw error;
    }
    console.error('[STATS_PLAYER_PAGE_ERROR]:', error);
  }

  return (
    <React.Suspense fallback={<div className="p-6 text-slate-400">Carregando estatísticas...</div>}>
      <PlayerStatsClient initialPerformance={performanceData} />
    </React.Suspense>
  );
}
