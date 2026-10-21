'use client';
import React from 'react';
import {getWeaponIconPath} from '../../utils/icon-mapper.ts';
import type {WeaponPerformanceStat} from '../../types/analytics.ts';
export function TabWeapons({rows=[]}:{rows?:Array<{name:string;kills:number;damage:number}>;weapons?:WeaponPerformanceStat[]}) {
return <section data-testid="tab-weapons-content" className="overflow-x-auto border border-border-subtle"><h2 className="p-5 text-sm font-semibold">Desempenho por arma</h2>{!rows.length?<p className="p-5 text-sm text-zinc-400">Sem eventos de armas disponíveis.</p>:<table className="w-full text-sm"><thead><tr className="metric-label border-y border-border-subtle"><th className="p-3 text-left">Arma</th><th className="p-3 text-right">Eliminações</th><th className="p-3 text-right">Dano</th></tr></thead><tbody>{rows.map(r=><tr key={r.name} className="border-b border-border-subtle hover:bg-surface"><th className="flex items-center gap-4 p-4 text-left font-medium"><img src={getWeaponIconPath(r.name)} className="h-5 w-12 object-contain opacity-80" alt=""/>{r.name.replace('weapon_','')}</th><td className="p-4 text-right font-mono tabular-nums">{r.kills}</td><td className="p-4 text-right font-mono tabular-nums">{r.damage}</td></tr>)}</tbody></table>}</section>;
}
