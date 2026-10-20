'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { MatchWithDetails, MatchMapDetail } from '../../lib/queries/matches.ts';
import { DynamicTeamLogo } from '../common/DynamicTeamLogo.tsx';

interface MatchesAccordionProps {
  initialMatches: MatchWithDetails[];
}

function getMapDisplayName(raw: string): string {
  const clean = raw.replace(/^de_/, '');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function getMapThumbnail(raw: string): string {
  const norm = raw.toLowerCase().startsWith('de_') ? raw.toLowerCase() : `de_${raw.toLowerCase()}`;
  return `/maps/thumbnails/${norm}.png`;
}

function formatGroupDate(dateVal: Date | string | undefined | null): string {
  if (!dateVal) return 'Sun Sep 20 2026';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'Sun Sep 20 2026';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function MatchesAccordion({ initialMatches }: MatchesAccordionProps) {
  const [activeTab, setActiveTab] = useState<'your' | 'private' | 'public'>('public');
  const [selectedMap, setSelectedMap] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [expandedMatchIds, setExpandedMatchIds] = useState<Set<string>>(() => {
    return new Set(initialMatches.map((m) => m.id));
  });

  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState<string>('');

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    const invalid = files.find((f) => !f.name.toLowerCase().endsWith('.dem'));
    if (invalid) {
      setUploadStatus('error');
      setUploadMessage('Por favor selecione apenas arquivos válidos com extensão .dem');
      return;
    }

    setUploadStatus('uploading');
    setUploadMessage(
      files.length > 1
        ? `Enviando e processando série com ${files.length} mapas (MD${files.length > 3 ? 5 : 3})...`
        : 'Enviando e processando demo localmente...',
    );

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }

      const res = await fetch('/api/demos/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha no processamento da demo');
      }

      setUploadStatus('success');
      setUploadMessage(
        data.message ||
          `${files.length} mapa(s) processado(s) e agrupado(s) na série com sucesso no PostgreSQL!`,
      );
    } catch (err: any) {
      setUploadStatus('error');
      setUploadMessage(err.message || 'Erro ao comunicar com o servidor');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedMatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Collect distinct maps and teams for filters
  const allMaps = useMemo(() => {
    const set = new Set<string>();
    for (const m of initialMatches) {
      if (m.maps && m.maps.length > 0) {
        for (const map of m.maps) {
          set.add(getMapDisplayName(map.map_name));
        }
      } else if (m.map_name) {
        set.add(getMapDisplayName(m.map_name));
      }
    }
    return Array.from(set).sort();
  }, [initialMatches]);

  const allTeams = useMemo(() => {
    const set = new Set<string>();
    for (const m of initialMatches) {
      if (m.team1) set.add(m.team1);
      if (m.team2) set.add(m.team2);
    }
    return Array.from(set).sort();
  }, [initialMatches]);

  // Filter matches
  const filteredMatches = useMemo(() => {
    return initialMatches.filter((m) => {
      if (selectedMap !== 'all') {
        const hasMap =
          (m.maps && m.maps.some((mm) => getMapDisplayName(mm.map_name) === selectedMap)) ||
          (m.map_name && getMapDisplayName(m.map_name) === selectedMap);
        if (!hasMap) return false;
      }
      if (selectedTeam !== 'all') {
        if (m.team1 !== selectedTeam && m.team2 !== selectedTeam) return false;
      }
      return true;
    });
  }, [initialMatches, selectedMap, selectedTeam]);

  // Group matches by date
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, MatchWithDetails[]>();
    for (const m of filteredMatches) {
      const dateKey = formatGroupDate(m.match_date);
      const list = groups.get(dateKey) || [];
      list.push(m);
      groups.set(dateKey, list);
    }
    return Array.from(groups.entries());
  }, [filteredMatches]);

  return (
    <div className="w-full max-w-[1360px] mx-auto space-y-4 select-none font-sans text-white">
      {/* 1. Header Tabs: Your Matches | Private Demos | Public Demos */}
      <div className="flex items-center gap-8 border-b border-[#1F2629] pb-0 text-sm">
        <button
          type="button"
          onClick={() => setActiveTab('your')}
          className={`flex items-center gap-2 pb-2.5 font-medium transition-colors border-b-2 ${
            activeTab === 'your'
              ? 'text-white border-[#00FFA3] font-semibold'
              : 'text-[#6B7A82] border-transparent hover:text-white'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Your Matches
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('private')}
          className={`flex items-center gap-2 pb-2.5 font-medium transition-colors border-b-2 ${
            activeTab === 'private'
              ? 'text-white border-[#00FFA3] font-semibold'
              : 'text-[#6B7A82] border-transparent hover:text-white'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
          </svg>
          Private Demos
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('public')}
          className={`flex items-center gap-2 pb-2.5 font-medium transition-colors border-b-2 ${
            activeTab === 'public'
              ? 'text-white border-[#00FFA3] font-semibold'
              : 'text-[#6B7A82] border-transparent hover:text-white'
          }`}
        >
          <svg className="w-4 h-4 text-[#00FFA3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
          Public Demos
        </button>
      </div>

      {/* 2. Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 py-1">
        <label className="flex items-center gap-2 h-8 rounded-[2px] border border-[#1F2629] bg-[#111618] px-3 text-xs text-[#6B7A82] cursor-pointer hover:border-[#6B7A82] transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polygon points="12 8 8 12 12 16 16 12 12 8" />
          </svg>
          <select
            value={selectedMap}
            onChange={(e) => setSelectedMap(e.target.value)}
            className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1"
          >
            <option value="all" className="bg-[#111618] text-white">All maps</option>
            {allMaps.map((mapName) => (
              <option key={mapName} value={mapName} className="bg-[#111618] text-white">
                {mapName}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 h-8 rounded-[2px] border border-[#1F2629] bg-[#111618] px-3 text-xs text-[#6B7A82] cursor-pointer hover:border-[#6B7A82] transition-colors">
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1"
          >
            <option value="all" className="bg-[#111618] text-white">All Teams</option>
            {allTeams.map((teamName) => (
              <option key={teamName} value={teamName} className="bg-[#111618] text-white">
                {teamName}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => {
            setSelectedMap('all');
            setSelectedTeam('all');
          }}
          className="flex items-center gap-1.5 h-8 rounded-[2px] border border-[#1F2629] bg-[#111618] px-3 text-xs font-medium text-[#6B7A82] hover:text-white hover:border-[#6B7A82] transition-colors"
        >
          <span>+ Filters</span>
        </button>
      </div>

      {/* 3. Your Matches Upload Area */}
      {activeTab === 'your' && (
        <div className="rounded-[2px] border border-dashed border-[#1F2629] hover:border-[#00FFA3]/50 bg-[#111618] p-6 text-center transition-colors mb-4">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#00FFA3]/10 border border-[#00FFA3]/30 flex items-center justify-center text-[#00FFA3]">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                Ingestão Local de Demos (.dem)
              </h3>
              <p className="text-xs text-[#6B7A82] font-mono mt-1">
                Selecione um ou múltiplos arquivos .dem da partida/série (ex: m1, m2, m3). O parser local processará os ticks e agrupará a série no PostgreSQL.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <label className="cursor-pointer rounded-[2px] border border-[#00FFA3] bg-[#00FFA3] px-4 py-2 text-xs font-mono font-bold text-[#0B0E0F] hover:bg-[#00FFA3]/90 transition-all uppercase flex items-center gap-2">
                <input
                  type="file"
                  multiple
                  accept=".dem"
                  className="hidden"
                  onChange={handleFileInputChange}
                  disabled={uploadStatus === 'uploading'}
                />
                <span>{uploadStatus === 'uploading' ? 'Processando...' : 'Upload Demos (.dem)'}</span>
              </label>
            </div>

            {uploadStatus === 'uploading' && (
              <div className="p-3 bg-[#0E1214] border border-[#1F2629] rounded-[2px] space-y-1 mt-3">
                <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#00FFA3]">
                  <span className="w-2 h-2 rounded-full bg-[#00FFA3] animate-ping" />
                  <span>PROCESSANDO DEMO EM BACKGROUND...</span>
                </div>
                <p className="text-[11px] font-mono text-[#6B7A82]">
                  {uploadMessage}
                </p>
              </div>
            )}

            {uploadStatus === 'success' && (
              <div className="p-3 bg-[#00FFA3]/10 border border-[#00FFA3]/40 rounded-[2px] text-xs font-mono text-[#00FFA3] mt-3">
                ✓ {uploadMessage}
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/40 rounded-[2px] text-xs font-mono text-[#EF4444] mt-3">
                ✕ {uploadMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Match Groups by Date */}
      <div className="space-y-6 pt-2">
        {groupedByDate.map(([dateString, matches]) => (
          <div key={dateString} className="space-y-2">
            {/* Date Header */}
            <div className="flex items-center gap-1.5 py-1">
              <span className="text-[#00FFA3] font-mono font-bold text-sm">/</span>
              <span className="font-mono text-xs font-bold text-white tracking-wide">
                {dateString}
              </span>
            </div>

            {/* Accordion Cards */}
            <div className="space-y-3">
              {matches.map((match) => {
                const isExpanded = expandedMatchIds.has(match.id);
                const scoreDiff = match.score_t1 - match.score_t2;
                const isT1Winner = match.score_t1 > match.score_t2;
                const isT2Winner = match.score_t2 > match.score_t1;

                // Extract maps
                const mapsList: MatchMapDetail[] =
                  match.maps && match.maps.length > 0
                    ? match.maps
                    : [
                        {
                          id: match.map_id || match.id,
                          map_name: match.map_name || 'de_inferno',
                          rounds_t1: match.score_t1,
                          rounds_t2: match.score_t2,
                          pick_type: 'PICK',
                          pick_team: match.team1,
                        },
                      ];

                return (
                  <article
                    key={match.id}
                    className="rounded-[2px] border border-[#1F2629] bg-[#111618] overflow-hidden transition-all"
                  >
                    {/* Accordion Header Bar */}
                    <div
                      onClick={() => toggleExpand(match.id)}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#0E1214] border-b border-[#1F2629] cursor-pointer hover:bg-[#13191B] transition-colors"
                    >
                      {/* Left: Format & Score */}
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono font-bold text-[#E2B714] tracking-wider uppercase">
                          {match.format || 'BO3'}
                        </span>

                        <div className="flex items-center gap-2">
                          <DynamicTeamLogo teamName={match.team1} size={16} />
                          <span
                            className={`font-mono text-xs font-bold ${
                              isT1Winner ? 'text-[#00FFA3]' : 'text-white'
                            }`}
                          >
                            {match.score_t1}
                          </span>
                          <span className="text-[#6B7A82] font-mono text-xs">:</span>
                          <span
                            className={`font-mono text-xs font-bold ${
                              isT2Winner ? 'text-[#00FFA3]' : 'text-white'
                            }`}
                          >
                            {match.score_t2}
                          </span>
                          <DynamicTeamLogo teamName={match.team2} size={16} />
                        </div>
                      </div>

                      {/* Right: Bans and Expand toggle */}
                      <div className="flex items-center gap-4 text-xs font-mono text-[#6B7A82]">
                        {match.bans && match.bans.length > 0 && (
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-[11px] font-bold text-[#9BA8B0] uppercase">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                              </svg>
                              BANS
                            </span>

                            {match.bans.map((ban, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <DynamicTeamLogo teamName={ban.team} size={14} />
                                <span className="text-[#7E8F98] text-[11px]">
                                  {ban.maps.join(', ')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <svg
                          className={`w-4 h-4 text-[#6B7A82] transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-white' : ''
                          }`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>

                    {/* Accordion Body (Map Rows) */}
                    {isExpanded && (
                      <div className="divide-y divide-[#1F2629]">
                        {mapsList.map((mapItem, idx) => {
                          const mapTitle = getMapDisplayName(mapItem.map_name);
                          const thumbUrl = getMapThumbnail(mapItem.map_name);
                          const isDecider =
                            mapItem.pick_type === 'DECIDER' ||
                            idx === mapsList.length - 1 && mapsList.length > 2;
                          const pickLabel = isDecider ? 'DECIDER' : 'PICK';

                          const isMapT1Winner = mapItem.rounds_t1 > mapItem.rounds_t2;
                          const isMapT2Winner = mapItem.rounds_t2 > mapItem.rounds_t1;

                          return (
                            <div
                              key={mapItem.id || idx}
                              className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-[#111618] hover:bg-[#13191B]/80 transition-colors"
                            >
                              {/* Left: Map Thumbnail & Name */}
                              <div className="flex items-center gap-4">
                                <div
                                  className="relative w-28 h-12 rounded-[2px] overflow-hidden border border-[#1F2629] flex flex-col justify-between p-1.5 bg-cover bg-center shrink-0"
                                  style={{
                                    backgroundImage: `linear-gradient(to right, rgba(11,14,15,0.85), rgba(11,14,15,0.4)), url(${thumbUrl})`,
                                  }}
                                >
                                  <span
                                    className={`text-[9px] font-mono font-bold tracking-wider uppercase px-1 py-0.2 rounded-[1px] w-fit ${
                                      isDecider
                                        ? 'bg-[#FF8C00]/20 text-[#FF8C00] border border-[#FF8C00]/30'
                                        : 'bg-[#00FFA3]/20 text-[#00FFA3] border border-[#00FFA3]/30'
                                    }`}
                                  >
                                    {pickLabel}
                                  </span>
                                  <span className="text-xs font-black uppercase text-white tracking-tight drop-shadow-sm">
                                    {mapTitle}
                                  </span>
                                </div>

                                {/* Score & Teams Breakdown */}
                                <div className="space-y-1 font-mono text-xs">
                                  {/* Team 1 Row */}
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`w-6 font-bold tabular-nums text-right ${
                                        isMapT1Winner ? 'text-[#00FFA3]' : 'text-[#7E8F98]'
                                      }`}
                                    >
                                      {mapItem.rounds_t1}
                                    </span>
                                    <DynamicTeamLogo teamName={match.team1} size={15} />
                                    <span
                                      className={`font-semibold text-xs ${
                                        isMapT1Winner ? 'text-white' : 'text-[#9BA8B0]'
                                      }`}
                                    >
                                      {match.team1}
                                    </span>
                                  </div>

                                  {/* Team 2 Row */}
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`w-6 font-bold tabular-nums text-right ${
                                        isMapT2Winner ? 'text-[#00FFA3]' : 'text-[#7E8F98]'
                                      }`}
                                    >
                                      {mapItem.rounds_t2}
                                    </span>
                                    <DynamicTeamLogo teamName={match.team2} size={15} />
                                    <span
                                      className={`font-semibold text-xs ${
                                        isMapT2Winner ? 'text-white' : 'text-[#9BA8B0]'
                                      }`}
                                    >
                                      {match.team2}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Center: Tournament / Event Tag */}
                              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#7E8F98]">
                                <svg
                                  className="w-3.5 h-3.5 text-[#6B7A82]"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                  <line x1="16" y1="2" x2="16" y2="6" />
                                  <line x1="8" y1="2" x2="8" y2="6" />
                                  <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                <span>{match.event_name || 'Counter-Strike 2 Match'}</span>
                              </div>

                              {/* Right: Actions */}
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/matches/${match.id}`}
                                  className="rounded-[2px] border border-[#1F2629] bg-[#0B0E0F] px-2.5 py-1 text-xs font-mono font-medium text-[#9BA8B0] hover:text-white hover:border-[#6B7A82] transition-colors"
                                >
                                  Overview
                                </Link>

                                <Link
                                  href={`/replayer/${match.id}`}
                                  className="flex items-center gap-1.5 rounded-[2px] border border-[#00FFA3]/60 bg-[#00FFA3]/10 px-3 py-1 text-xs font-mono font-bold text-[#00FFA3] hover:bg-[#00FFA3] hover:text-[#0B0E0F] transition-all"
                                >
                                  <svg
                                    className="w-3 h-3 fill-current"
                                    viewBox="0 0 24 24"
                                  >
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                  </svg>
                                  <span>2D</span>
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        ))}

        {groupedByDate.length === 0 && (
          <div className="text-center py-12 border border-[#1F2629] rounded-[2px] bg-[#111618] text-[#6B7A82] font-mono text-xs">
            Nenhuma partida encontrada para os filtros selecionados.
          </div>
        )}
      </div>
    </div>
  );
}

export default MatchesAccordion;
