'use client';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MAP_CONFIGS, type CS2Map } from '../../constants/maps.ts';
import type {
  GlobalFilterState,
  TacticalSide,
  TimeWindow,
} from '../../types/filters.ts';
import {
  DEFAULT_FILTER_STATE,
  parseFilterParams,
  serializeFilterParams,
} from '../../utils/filter-params.ts';

export interface FilterBarProps {
  onFilterChange?: (nextState: GlobalFilterState, url: string) => void;
}

const CANONICAL_MAPS = Object.keys(MAP_CONFIGS) as CS2Map[];

export function FilterBar({ onFilterChange }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '/matches';
  const searchParams = useSearchParams();

  const currentParams = new URLSearchParams(
    searchParams ? searchParams.toString() : '',
  );
  const filterState = parseFilterParams(currentParams);

  const [registeredPlayers, setRegisteredPlayers] = React.useState<
    Array<{ steamId: string; nickname: string; team: string }>
  >([]);

  React.useEffect(() => {
    fetch('/api/players')
      .then((res) => res.json())
      .then((data) => {
        if (data?.players && Array.isArray(data.players) && data.players.length > 0) {
          setRegisteredPlayers(data.players);
        }
      })
      .catch(() => {});
  }, []);

  const currentPlayerValue = React.useMemo(() => {
    const currentSteamId = currentParams.get('steamId');
    if (currentSteamId) {
      const match = registeredPlayers.find((p) => p.steamId === currentSteamId);
      if (match) return match.steamId;
    }
    const currentTarget = filterState.targetPlayerId?.toLowerCase();
    if (currentTarget) {
      const match = registeredPlayers.find(
        (p) => p.nickname.toLowerCase() === currentTarget || p.steamId === currentTarget,
      );
      if (match) return match.steamId;
    }
    return registeredPlayers[0]?.steamId || '';
  }, [currentParams, filterState.targetPlayerId, registeredPlayers]);

  const handlePlayerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSteamId = event.target.value;
    const playerObj = registeredPlayers.find(
      (p) => p.steamId === selectedSteamId || p.nickname.toLowerCase() === selectedSteamId.toLowerCase(),
    );
    const nick = playerObj ? playerObj.nickname.toLowerCase() : selectedSteamId.toLowerCase();

    const nextSearchParams = serializeFilterParams({
      ...filterState,
      targetPlayerId: nick,
    });
    nextSearchParams.set('steamId', playerObj ? playerObj.steamId : selectedSteamId);
    nextSearchParams.set('player', nick);

    const activeTab = currentParams.get('tab');
    if (activeTab) {
      nextSearchParams.set('tab', activeTab);
    }

    const queryString = nextSearchParams.toString();
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(nextUrl);
    if (onFilterChange) {
      onFilterChange({ ...filterState, targetPlayerId: nick }, nextUrl);
    }
  };

  const applyFilterUpdate = (patch: Partial<GlobalFilterState>) => {
    const nextState: GlobalFilterState = {
      ...filterState,
      ...patch,
    };

    const nextSearchParams = serializeFilterParams(nextState);

    // Preservar aba ativa (?tab=...) para evitar reset involuntário para a aba Intro
    const activeTab = currentParams.get('tab');
    if (activeTab) {
      nextSearchParams.set('tab', activeTab);
    }
    const currentSteamId = currentParams.get('steamId');
    if (currentSteamId) {
      nextSearchParams.set('steamId', currentSteamId);
    }

    const queryString = nextSearchParams.toString();
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;

    router.push(nextUrl);
    if (onFilterChange) {
      onFilterChange(nextState, nextUrl);
    }
  };

  const handleMapChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as CS2Map | 'all';
    applyFilterUpdate({ selectedMap: value });
  };

  const handleSideChange = (
    eventOrSide: React.ChangeEvent<HTMLSelectElement> | TacticalSide,
  ) => {
    const value =
      typeof eventOrSide === 'string'
        ? eventOrSide
        : (eventOrSide.target.value as TacticalSide);
    applyFilterUpdate({ tacticalSide: value });
  };

  const handleWindowChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as TimeWindow;
    applyFilterUpdate({ timeWindow: value });
  };

  const handleReset = () => {
    applyFilterUpdate({ ...DEFAULT_FILTER_STATE });
  };

  return (
    <header
      aria-label="Barra Global de Filtros Analíticos"
      className="h-12 bg-surface/70 backdrop-blur-sm border-b border-border-subtle px-4 flex items-center justify-between gap-3 select-none"
    >
      {/* Controles da Esquerda em Linha Contínua Ultra Compacta (h-7 / 28px) */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Seletor Interativo de Perfil / Jogador (Dropdown) alimentado do banco */}
        <label
          htmlFor="filter-player-select"
          className="h-7 bg-canvas border border-border-subtle text-xs text-white px-2 rounded-[2px] flex items-center gap-1.5 font-mono cursor-pointer hover:border-[#6B7A82] transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
          <span className="text-text-secondary text-[10px] font-bold shrink-0">PLAYER:</span>
          <select
            id="filter-player-select"
            aria-label="Selecionar Jogador"
            data-testid="filter-player-select"
            value={currentPlayerValue}
            onChange={handlePlayerChange}
            className="bg-transparent text-text-primary text-xs font-semibold focus:outline-none cursor-pointer pr-1"
          >
            {registeredPlayers.map((player) => (
              <option key={player.steamId} value={player.steamId} className="bg-[#111618] text-white">
                {player.nickname} ({player.team})
              </option>
            ))}
          </select>
        </label>

        {/* Indicador de Mapa: Tag "ON" em text-text-secondary + Dropdown */}
        <label className="flex items-center gap-1.5 text-xs text-text-secondary h-7">
          <span className="font-mono text-[10px] font-bold tracking-wider">ON</span>
          <select
            aria-label="Mapa"
            data-testid="filter-map-select"
            value={filterState.selectedMap}
            onChange={handleMapChange}
            className="h-7 rounded-[2px] border border-border-subtle bg-canvas px-2 text-xs font-semibold text-text-primary focus:border-accent focus:outline-none transition-colors"
          >
            <option value="all">Todos os Mapas</option>
            {CANONICAL_MAPS.map((mapName) => (
              <option key={mapName} value={mapName}>
                {mapName}
              </option>
            ))}
          </select>
        </label>

        {/* Seletor de Lado Tático (Pills compactos: Both sides, CT, T) */}
        <div
          role="group"
          aria-label="Seleção de Lado Tático"
          className="flex items-center h-7 rounded-[2px] border border-border-subtle bg-canvas p-0.5 gap-0.5"
        >
          <button
            type="button"
            data-side="both"
            aria-pressed={filterState.tacticalSide === 'both'}
            onClick={() => handleSideChange('both')}
            className={`h-full px-2 text-[11px] font-bold rounded-[2px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
              filterState.tacticalSide === 'both'
                ? 'bg-border-subtle text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Both sides
          </button>
          <button
            type="button"
            data-side="ct"
            aria-pressed={filterState.tacticalSide === 'ct'}
            onClick={() => handleSideChange('ct')}
            className={`h-full px-2 text-[11px] font-bold rounded-[2px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
              filterState.tacticalSide === 'ct'
                ? 'bg-ct text-white'
                : 'text-text-secondary hover:text-ct'
            }`}
          >
            CT
          </button>
          <button
            type="button"
            data-side="tr"
            aria-pressed={filterState.tacticalSide === 't'}
            onClick={() => handleSideChange('t')}
            className={`h-full px-2 text-[11px] font-bold rounded-[2px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
              filterState.tacticalSide === 't'
                ? 'bg-tr text-white'
                : 'text-text-secondary hover:text-tr'
            }`}
          >
            T
          </button>

          {/* Select de suporte para formulário e testes com getByLabelText */}
          <select
            aria-label="Lado Tático"
            data-testid="filter-side-select"
            value={filterState.tacticalSide}
            onChange={handleSideChange}
            className="sr-only"
            tabIndex={-1}
          >
            <option value="both">Both sides</option>
            <option value="ct">CT</option>
            <option value="t">T</option>
          </select>
        </div>

        {/* Filtro Temporal e de Rounds */}
        <label className="flex items-center gap-1.5 text-xs text-text-secondary h-7">
          <select
            aria-label="Janela Temporal"
            data-testid="filter-window-select"
            value={filterState.timeWindow}
            onChange={handleWindowChange}
            className="h-7 rounded-[2px] border border-border-subtle bg-canvas px-2 text-xs font-semibold text-text-primary focus:border-accent focus:outline-none transition-colors"
          >
            <option value="last_5">Últimas 5 Partidas</option>
            <option value="last_10">Últimas 10 Partidas (100 matches)</option>
            <option value="last_20">Últimas 20 Partidas (3 months)</option>
            <option value="all">Todas as Partidas (All buys)</option>
          </select>
        </label>
      </div>

      {/* Controles da Direita: Chip de Jogador Ativo + Botões Secundários Compactos com Ícones */}
      <div className="flex items-center gap-2">
        {!pathname.startsWith('/matches') && filterState.targetPlayerId && (
          <span
            data-testid="active-player-chip"
            className="h-7 px-2 flex items-center text-[10px] font-mono font-bold text-accent bg-accent/10 border border-accent/30 rounded-[2px]"
          >
            TARGET: {filterState.targetPlayerId}
          </span>
        )}

        <button
          type="button"
          aria-label="Exportar telemetria"
          title="Exportar Telemetria"
          className="h-7 w-7 flex items-center justify-center rounded-[2px] border border-border-subtle bg-canvas text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>

        <button
          type="button"
          aria-label="Resetar Filtros"
          data-testid="filter-reset-button"
          onClick={handleReset}
          className="h-7 px-2.5 text-[11px] font-mono font-semibold text-text-secondary hover:text-text-primary border border-border-subtle bg-canvas hover:border-text-secondary rounded-[2px] transition-colors"
        >
          Limpar Filtros
        </button>
      </div>
    </header>
  );
}

export default FilterBar;
