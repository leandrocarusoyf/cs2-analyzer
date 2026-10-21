'use client';
import React from 'react';
import type {BuyTypeStats} from '../../types/analytics.ts';
import type {BuyRow} from './TabIntro.tsx';
export interface TabBuyTypesProps {rows?:BuyRow[];buyStats?:BuyTypeStats;compact?:boolean}
export function TabBuyTypes({rows=[],compact=false}:TabBuyTypesProps) {
 return <section data-testid="tab-buy-types-content" className="min-w-0 border border-border-subtle bg-surface-card">
  <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-4 border-b border-border-subtle"><h2 className="text-sm font-semibold">Buy Types Performance</h2><span className="text-[10px] uppercase tracking-wider text-zinc-500">Economia por round</span></div>
  {rows.length===0?<p className="p-5 text-sm text-zinc-400">Sem dados de compras para este jogador.</p>:<div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-[10px] uppercase tracking-wider text-zinc-500"><th className="px-5 py-3 font-medium">Cenário</th>{['Rounds','Vitórias','ADR','K/D'].map(h=><th key={h} className="px-3 py-3 text-right font-medium">{h}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.name} className="border-t border-border-subtle hover:bg-surface-active"><th className="px-5 py-4 font-medium"><span className="block text-zinc-200">{row.name}</span>{!compact&&<span className="mt-1 block text-[10px] font-normal text-zinc-500">{row.name==='Equal Buy'?'Equipamento equivalente':row.name==='Better Buy'?'Vantagem de equipamento':row.name==='Worse Buy'?'Desvantagem de equipamento':'Round de pistolas'}</span>}</th><td className="px-3 text-right font-mono tabular-nums">{row.rounds}</td><td className="px-3 text-right font-mono tabular-nums text-accent">{row.winRatePct.toFixed(1)}%</td><td className="px-3 text-right font-mono tabular-nums">{row.adr.toFixed(1)}</td><td className="px-3 text-right font-mono tabular-nums">{row.kd.toFixed(2)}</td></tr>)}</tbody></table></div>}
 </section>;
}
