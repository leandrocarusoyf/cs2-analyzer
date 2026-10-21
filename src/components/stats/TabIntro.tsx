'use client';
import React from 'react';
import type {PlayerOverviewStats} from '../../types/analytics.ts';
import type {RecentMatchTelemetry} from '../../types/stats.ts';
import {RecentPerformanceChart} from './RecentPerformanceChart.tsx';
import {PlayerAvatar} from './PlayerAvatar.tsx';
import {TabBuyTypes} from './TabBuyTypes.tsx';

export interface TabIntroProps {overview?:PlayerOverviewStats;telemetryData?:RecentMatchTelemetry[];buyTypes?:BuyRow[]}
export interface BuyRow {name:string;rounds:number;winRatePct:number;adr:number;kd:number}
export function TabIntro({overview,telemetryData=[],buyTypes=[]}:TabIntroProps) {
  if(!overview) return <p className="py-12 text-sm text-zinc-400">Selecione um jogador com partidas importadas.</p>;
  const metrics=[['Rating estimado',overview.currentRating.toFixed(2)],['ADR',overview.adr.toFixed(1)],['K/D',overview.kd.toFixed(2)],['KAST',`${overview.kastPct.toFixed(1)}%`]];
  const latest=telemetryData.at(-1);
  return <div data-testid="tab-intro-content" className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-6 border-b border-border-subtle pb-6">
      <div className="flex items-center gap-4"><PlayerAvatar playerName={overview.name} avatarUrl={overview.avatarUrl}/><div><h1 className="text-3xl font-semibold tracking-tight">{overview.name}</h1><p className="mt-1 text-sm text-zinc-400">{overview.teamName}</p></div></div>
      <dl className="flex gap-8"><div><dt className="metric-label">Mapas analisados</dt><dd className="mt-2 font-mono tabular-nums text-xl">{overview.matchesCount}</dd></div><div><dt className="metric-label">Último confronto</dt><dd className="mt-2 text-sm">{latest?`${latest.opponentTeam} · ${latest.mapName}`:'—'}<span className="ml-3 font-mono tabular-nums text-accent">{latest?.score}</span></dd></div></dl>
    </header>
    <dl className="grid grid-cols-2 gap-y-6 sm:grid-cols-4">{metrics.map(([label,value])=><div key={label} className="border-l border-border-subtle px-5 first:border-l-0 first:pl-0"><dt className="metric-label">{label}</dt><dd className="mt-2 font-mono tabular-nums text-3xl font-medium">{value}</dd></div>)}</dl>
    <RecentPerformanceChart telemetryData={telemetryData}/>
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]"><TabBuyTypes rows={buyTypes} compact/><section className="border border-border-subtle bg-surface-card p-5"><h2 className="text-sm font-semibold">Tempo de resposta</h2><dl className="mt-6 grid grid-cols-2 gap-5">{[['Tempo até dano',overview.ttd],['Tempo até eliminação',overview.ttk]].map(([label,value])=><div key={String(label)}><dt className="metric-label">{label}</dt><dd className="mt-2 font-mono tabular-nums text-2xl" data-testid={label==='Tempo até dano'?'player-ttd':undefined}>{value==null?'—':`${Math.round(Number(value))} ms`}</dd></div>)}</dl><p className="mt-6 text-xs leading-relaxed text-zinc-500">Calculado nos duelos registrados. Métricas sem eventos suficientes permanecem indisponíveis.</p></section></div>
  </div>;
}
