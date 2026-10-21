'use client';
import React from 'react';
import type {MapPerformanceStat} from '../../types/analytics.ts';
export function TabMaps({rows=[]}:{rows?:Array<{name:string;rounds:number;rating:number|null;adr:number|null;kills:number;deaths:number}>;maps?:MapPerformanceStat[]}) {
return <section data-testid="tab-maps-content" className="overflow-x-auto border border-border-subtle"><h2 className="p-5 text-sm font-semibold">Desempenho por mapa</h2>{!rows.length?<p className="p-5 text-sm text-zinc-400">Nenhum mapa disponível.</p>:<table className="w-full text-sm"><thead><tr className="metric-label border-y border-border-subtle">{['Mapa','Rounds','Rating estimado','ADR','K / D'].map(h=><th key={h} className="p-3 text-right first:text-left">{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={`${r.name}-${i}`} className="border-b border-border-subtle hover:bg-surface"><th className="p-4 text-left font-medium capitalize">{r.name.replace('de_','')}</th>{[r.rounds,r.rating?.toFixed(2)??'—',r.adr?.toFixed(1)??'—',`${r.kills} / ${r.deaths}`].map((v,j)=><td key={j} className="p-4 text-right font-mono tabular-nums">{v}</td>)}</tr>)}</tbody></table>}</section>;
}
