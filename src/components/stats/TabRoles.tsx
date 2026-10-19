'use client';

import React, { useMemo, useState } from 'react';
import type { PlayerRoleAnalyticsDTO, RoleFilterType } from '../../types/roles.ts';
import {
  DEFAULT_PLAYER_ROLE_ANALYTICS,
  getPlayerRoleAnalytics,
  NIKO_ROLE_ANALYTICS,
} from '../../data/roles-mock.ts';
import { RoleRadarChart } from './RoleRadarChart.tsx';
import { RoleTable } from './RoleTable.tsx';

export interface TabRolesProps {
  data?: PlayerRoleAnalyticsDTO;
  playerName?: string;
}

const ROW_1_PILLS: RoleFilterType[] = [
  'All',
  'CT Allround',
  'Anchor',
  'Rotation',
  'T Allround',
];

const ROW_2_PILLS: RoleFilterType[] = ['Lurk', 'Half Lurk', 'Pack'];

export function TabRoles({ data, playerName }: TabRolesProps) {
  // Dados do Jogador Ativo (dinâmicos via props ou mocks externos)
  const [activePlayerName, setActivePlayerName] = useState<string>(
    data?.playerName || playerName || 'kscerato',
  );
  const [showComparison, setShowComparison] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<RoleFilterType>('All');

  // Resolução do jogador atual
  const playerData: PlayerRoleAnalyticsDTO = useMemo(() => {
    if (data && data.playerName.toLowerCase() === activePlayerName.toLowerCase()) {
      return data;
    }
    return getPlayerRoleAnalytics(activePlayerName);
  }, [data, activePlayerName]);

  // Resolução do jogador de comparação
  const comparisonData: PlayerRoleAnalyticsDTO = useMemo(() => {
    if (searchTerm.trim().length > 0) {
      return getPlayerRoleAnalytics(searchTerm);
    }
    const target = playerData.comparison.comparisonPlayerName;
    return getPlayerRoleAnalytics(target);
  }, [searchTerm, playerData.comparison.comparisonPlayerName]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const getPillClass = (pill: RoleFilterType) => {
    const isSelected = selectedRole === pill;

    if (!isSelected) {
      return 'h-[26px] px-2.5 text-[11px] font-bold rounded-[2px] transition-colors border border-[#1F2629] text-[#7E8B92] bg-[#13191C] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent';
    }

    if (pill === 'Anchor' || pill === 'Rotation' || pill === 'CT Allround') {
      return 'h-[26px] px-2.5 text-[11px] font-bold rounded-[2px] transition-colors border text-[#2979FF] border-[#1E3A5F] bg-[#0F1E2E] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent';
    }

    if (
      pill === 'Lurk' ||
      pill === 'Half Lurk' ||
      pill === 'Pack' ||
      pill === 'T Allround'
    ) {
      return 'h-[26px] px-2.5 text-[11px] font-bold rounded-[2px] transition-colors border text-[#FF8C00] border-[#3D2411] bg-[#26160A] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent';
    }

    // All
    return 'h-[26px] px-2.5 text-[11px] font-bold rounded-[2px] transition-colors border border-[#00FFA3] text-[#00FFA3] bg-[#00FFA3]/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent';
  };

  return (
    <div data-testid="tab-roles-content" className="select-none">
      {/* 1. BLOCO SUPERIOR: Título da Seção */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-[#00FFA3] font-bold text-xs">/</span>
        <h2 className="text-xs font-bold uppercase tracking-wider text-white">
          Role performance
        </h2>
      </div>

      {/* Card Container Geral (h-[530px] flex gap-5 select-none mb-5) */}
      <div className="bg-surface-card border border-border-card rounded-[2px] p-5 h-[530px] flex gap-5 select-none mb-5">
        {/* Divisão Horizontal Esquerda (60%): Radar e controles */}
        <div className="w-[60%] flex flex-col justify-between">
          <div>
            {/* Controles sobre o Radar */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowComparison(false)}
                  className={`h-7 px-3 text-[11px] font-bold uppercase tracking-tight rounded-[2px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
                    !showComparison
                      ? 'border border-accent text-accent bg-accent/10'
                      : 'border border-border-muted text-text-primary bg-transparent hover:border-text-secondary'
                  }`}
                >
                  {playerData.playerName}
                </button>
                <button
                  type="button"
                  onClick={() => setShowComparison((prev) => !prev)}
                  aria-pressed={showComparison}
                  className={`h-7 px-3 text-[11px] font-bold uppercase tracking-tight rounded-[2px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
                    showComparison
                      ? 'border border-accent text-accent bg-accent/10'
                      : 'border border-border-muted text-text-primary bg-transparent hover:border-text-secondary'
                  }`}
                >
                  COMPARISON
                </button>
              </div>

              {/* Campo de busca de comparação ("Search player") */}
              <input
                type="text"
                aria-label="Buscar jogador para comparação"
                placeholder="Search player"
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-[190px] h-7 bg-canvas border border-border-subtle rounded-[2px] px-2 text-[11px] text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              />
            </div>

            {/* Pills de Filtro de Funções (2 linhas com gap-1.5) */}
            <div className="flex flex-col gap-1.5 mb-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {ROW_1_PILLS.map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    aria-pressed={selectedRole === pill}
                    onClick={() => setSelectedRole(pill)}
                    className={getPillClass(pill)}
                  >
                    {pill}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {ROW_2_PILLS.map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    aria-pressed={selectedRole === pill}
                    onClick={() => setSelectedRole(pill)}
                    className={getPillClass(pill)}
                  >
                    {pill}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Gráfico de Radar SVG (Polígono Dinâmico com 10 eixos canónicos) */}
          <div className="flex-1 flex items-center justify-center min-h-0">
            <RoleRadarChart
              points={playerData.radarPoints}
              comparisonPoints={comparisonData.radarPoints}
              showComparison={showComparison}
            />
          </div>

          {/* Rodapé do Radar: Legenda de Telemetria */}
          <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary pt-2 border-t border-border-card/50">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="text-text-primary font-semibold uppercase">
                {playerData.playerName}
              </span>
            </span>
            {showComparison && (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                <span className="text-text-muted uppercase font-semibold">
                  VS {comparisonData.playerName}
                </span>
              </span>
            )}
            <span className="text-text-secondary">10 PRO CANONICAL AXES</span>
          </div>
        </div>

        {/* Divisão Horizontal Direita (40%): Coluna Comparativa de Dados */}
        <div className="w-[40%] border-l border-border-card pl-5 flex flex-col justify-between">
          <div>
            {/* Título do Comparativo */}
            <div className="h-[30px] mb-5 flex items-center">
              <span className="text-accent font-bold text-base">
                {playerData.playerName}
              </span>
              <span className="text-text-primary font-bold text-base ml-1.5">
                vs Comparison
              </span>
            </div>

            {/* Grid de 5 Métricas Lado a Lado (HLTV RATING, ADR, K/D, KPR, KAST) */}
            <div className="flex flex-col gap-3.5">
              {playerData.comparison.metrics.map((metric) => {
                // Se o usuário buscou um jogador específico, usa o valor dele dinamicamente
                let compValue = metric.comparisonValue;
                if (searchTerm.trim().length > 0 && comparisonData) {
                  const matched = comparisonData.comparison.metrics.find(
                    (m) => m.id === metric.id,
                  );
                  if (matched) {
                    compValue = matched.playerValue;
                  }
                }

                return (
                  <div
                    key={metric.id}
                    className="grid grid-cols-2 gap-4 border-b border-border-card/60 pb-2.5"
                  >
                    <div>
                      <div className="text-[10px] font-bold uppercase text-text-secondary tracking-wider mb-0.5">
                        {metric.label}
                      </div>
                      <div className="text-2xl font-bold font-mono tabular-nums text-text-primary leading-none">
                        {metric.playerValue}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-text-secondary tracking-wider mb-0.5">
                        {comparisonData.playerName}
                      </div>
                      <div className="text-2xl font-bold font-mono tabular-nums text-text-muted leading-none">
                        {compValue}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rodapé da Coluna Comparativa */}
          <div className="pt-3 border-t border-border-card text-[10px] font-mono text-text-secondary flex items-center justify-between">
            <span>REFERENCE: LAN TOP 20</span>
            <span className="text-accent font-bold">100+ ROUNDS SAMPLE</span>
          </div>
        </div>
      </div>

      {/* 5. TABELAS INFERIORES LADO A LADO (CT vs TR) */}
      <div className="grid grid-cols-2 gap-4 mt-5 select-none">
        {/* Coluna Esquerda: Tabela de Funções CT */}
        <RoleTable
          side="ct"
          rows={playerData.ctRoles}
          activeFilter={selectedRole}
        />

        {/* Coluna Direita: Tabela de Funções TR */}
        <RoleTable
          side="t"
          rows={playerData.tRoles}
          activeFilter={selectedRole}
        />
      </div>
    </div>
  );
}

export default TabRoles;
