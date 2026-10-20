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
import { RoleDetailsModal } from './RoleDetailsModal.tsx';

export interface TabRolesProps {
  data?: PlayerRoleAnalyticsDTO;
  playerName?: string;
  matchesCount?: number;
}

const ROW_1_PILLS: RoleFilterType[] = [
  'All',
  'CT Allround',
  'Anchor',
  'Rotation',
  'T Allround',
];

const ROW_2_PILLS: RoleFilterType[] = ['Lurk', 'Half Lurk', 'Pack'];

const DEFAULT_CLUSTERS = [
  {
    id: 'ct-a-rotation',
    roleName: 'Inferno A Rotation',
    side: 'CT',
    category: 'Rotation',
    centroid: { x: 1250, y: 1800, percentX: 68.2, percentY: 42.1 },
    sampleCount: 8197,
    frequencyPct: 64.5,
    rating: 1.5,
    confidence: 94,
  },
  {
    id: 't-pack-mid',
    roleName: 'Inferno Banana Control',
    side: 'T',
    category: 'Pack',
    centroid: { x: -450, y: 800, percentX: 33.4, percentY: 62.5 },
    sampleCount: 5540,
    frequencyPct: 58.2,
    rating: 1.38,
    confidence: 89,
  },
  {
    id: 't-lurk-apps',
    roleName: 'Inferno A Apps Lurk',
    side: 'T',
    category: 'Lurk',
    centroid: { x: 1100, y: 850, percentX: 65.1, percentY: 61.8 },
    sampleCount: 3980,
    frequencyPct: 41.8,
    rating: 1.25,
    confidence: 86,
  },
];

const DEFAULT_HEATMAP_POINTS = [
  { x: 1250, y: 1800, percentX: 68, percentY: 42, side: 'ct' },
  { x: 1300, y: 1850, percentX: 69, percentY: 41, side: 'ct' },
  { x: 1200, y: 1750, percentX: 67, percentY: 43, side: 'ct' },
  { x: 1150, y: 1700, percentX: 66, percentY: 44, side: 'ct' },
  { x: 1400, y: 1900, percentX: 71, percentY: 40, side: 'ct' },
  { x: 1450, y: 2200, percentX: 72, percentY: 34, side: 'ct' },
  { x: -450, y: 800, percentX: 33, percentY: 62, side: 't' },
  { x: -400, y: 750, percentX: 34, percentY: 63, side: 't' },
  { x: -500, y: 850, percentX: 32, percentY: 61, side: 't' },
  { x: -350, y: 700, percentX: 35, percentY: 64, side: 't' },
  { x: 1100, y: 850, percentX: 65, percentY: 62, side: 't' },
  { x: 1150, y: 900, percentX: 66, percentY: 61, side: 't' },
  { x: 1050, y: 800, percentX: 64, percentY: 63, side: 't' },
];

export function TabRoles({ data, playerName, matchesCount }: TabRolesProps) {
  // Dados do Jogador Ativo (dinâmicos via props ou mocks externos)
  const [activePlayerName, setActivePlayerName] = useState<string>(
    data?.playerName || playerName || 'kscerato',
  );
  const [showComparison, setShowComparison] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<RoleFilterType>('All');
  const [spatialData, setSpatialData] = useState<any>(null);
  const [activeModalRole, setActiveModalRole] = useState<{ name: string; map: string } | null>(null);

  const hasSufficientSample = (matchesCount ?? (data ? 10 : 1)) >= 5;

  React.useEffect(() => {
    fetch(`/api/stats/player/${activePlayerName}/spatial`)
      .then((r) => r.json())
      .then((d) => {
        if (d && d.clusters) setSpatialData(d);
      })
      .catch(() => {});
  }, [activePlayerName]);

  const defaultClusters = DEFAULT_CLUSTERS;
  const defaultHeatmapPoints = DEFAULT_HEATMAP_POINTS;

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
        {hasSufficientSample ? (
          <>
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
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FF8C00]/10 border border-[#FF8C00]/30 flex items-center justify-center text-[#FF8C00]">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Amostragem insuficiente (necessário mínimo de 5 partidas)
              </h3>
              <p className="text-xs font-mono text-text-secondary mt-1 max-w-md">
                O Gráfico de Radar Tático e as métricas comparativas exigem um histórico amostral consolidado de ao menos 5 partidas processadas no mesmo mapa.
              </p>
            </div>
          </div>
        )}
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

      {/* 6. ANÁLISE ESPACIAL & CLUSTERIZAÇÃO TÁTICA (0-50s DOS ROUNDS) */}
      <div className="mt-5 select-none">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-accent font-bold text-xs font-mono">/</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Análise Espacial & Clusterização de Funções (Primeiros 40-60s)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-text-secondary uppercase">
            Auto-Categorização via K-Means • Resolução Posicional Sub-Tick
          </span>
        </div>

        <div className="bg-surface-card border border-border-card rounded-[2px] p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Visualizador de Heatmap Espacial (5 colunas) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center bg-canvas border border-border-subtle rounded-[2px] p-3 relative overflow-hidden min-h-[320px]">
              {/* Radar Grid Background com Linhas Táticas */}
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full max-w-[290px] max-h-[290px]"
                aria-label="Heatmap de Posições nos Primeiros 50s"
              >
                {/* Linhas de Grade de Radar */}
                <rect x="0" y="0" width="100" height="100" fill="#0B0E0F" />
                <path d="M 0 50 L 100 50 M 50 0 L 50 100" stroke="#1F2629" strokeWidth="0.5" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#1F2629" strokeWidth="0.5" />
                <circle cx="50" cy="50" r="25" fill="none" stroke="#1F2629" strokeWidth="0.5" strokeDasharray="2,2" />

                {/* Zonas dos Bombsites (Inferno A e B) */}
                <rect x="60" y="28" width="22" height="22" fill="#2979FF" fillOpacity="0.06" stroke="#2979FF" strokeWidth="0.5" rx="1" />
                <text x="71" y="40" textAnchor="middle" fill="#2979FF" fontSize="3.5" fontFamily="monospace" fontWeight="bold">SITE A</text>

                <rect x="18" y="46" width="20" height="20" fill="#2979FF" fillOpacity="0.06" stroke="#2979FF" strokeWidth="0.5" rx="1" />
                <text x="28" y="58" textAnchor="middle" fill="#2979FF" fontSize="3.5" fontFamily="monospace" fontWeight="bold">SITE B</text>

                {/* Pontos de Calor / Telemetria Posicional Amostrada */}
                {(spatialData?.heatmapPoints || defaultHeatmapPoints).map((pt: any, idx: number) => (
                  <circle
                    key={idx}
                    cx={pt.percentX}
                    cy={pt.percentY}
                    r="1.4"
                    fill={pt.side === 'ct' ? '#2979FF' : '#FF8C00'}
                    fillOpacity="0.45"
                  />
                ))}

                {/* Centroides dos Clusters Detectados com Anéis Pulsantes */}
                {(spatialData?.clusters || defaultClusters).map((cl: any) => (
                  <g key={cl.id}>
                    <circle
                      cx={cl.centroid.percentX}
                      cy={cl.centroid.percentY}
                      r="4.5"
                      fill={cl.side === 'CT' ? '#2979FF' : '#FF8C00'}
                      fillOpacity="0.25"
                      stroke={cl.side === 'CT' ? '#2979FF' : '#FF8C00'}
                      strokeWidth="0.75"
                    />
                    <circle
                      cx={cl.centroid.percentX}
                      cy={cl.centroid.percentY}
                      r="1.8"
                      fill="#FFFFFF"
                    />
                    <text
                      x={cl.centroid.percentX}
                      y={cl.centroid.percentY - 4.5}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="3.2"
                      fontWeight="bold"
                      fontFamily="monospace"
                      filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.8))"
                    >
                      {cl.roleName.replace('Inferno ', '')}
                    </text>
                  </g>
                ))}
              </svg>

              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[9px] font-mono text-text-secondary bg-[#0E1214]/90 px-2 py-1 rounded-[2px] border border-border-card">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2979FF]" />
                  <span>CT SETUP (0-50s)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF8C00]" />
                  <span>T DEFAULT (0-50s)</span>
                </span>
                <span className="text-accent font-bold">de_inferno</span>
              </div>
            </div>

            {/* Painel de Clusters & Categorização Automática (7 colunas) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-primary">
                    Posições Táticas Detectadas Automaticamente
                  </h4>
                  <span className="text-[10px] font-mono text-accent bg-accent/10 border border-accent/30 px-1.5 py-0.5 rounded-[2px] font-bold">
                    K-MEANS CLUSTERING (K=3)
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed mb-3">
                  Consumo de coordenadas X/Y no início dos rounds para isolar o setup defensivo e abertura ofensiva antes dos duelos de bomb.
                </p>

                {/* Lista de Clusters Categorizados */}
                <div className="space-y-2">
                  {(spatialData?.clusters || defaultClusters).map((cl: any) => {
                    const isCT = cl.side === 'CT';
                    return (
                      <div
                        key={cl.id}
                        onClick={() => setActiveModalRole({ name: cl.roleName, map: 'de_inferno' })}
                        title={`Clique para comparar jogadores na função ${cl.roleName}`}
                        className="bg-surface border border-border-subtle rounded-[2px] p-2.5 flex items-center justify-between gap-3 hover:border-accent cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-black ${
                              isCT
                                ? 'bg-[#2979FF]/15 text-[#2979FF] border border-[#2979FF]/40'
                                : 'bg-[#FF8C00]/15 text-[#FF8C00] border border-[#FF8C00]/40'
                            }`}
                          >
                            {cl.side} • {cl.category.toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white group-hover:text-accent transition-colors truncate flex items-center gap-1.5">
                              <span>{cl.roleName}</span>
                              <span className="text-[10px] text-accent opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                            </div>
                            <div className="text-[10px] font-mono text-text-secondary truncate">
                              Centroide: X={cl.centroid.x}, Y={cl.centroid.y} • Confiança: {cl.confidence}%
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 text-right">
                          <div>
                            <div className="text-[9px] font-mono uppercase text-text-secondary">
                              Presença
                            </div>
                            <div className="text-xs font-bold font-mono text-white tabular-nums">
                              {cl.frequencyPct}%
                            </div>
                          </div>
                          <div className="border-l border-border-subtle pl-3">
                            <div className="text-[9px] font-mono uppercase text-text-secondary">
                              Rating
                            </div>
                            <div className="text-xs font-bold font-mono text-accent tabular-nums">
                              {Number(cl.rating).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rodapé Metodológico */}
              <div className="pt-2.5 border-t border-border-subtle flex items-center justify-between text-[10px] font-mono text-text-secondary">
                <span>JANELA: 0s A 50s PÓS-FREEZETIME</span>
                <span className="text-text-primary font-semibold">AMOSTRAS: 17.717 TICKS PROCESSADOS</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeModalRole && (
        <RoleDetailsModal
          isOpen={true}
          roleName={activeModalRole.name}
          mapName={activeModalRole.map}
          onClose={() => setActiveModalRole(null)}
        />
      )}
    </div>
  );
}

export default TabRoles;
