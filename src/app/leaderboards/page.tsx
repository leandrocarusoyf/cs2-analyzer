'use client';

import React, { useMemo, useState } from 'react';
import {
  MOCK_LEADERBOARD_PLAYERS,
  type LeaderboardPlayer,
  type PlayerMapStats,
} from '../../data/leaderboards-data.ts';

const MAP_OPTIONS = [
  'All',
  'Mirage',
  'Inferno',
  'Dust II',
  'Nuke',
  'Ancient',
  'Anubis',
  'Cache',
] as const;

const SIDE_OPTIONS = ['Both sides', 'CT', 'T'] as const;

const ROLE_OPTIONS = [
  'All roles',
  'AWP',
  'Entry',
  'Rifler',
  'Anchor',
  'Support',
  'Lurk',
] as const;

type SortKey =
  | 'rank'
  | 'name'
  | 'hltv'
  | 'adr'
  | 'kd'
  | 'kpr'
  | 'dpr'
  | 'kast'
  | 'udr'
  | 'far'
  | 'rounds';

interface ComputedPlayerRow extends PlayerMapStats {
  id: string;
  rank: number;
  name: string;
  team: string;
  tRole: string;
  ctRole: string;
  roleCategory: string;
  initials: string;
}

export default function LeaderboardsPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [playersList, setPlayersList] = useState<LeaderboardPlayer[]>([...MOCK_LEADERBOARD_PLAYERS]);
  const [selectedMap, setSelectedMap] = useState<string>('All');
  const [selectedSide, setSelectedSide] = useState<string>('Both sides');
  const [selectedRole, setSelectedRole] = useState<string>('All roles');
  const [selectedScope, setSelectedScope] = useState<string>('Top 100');
  const [selectedMinMaps, setSelectedMinMaps] = useState<string>('Min. 10 Maps');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [sortKey, setSortKey] = useState<SortKey>('hltv');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  React.useEffect(() => {
    fetch('/api/leaderboards')
      .then((r) => r.json())
      .then((data) => {
        if (data?.players && Array.isArray(data.players) && data.players.length > 0) {
          setPlayersList(data.players);
        }
      })
      .catch(() => {});
  }, []);

  const activePlayers = playersList.length > 0 ? playersList : MOCK_LEADERBOARD_PLAYERS;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'dpr' ? 'asc' : 'desc');
    }
  };

  const handleResetFilters = () => {
    setSelectedMap('All');
    setSelectedSide('Both sides');
    setSelectedRole('All roles');
    setSelectedScope('Top 100');
    setSelectedMinMaps('Min. 10 Maps');
    setSearchQuery('');
    setSortKey('hltv');
    setSortDirection('desc');
  };

  // 1. Processar métricas dos jogadores de acordo com o mapa selecionado
  const computedPlayers = useMemo<ComputedPlayerRow[]>(() => {
    return activePlayers.map((player, idx) => {
      const stats: PlayerMapStats =
        selectedMap !== 'All' && player.mapStats[selectedMap]
          ? player.mapStats[selectedMap]
          : player.overall;

      // Ajuste sutil caso um lado específico (CT ou T) seja selecionado
      let sideHltvMod = 0;
      if (selectedSide === 'CT') {
        sideHltvMod = player.ctRole.includes('Anchor') ? 0.02 : 0.01;
      } else if (selectedSide === 'T') {
        sideHltvMod = player.tRole.includes('Pack') || player.tRole.includes('Entry') ? 0.03 : 0.01;
      }

      return {
        id: player.id,
        rank: idx + 1,
        name: player.name,
        team: player.team,
        tRole: player.tRole,
        ctRole: player.ctRole,
        roleCategory: player.roleCategory,
        initials: player.name.slice(0, 2).toUpperCase(),
        hltv: Number((stats.hltv + sideHltvMod).toFixed(2)),
        adr: stats.adr,
        kd: stats.kd,
        kpr: stats.kpr,
        dpr: stats.dpr,
        kast: stats.kast,
        udr: stats.udr,
        far: stats.far,
        rounds: stats.rounds,
      };
    });
  }, [selectedMap, selectedSide]);

  // 2. Filtrar por função (Role) e busca textual
  const filteredPlayers = useMemo(() => {
    return computedPlayers.filter((player) => {
      if (selectedRole !== 'All roles' && player.roleCategory !== selectedRole) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = player.name.toLowerCase().includes(query);
        const matchesTeam = player.team.toLowerCase().includes(query);
        if (!matchesName && !matchesTeam) return false;
      }
      return true;
    });
  }, [computedPlayers, selectedRole, searchQuery]);

  // 3. Ordenar os dados conforme coluna e direção selecionadas
  const sortedPlayers = useMemo(() => {
    const list = [...filteredPlayers];
    list.sort((a, b) => {
      let valA: string | number = a[sortKey];
      let valB: string | number = b[sortKey];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      const numA = Number(valA);
      const numB = Number(valB);
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });

    if (selectedScope === 'Top 20') {
      return list.slice(0, 20);
    }
    if (selectedScope === 'Top 50') {
      return list.slice(0, 50);
    }
    return list;
  }, [filteredPlayers, sortKey, sortDirection, selectedScope]);

  return (
    <section aria-labelledby="leaderboards-heading" className="w-full select-none">
      {/* 2. CABEÇALHO DA PÁGINA (/ LEADERBOARDS) */}
      <div className="h-5 leading-5 mb-4 flex items-center">
        <span className="text-[#00FFA3] font-bold mr-1.5 font-mono text-sm">/</span>
        <h1
          id="leaderboards-heading"
          className="text-sm font-bold uppercase tracking-[0.05em] text-white inline-block"
        >
          Leaderboards
        </h1>
      </div>

      {/* 3. CARD DE FILTROS SUPERIOR (ESTRUTURA DENSA E ALINHADA) */}
      <div className="bg-[#0E1214] border border-[#1B2226] rounded-[2px] p-4 flex flex-col gap-2.5 mb-5 shadow-none">
        {/* Linha MAPS */}
        <div className="flex items-center">
          <span className="w-[70px] min-w-[70px] text-[11px] font-bold uppercase text-[#6B7A82] flex items-center">
            MAPS
          </span>
          <div className="flex items-center flex-wrap gap-1.5">
            {MAP_OPTIONS.map((map) => {
              const active = selectedMap === map;
              return (
                <button
                  key={map}
                  type="button"
                  data-testid={`filter-map-${map}`}
                  onClick={() => setSelectedMap(map)}
                  className={`h-7 px-2.5 sm:px-3 rounded-[2px] text-[11px] font-medium tracking-tight transition-colors ${
                    active
                      ? 'bg-[#1E262B] border border-[#3A4750] text-white font-semibold'
                      : 'bg-[#13191C] border border-[#232B30] text-[#A0ADB5] hover:text-white hover:border-[#3A4750]'
                  }`}
                >
                  {map}
                </button>
              );
            })}
          </div>
        </div>

        {/* Linha SIDE */}
        <div className="flex items-center">
          <span className="w-[70px] min-w-[70px] text-[11px] font-bold uppercase text-[#6B7A82] flex items-center">
            SIDE
          </span>
          <div className="flex items-center flex-wrap gap-1.5">
            {SIDE_OPTIONS.map((side) => {
              const active = selectedSide === side;
              return (
                <button
                  key={side}
                  type="button"
                  data-testid={`filter-side-${side}`}
                  onClick={() => setSelectedSide(side)}
                  className={`h-7 px-2.5 sm:px-3 rounded-[2px] text-[11px] font-medium tracking-tight transition-colors ${
                    active
                      ? 'bg-[#1E262B] border border-[#3A4750] text-white font-semibold'
                      : 'bg-[#13191C] border border-[#232B30] text-[#A0ADB5] hover:text-white hover:border-[#3A4750]'
                  }`}
                >
                  {side}
                </button>
              );
            })}
          </div>
        </div>

        {/* Linha ROLES */}
        <div className="flex items-center">
          <span className="w-[70px] min-w-[70px] text-[11px] font-bold uppercase text-[#6B7A82] flex items-center">
            ROLES
          </span>
          <div className="flex items-center flex-wrap gap-1.5">
            {ROLE_OPTIONS.map((role) => {
              const active = selectedRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  data-testid={`filter-role-${role}`}
                  onClick={() => setSelectedRole(role)}
                  className={`h-7 px-2.5 sm:px-3 rounded-[2px] text-[11px] font-medium tracking-tight transition-colors ${
                    active
                      ? 'bg-[#1E262B] border border-[#3A4750] text-white font-semibold'
                      : 'bg-[#13191C] border border-[#232B30] text-[#A0ADB5] hover:text-white hover:border-[#3A4750]'
                  }`}
                >
                  {role}
                </button>
              );
            })}
          </div>
        </div>

        {/* Linha SCOPE */}
        <div className="flex items-center">
          <span className="w-[70px] min-w-[70px] text-[11px] font-bold uppercase text-[#6B7A82] flex items-center">
            SCOPE
          </span>
          <div className="flex items-center flex-wrap gap-2">
            <select
              aria-label="Escopo de Classificação"
              data-testid="select-scope-ranking"
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="h-7 bg-[#0B0E0F] border border-[#232B30] rounded-[2px] px-2 text-[11px] text-white focus:border-[#00FFA3] focus:outline-none cursor-pointer"
            >
              <option value="Top 100">Top 100</option>
              <option value="Top 50">Top 50</option>
              <option value="Top 20">Top 20</option>
              <option value="All Players">All Players</option>
            </select>

            <select
              aria-label="Mínimo de Mapas"
              data-testid="select-scope-maps"
              value={selectedMinMaps}
              onChange={(e) => setSelectedMinMaps(e.target.value)}
              className="h-7 bg-[#0B0E0F] border border-[#232B30] rounded-[2px] px-2 text-[11px] text-white focus:border-[#00FFA3] focus:outline-none cursor-pointer"
            >
              <option value="Min. 10 Maps">Min. 10 Maps</option>
              <option value="Min. 5 Maps">Min. 5 Maps</option>
              <option value="Min. 1 Map">Min. 1 Map</option>
            </select>
          </div>
        </div>

        {/* Linha PINNED / BUSCA */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[#1B2226]/60">
          <div className="flex items-center">
            <span className="w-[70px] min-w-[70px] text-[11px] font-bold uppercase text-[#6B7A82] flex items-center">
              PINNED
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                aria-label="Buscar jogador"
                data-testid="search-player-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search player or team..."
                className="w-[220px] h-7 bg-[#0B0E0F] border border-[#232B30] rounded-[2px] px-2 text-[11px] text-white placeholder-[#6B7A82] focus:border-[#00FFA3] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] text-[#6B7A82] hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            data-testid="reset-filters-btn"
            onClick={handleResetFilters}
            className="h-7 px-2.5 text-[11px] font-mono text-[#6B7A82] hover:text-[#00FFA3] border border-transparent hover:border-[#232B30] rounded-[2px] transition-colors"
          >
            Reset filters
          </button>
        </div>
      </div>

      {/* 4. TABELA DE LEADERBOARDS (GRID E ALINHAMENTO MILIMÉTRICO) */}
      <div className="w-full border-collapse border border-[#1B2226] rounded-[2px] overflow-hidden bg-[#0E1214]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            {/* Cabeçalho da Tabela */}
            <thead className="bg-[#0B0E0F] border-b border-[#1B2226] h-8 sm:h-9">
              <tr>
                {/* 1. RANK */}
                <th
                  onClick={() => handleSort('rank')}
                  data-testid="th-sort-rank"
                  className="w-[55px] min-w-[55px] text-center text-[11px] font-bold uppercase tracking-wider text-[#6B7A82] px-2 cursor-pointer hover:text-white transition-colors"
                >
                  #
                </th>

                {/* 2. PLAYER */}
                <th
                  onClick={() => handleSort('name')}
                  data-testid="th-sort-name"
                  className="w-[240px] min-w-[240px] text-left px-3 text-[11px] font-bold uppercase tracking-wider text-[#6B7A82] cursor-pointer hover:text-white transition-colors"
                >
                  PLAYER
                </th>

                {/* 3. HLTV (Coluna Ordenada em Destaque) */}
                <th
                  onClick={() => handleSort('hltv')}
                  data-testid="th-sort-hltv"
                  className={`w-[75px] min-w-[75px] text-center text-[11px] font-bold uppercase tracking-wider px-2.5 cursor-pointer transition-colors ${
                    sortKey === 'hltv'
                      ? 'bg-[#141B1E] text-white'
                      : 'text-[#6B7A82] hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>HLTV</span>
                    {sortKey === 'hltv' && (
                      <span className="text-[10px] text-[#00FFA3]">
                        {sortDirection === 'desc' ? '▼' : '▲'}
                      </span>
                    )}
                  </div>
                </th>

                {/* 4. ADR */}
                <th
                  onClick={() => handleSort('adr')}
                  data-testid="th-sort-adr"
                  className={`w-[60px] min-w-[60px] text-center text-[11px] font-bold uppercase tracking-wider px-2 cursor-pointer transition-colors ${
                    sortKey === 'adr'
                      ? 'bg-[#141B1E] text-white'
                      : 'text-[#6B7A82] hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>ADR</span>
                    {sortKey === 'adr' && (
                      <span className="text-[9px] text-[#00FFA3]">
                        {sortDirection === 'desc' ? '▼' : '▲'}
                      </span>
                    )}
                  </div>
                </th>

                {/* 5. K/D */}
                <th
                  onClick={() => handleSort('kd')}
                  data-testid="th-sort-kd"
                  className={`w-[60px] min-w-[60px] text-center text-[11px] font-bold uppercase tracking-wider px-2 cursor-pointer transition-colors ${
                    sortKey === 'kd'
                      ? 'bg-[#141B1E] text-white'
                      : 'text-[#6B7A82] hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>K/D</span>
                    {sortKey === 'kd' && (
                      <span className="text-[9px] text-[#00FFA3]">
                        {sortDirection === 'desc' ? '▼' : '▲'}
                      </span>
                    )}
                  </div>
                </th>

                {/* 6. KPR */}
                <th
                  onClick={() => handleSort('kpr')}
                  data-testid="th-sort-kpr"
                  className={`w-[60px] min-w-[60px] text-center text-[11px] font-bold uppercase tracking-wider px-2 cursor-pointer transition-colors ${
                    sortKey === 'kpr'
                      ? 'bg-[#141B1E] text-white'
                      : 'text-[#6B7A82] hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>KPR</span>
                    {sortKey === 'kpr' && (
                      <span className="text-[9px] text-[#00FFA3]">
                        {sortDirection === 'desc' ? '▼' : '▲'}
                      </span>
                    )}
                  </div>
                </th>

                {/* 7. DPR */}
                <th
                  onClick={() => handleSort('dpr')}
                  data-testid="th-sort-dpr"
                  className={`w-[60px] min-w-[60px] text-center text-[11px] font-bold uppercase tracking-wider px-2 cursor-pointer transition-colors ${
                    sortKey === 'dpr'
                      ? 'bg-[#141B1E] text-white'
                      : 'text-[#6B7A82] hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>DPR</span>
                    {sortKey === 'dpr' && (
                      <span className="text-[9px] text-[#00FFA3]">
                        {sortDirection === 'desc' ? '▼' : '▲'}
                      </span>
                    )}
                  </div>
                </th>

                {/* 8. KAST */}
                <th
                  onClick={() => handleSort('kast')}
                  data-testid="th-sort-kast"
                  className={`w-[60px] min-w-[60px] text-center text-[11px] font-bold uppercase tracking-wider px-2 cursor-pointer transition-colors ${
                    sortKey === 'kast'
                      ? 'bg-[#141B1E] text-white'
                      : 'text-[#6B7A82] hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>KAST</span>
                    {sortKey === 'kast' && (
                      <span className="text-[9px] text-[#00FFA3]">
                        {sortDirection === 'desc' ? '▼' : '▲'}
                      </span>
                    )}
                  </div>
                </th>

                {/* 9. UDR */}
                <th
                  onClick={() => handleSort('udr')}
                  data-testid="th-sort-udr"
                  className={`w-[60px] min-w-[60px] text-center text-[11px] font-bold uppercase tracking-wider px-2 cursor-pointer transition-colors ${
                    sortKey === 'udr'
                      ? 'bg-[#141B1E] text-white'
                      : 'text-[#6B7A82] hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>UDR</span>
                    {sortKey === 'udr' && (
                      <span className="text-[9px] text-[#00FFA3]">
                        {sortDirection === 'desc' ? '▼' : '▲'}
                      </span>
                    )}
                  </div>
                </th>

                {/* 10. FAR */}
                <th
                  onClick={() => handleSort('far')}
                  data-testid="th-sort-far"
                  className={`w-[60px] min-w-[60px] text-center text-[11px] font-bold uppercase tracking-wider px-2 cursor-pointer transition-colors ${
                    sortKey === 'far'
                      ? 'bg-[#141B1E] text-white'
                      : 'text-[#6B7A82] hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>FAR</span>
                    {sortKey === 'far' && (
                      <span className="text-[9px] text-[#00FFA3]">
                        {sortDirection === 'desc' ? '▼' : '▲'}
                      </span>
                    )}
                  </div>
                </th>

                {/* 11. ROUNDS */}
                <th
                  onClick={() => handleSort('rounds')}
                  data-testid="th-sort-rounds"
                  className={`w-[60px] min-w-[60px] text-center text-[11px] font-bold uppercase tracking-wider px-2 cursor-pointer transition-colors ${
                    sortKey === 'rounds'
                      ? 'bg-[#141B1E] text-white'
                      : 'text-[#6B7A82] hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>ROUNDS</span>
                    {sortKey === 'rounds' && (
                      <span className="text-[9px] text-[#00FFA3]">
                        {sortDirection === 'desc' ? '▼' : '▲'}
                      </span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>

            {/* Linhas dos Jogadores */}
            <tbody className="divide-y divide-[#141A1D]">
              {sortedPlayers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-xs font-mono text-[#6B7A82]">
                    Nenhum atleta encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                sortedPlayers.map((player, index) => {
                  const rankNumber = index + 1;
                  const isTop1 = rankNumber === 1;
                  const isTop3 = rankNumber <= 3;

                  return (
                    <tr
                      key={player.id}
                      data-testid="leaderboard-row"
                      data-player-id={player.id}
                      data-player-name={player.name}
                      data-rank={rankNumber}
                      className="h-[46px] max-h-[46px] border-b border-[#141A1D] transition-colors hover:bg-[#13191D]"
                    >
                      {/* 1. RANK */}
                      <td
                        data-testid={`cell-rank-${player.id}`}
                        className="w-[55px] min-w-[55px] text-center text-xs font-bold font-mono"
                      >
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded-[2px] ${
                            isTop1
                              ? 'text-[#00FFA3] bg-[#00FFA3]/10 border border-[#00FFA3]/30 font-black'
                              : isTop3
                              ? 'text-white bg-[#1E262B] border border-[#3A4750]'
                              : 'text-[#6B7A82]'
                          }`}
                        >
                          {rankNumber}
                        </span>
                      </td>

                      {/* 2. PLAYER */}
                      <td data-testid={`cell-player-${player.id}`} className="w-[240px] min-w-[240px] px-3">
                        <div className="flex items-center gap-[10px]">
                          {/* Avatar quadrado 28x28 */}
                          <div className="w-7 h-7 rounded-[2px] bg-[#1A2226] shrink-0 border border-[#252E32] flex items-center justify-center text-[10px] font-mono font-bold text-[#00FFA3]">
                            {player.initials}
                          </div>

                          {/* Bloco de texto vertical */}
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white leading-tight truncate">
                              {player.name} <span className="text-[10px] font-normal text-[#6B7A82]">({player.team})</span>
                            </span>
                            <span className="text-[10px] text-[#6B7A82] leading-tight mt-0.5 truncate">
                              <span className="text-[#FF8C00] font-bold">T</span> {player.tRole} ·{' '}
                              <span className="text-[#2979FF] font-bold">CT</span> {player.ctRole}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. HLTV */}
                      <td
                        data-testid={`cell-hltv-${player.id}`}
                        className="w-[75px] min-w-[75px] text-center text-xs font-bold text-white bg-[#141B1E] font-mono tabular-nums"
                      >
                        {player.hltv.toFixed(2)}
                      </td>

                      {/* 4. ADR */}
                      <td
                        data-testid={`cell-adr-${player.id}`}
                        className="w-[60px] min-w-[60px] text-center text-[11px] font-medium text-[#A0ADB5] font-mono tabular-nums"
                      >
                        {player.adr.toFixed(1)}
                      </td>

                      {/* 5. K/D */}
                      <td
                        data-testid={`cell-kd-${player.id}`}
                        className="w-[60px] min-w-[60px] text-center text-[11px] font-medium text-[#A0ADB5] font-mono tabular-nums"
                      >
                        {player.kd.toFixed(2)}
                      </td>

                      {/* 6. KPR */}
                      <td
                        data-testid={`cell-kpr-${player.id}`}
                        className="w-[60px] min-w-[60px] text-center text-[11px] font-medium text-[#A0ADB5] font-mono tabular-nums"
                      >
                        {player.kpr.toFixed(2)}
                      </td>

                      {/* 7. DPR */}
                      <td
                        data-testid={`cell-dpr-${player.id}`}
                        className="w-[60px] min-w-[60px] text-center text-[11px] font-medium text-[#A0ADB5] font-mono tabular-nums"
                      >
                        {player.dpr.toFixed(2)}
                      </td>

                      {/* 8. KAST */}
                      <td
                        data-testid={`cell-kast-${player.id}`}
                        className="w-[60px] min-w-[60px] text-center text-[11px] font-medium text-[#A0ADB5] font-mono tabular-nums"
                      >
                        {player.kast.toFixed(1)}%
                      </td>

                      {/* 9. UDR */}
                      <td
                        data-testid={`cell-udr-${player.id}`}
                        className="w-[60px] min-w-[60px] text-center text-[11px] font-medium text-[#A0ADB5] font-mono tabular-nums"
                      >
                        {player.udr.toFixed(1)}
                      </td>

                      {/* 10. FAR */}
                      <td
                        data-testid={`cell-far-${player.id}`}
                        className="w-[60px] min-w-[60px] text-center text-[11px] font-medium text-[#A0ADB5] font-mono tabular-nums"
                      >
                        {player.far.toFixed(2)}
                      </td>

                      {/* 11. ROUNDS */}
                      <td
                        data-testid={`cell-rounds-${player.id}`}
                        className="w-[60px] min-w-[60px] text-center text-[11px] font-medium text-[#A0ADB5] font-mono tabular-nums"
                      >
                        {player.rounds}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
