'use client';

import React, { useState, useEffect } from 'react';
import { getTeamRegion } from '../../utils/teamRegions';
import type { ValveRegion, ValveStandingItem } from '../../types/home-data';
import { VALVE_REGIONS } from '../../types/home-data';

export interface ValveStandingsCardProps {
  standingsByRegion?: Record<ValveRegion, ValveStandingItem[]>;
  initialRegion?: ValveRegion;
}

type RankingTab = ValveRegion | 'GERAL';
const RANKING_TABS: RankingTab[] = ['GERAL', ...VALVE_REGIONS];
const regionLabel = (region: RankingTab) => region === 'ASIA' ? 'ÁSIA' : region;

export function ValveStandingsCard({
  standingsByRegion,
  initialRegion = 'SA',
}: ValveStandingsCardProps) {
  const [activeRegion, setActiveRegion] = useState<RankingTab>(initialRegion);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEligibility, setShowEligibility] = useState(false);
  const [data, setData] = useState<Record<ValveRegion, ValveStandingItem[]> | null>(
    standingsByRegion ?? null
  );
  const [isLoading, setIsLoading] = useState<boolean>(!standingsByRegion);

  // Sync if props update
  useEffect(() => {
    if (standingsByRegion) {
      setData(standingsByRegion);
      setIsLoading(false);
    }
  }, [standingsByRegion]);

  // Client-side fetch fallback if props were not passed
  useEffect(() => {
    if (data) return;

    let isMounted = true;
    setIsLoading(true);

    fetch('/api/rankings/vrs')
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao carregar ranking da Valve');
        return res.json();
      })
      .then((standingsData) => {
        if (isMounted) {
          setData(standingsData);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('[ValveStandingsCard] Erro ao buscar ranking:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [data]);

  const unified = new Map<string, ValveStandingItem>();
  if (data) for (const region of VALVE_REGIONS) for (const team of data[region] ?? []) {
    const key = (team.team_name ?? team.name).trim().toLowerCase();
    const existing = unified.get(key);
    if (!existing || existing.points < team.points) unified.set(key, team);
  }
  const allTeams = activeRegion === 'GERAL'
    ? [...unified.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name)).map((team, index) => ({ ...team, rank: index + 1 }))
    : data?.[activeRegion] ?? [];
  const teams = allTeams.slice(0, isExpanded ? 10 : 5);

  const renderTeam = (team: ValveStandingItem, index?: number) => (
    <div
      key={`${team.rank ?? index ?? 0}-${team.name}-${team.region ?? activeRegion}`}
      className="flex items-center justify-between gap-3 p-space-sm rounded bg-surface-container hover:bg-surface-container-high transition-colors"
    >
      <div className="flex items-center gap-space-sm min-w-0">
        <span className={`font-mono tabular-nums font-bold w-5 text-center shrink-0 ${team.rank === 1 ? 'text-primary-container' : 'text-on-surface-variant'}`}>{team.rank}</span>
        <div className="min-w-0"><p className="font-card-header text-card-header font-bold truncate">{team.name}</p><p className="text-xs text-on-surface-variant">{getTeamRegion(team.name, team.region ?? activeRegion)}</p></div>
      </div>
      <div className="font-mono tabular-nums text-right shrink-0"><span className="text-sm font-bold">{team.points.toLocaleString('pt-BR')}</span><span className="text-xs text-on-surface-variant ml-1">pts</span><span className={`block text-xs ${team.change_type === 'up' ? 'text-emerald-400' : team.change_type === 'down' ? 'text-red-400' : 'text-on-surface-variant'}`}>{team.change === 0 ? '—' : team.change}</span></div>
    </div>
  );

  const qualificationGroups = [
    { name: 'Legends', start: 0, end: 3, className: 'border-yellow-500/50', color: 'text-yellow-300' },
    { name: 'Challengers', start: 3, end: 6, className: 'border-cyan-500/50', color: 'text-cyan-300' },
    { name: 'Contenders', start: 6, end: 10, className: 'border-emerald-500/50', color: 'text-emerald-300' },
  ];

  return (
    <div className="bg-surface-container-low rounded-xl p-space-md shadow-lg flex flex-col gap-space-md select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-space-xs">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-primary-container text-[20px]">public</span>
          <div>
            <h3 className="font-card-header text-card-header uppercase tracking-wider text-on-surface font-bold">
              VALVE REGIONAL STANDINGS
            </h3>
            <span className="font-benchmark-label text-benchmark-label text-outline uppercase">
              {activeRegion === 'GERAL' ? 'GERAL • POR PONTUAÇÃO' : `${regionLabel(activeRegion)} REGIONAL`} • VALVE OFICIAL
            </span>
          </div>
        </div>
        <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-benchmark-label text-benchmark-label font-bold">
          TOP {isExpanded ? '10' : '5'}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-surface-container-lowest rounded-lg border border-outline-variant/30">
        {RANKING_TABS.map((region) => {
          const isActive = region === activeRegion;
          return (
            <button
              key={region}
              type="button"
              aria-pressed={isActive}
              onClick={() => { setActiveRegion(region); setShowEligibility(false); }}
              className={`flex-1 py-1 px-2 rounded font-benchmark-label text-benchmark-label uppercase transition-all text-center ${
                isActive
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-[0_0_10px_rgba(0,229,255,0.25)]'
                  : 'bg-transparent hover:bg-surface-container text-outline hover:text-on-surface transition-colors'
              }`}
            >
              {regionLabel(region)}
            </button>
          );
        })}
      </div>

      {/* Standings Table / List */}
      <div className="flex flex-col gap-1.5 min-h-[220px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-outline font-stat-mono-md text-xs">
            <span className="material-symbols-outlined animate-spin text-[24px] text-primary-container">sync</span>
            <span>Carregando ranking regional...</span>
          </div>
        ) : teams.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-outline text-xs font-mono">
            Nenhum dado disponível para {activeRegion}
          </div>
        ) : (
          showEligibility && isExpanded ? (
            <React.Fragment key="eligibility-container">
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Simulação visual de elegibilidade · grupos ilustrativos por posição, sem confirmação de vagas para o Major.
              </p>
              {qualificationGroups.map((group) => {
                const qualified = teams.slice(group.start, group.end);
                return qualified.length ? (
                  <section key={group.name} aria-label={group.name} className={`border rounded p-2 ${group.className}`}>
                    <h4 className={`text-xs font-bold mb-2 ${group.color}`}>{group.name}</h4>
                    <div className="space-y-1">{qualified.map((team, idx) => renderTeam(team, idx))}</div>
                  </section>
                ) : null;
              })}
            </React.Fragment>
          ) : (
            teams.map((team, idx) => renderTeam(team, idx))
          )
        )}
      </div>

      {allTeams.length > 5 && <button type="button" aria-expanded={isExpanded} onClick={() => { setIsExpanded(value => !value); setShowEligibility(false); }} className="py-3 text-xs font-bold uppercase text-primary-container hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-container">
        {isExpanded ? 'VER APENAS TOP 5' : 'VER TABELA COMPLETA (TOP 10)'}
      </button>}
      {isExpanded && teams.length === 10 && <button type="button" aria-expanded={showEligibility} onClick={() => setShowEligibility(value => !value)} className="py-3 px-2 border border-outline-variant/50 text-xs text-on-surface-variant hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-container">
        {showEligibility ? 'Ocultar elegibilidade' : 'Mostrar elegíveis para o prox major'}
      </button>}
    </div>
  );
}

export default ValveStandingsCard;
