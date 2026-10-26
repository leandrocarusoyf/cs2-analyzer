'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type {
  TacticalTelemetryData,
  PlayerTelemetry,
  KillFeedEvent,
  TimelineEvent,
  TerritoryAreaControl,
} from '../../types/tactical-telemetry';
import { mockTelemetryData } from '../../data/mockTelemetryData';
import { getContrastingTeamColor } from '../../utils/contrast';
import {
  WeaponIcon,
  UtilityIcon,
  TeamLogoIcon,
  iconMap,
} from './InventoryUtilityIcons';

export interface Tactical2DReplayDashboardProps {
  initialData?: TacticalTelemetryData;
}

export function Tactical2DReplayDashboard({
  initialData = mockTelemetryData,
}: Tactical2DReplayDashboardProps) {
  const data = initialData;

  // Estados locais para interatividade do HUD e Radar
  const [showUtility, setShowUtility] = useState<boolean>(true);
  const [showSightlines, setShowSightlines] = useState<boolean>(true);
  const [showTracers, setShowTracers] = useState<boolean>(true);

  // Estados de reprodução da Linha do Tempo
  const [isPlaying, setIsPlaying] = useState<boolean>(data.matchState.isPlaying);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(data.matchState.playbackSpeed);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState<number>(
    data.matchState.currentTimeSeconds
  );

  // Efeito de reprodução simulada (avança o timer enquanto isPlaying estiver ativo)
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTimeSeconds((prev) => {
        const next = prev + 0.1 * playbackSpeed;
        if (next > data.matchState.maxTimeSeconds) {
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, data.matchState.maxTimeSeconds]);

  // Formatação de minutos e segundos sem exibir ticks brutos da engine
  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const minsPadded = mins.toString().padStart(2, '0');
    const secsPadded = secs.toFixed(2).padStart(5, '0');
    return `${minsPadded}:${secsPadded}`;
  };

  const progressPercentage = Math.min(
    100,
    Math.max(0, (currentTimeSeconds / data.matchState.maxTimeSeconds) * 100)
  );

  // Cálculo das cores de alto contraste para os times
  const ctTeamTextColor = getContrastingTeamColor(data.header.teamCT.color);
  const tTeamTextColor = getContrastingTeamColor(data.header.teamT.color);

  // Contagem de sobreviventes para legenda
  const ctAliveCount = data.teamCT.players.filter((p) => p.isAlive).length;
  const tAliveCount = data.teamT.players.filter((p) => p.isAlive).length;
  const deadPlayerNames = data.teamT.players
    .concat(data.teamCT.players)
    .filter((p) => !p.isAlive)
    .map((p) => p.name)
    .join(', ');

  // Velocidades suportadas
  const playbackSpeedOptions = [0.5, 1.0, 2.0, 4.0];

  // Itens estritos da seção OPERATIONS (sem itens extras)
  const operationsNavItems = [
    { label: 'Dashboard', icon: 'dashboard', href: '/', active: false },
    { label: 'Match History', icon: 'history', href: '/matches', active: false },
    { label: '2D Tactical Map', icon: 'layers', href: '/tactical-map', active: true },
    { label: 'Player Stats', icon: 'query_stats', href: '/stats/player', active: false },
  ];

  return (
    <div className="bg-[#0A0E14] text-[#E1E2EB] font-sans antialiased min-h-screen select-none">
      {/* =========================================================================
          1. BARRA LATERAL ESQUERDA (SIDEBAR - 100% FIXA)
         ========================================================================= */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-[#121721] border-r border-[#1F2735] z-50 flex flex-col justify-between">
        <div className="flex flex-col">
          {/* Cabeçalho da Sidebar */}
          <div className="h-16 px-5 flex items-center gap-2.5 border-b border-[#1F2735]">
            <div className="w-7 h-7 rounded-lg bg-[#00F0FF] flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.4)]">
              <svg
                className="w-4 h-4 text-[#001F24]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" strokeWidth="2" />
                <path d="M12 3a9 9 0 0 1 9 9" />
                <path d="M12 7a5 5 0 0 1 5 5" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-wider text-white uppercase">
                ANALYTICS
              </span>
              <span className="text-[10px] font-mono font-bold text-[#00F0FF] tracking-widest">
                // CS2 TELEMETRY
              </span>
            </div>
          </div>

          {/* Seção OPERATIONS */}
          <div className="px-4 py-3">
            <span className="text-[11px] font-mono font-bold text-[#849396] uppercase px-2 tracking-widest">
              OPERATIONS
            </span>
          </div>

          {/* Navegação Estrita (4 itens permitidos) */}
          <nav className="flex flex-col gap-1 px-2.5">
            {operationsNavItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  item.active
                    ? 'bg-[#00F0FF] text-[#001F24] shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                    : 'text-[#BAC9CC] hover:bg-[#1A2230] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Rodapé Fixo de Telemetria do Sistema */}
        <div className="p-3.5 m-2.5 rounded-lg bg-[#151B26] border border-[#1F2735] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-[#849396] uppercase">
              STATUS
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#00F0FF]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse" />
              {data.systemStatus.engineVersion}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-[#1F2735]/60">
            <span className="text-[11px] text-[#BAC9CC]">LATENCY</span>
            <span className="text-[12px] font-mono font-bold text-[#00F0FF]">
              {data.systemStatus.latency}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-[#849396] uppercase">
              PARSER
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[#1A2230] text-[#E1E2EB] font-mono text-[11px] font-semibold tracking-wide border border-[#1F2735]">
              {data.systemStatus.tickrate}
            </span>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          CONTEÚDO PRINCIPAL (DESLOCADO 64px DA SIDEBAR)
         ========================================================================= */}
      <div className="pl-64">
        {/* =======================================================================
            2. HEADER DA PARTIDA (DADOS VIA PROPS COM LÓGICA DE CONTRASTE)
           ======================================================================= */}
        <header className="fixed top-0 left-64 right-0 h-16 bg-[#121721]/95 backdrop-blur-md border-b border-[#1F2735] z-40 px-5 flex items-center justify-between">
          <div className="flex items-center gap-5">
            {/* Placar dos Times com Lógica de Contraste getContrastingTeamColor */}
            <div className="flex items-center gap-2">
              {/* CT Team (NAVI) */}
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: `${data.header.teamCT.color}15`,
                    borderColor: `${data.header.teamCT.color}40`,
                  }}
                >
                  <TeamLogoIcon
                    logoType={data.header.teamCT.logoType}
                    color={data.header.teamCT.color}
                  />
                </div>
                <span
                  className="text-[14px] font-bold tracking-wide"
                  style={{ color: ctTeamTextColor }}
                >
                  {data.header.teamCT.name}
                </span>
                <span
                  className="text-[13px] font-mono font-bold px-2.5 py-1 rounded bg-[#1A2230] border leading-none"
                  style={{
                    color: ctTeamTextColor,
                    borderColor: `${data.header.teamCT.color}55`,
                  }}
                >
                  {data.header.teamCT.score}
                </span>
              </div>

              {/* Muted Colon Divider */}
              <span className="font-mono text-sm text-[#64748B] px-1 select-none">
                :
              </span>

              {/* T Team (FaZe) */}
              <div className="flex items-center gap-2">
                <span
                  className="text-[13px] font-mono font-bold px-2.5 py-1 rounded bg-[#1A2230] border leading-none"
                  style={{
                    color: tTeamTextColor,
                    borderColor: `${data.header.teamT.color}55`,
                  }}
                >
                  {data.header.teamT.score}
                </span>
                <span
                  className="text-[14px] font-bold tracking-wide"
                  style={{ color: tTeamTextColor }}
                >
                  {data.header.teamT.name}
                </span>
                <div
                  className="w-5 h-5 rounded flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: `${data.header.teamT.color}15`,
                    borderColor: `${data.header.teamT.color}40`,
                  }}
                >
                  <TeamLogoIcon
                    logoType={data.header.teamT.logoType}
                    color={data.header.teamT.color}
                  />
                </div>
              </div>
            </div>

            <div className="h-6 w-px bg-[#1F2735] hidden md:block" />

            {/* Informações da Partida (Mapa e Data) */}
            <div className="hidden lg:flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-[#00F0FF] tracking-wider">
                  {data.header.mapName}
                </span>
                <span className="text-[10px] text-[#849396]">•</span>
                <span className="text-[11px] font-mono text-[#BAC9CC]">
                  {data.header.matchDate}
                </span>
              </div>
              <span className="text-[11px] text-[#849396]">
                {data.header.tournamentName}
              </span>
            </div>

            <div className="hidden xl:flex items-center">
              <span className="px-2 py-0.5 rounded bg-[#1A2230] border border-[#1F2735] text-[10px] font-mono font-bold text-[#BAC9CC] tracking-wider">
                {data.header.badgeLabel}
              </span>
            </div>
          </div>

          {/* Ações da Partida: OVERVIEW, UPAR DEMO, Export Replay, Share e Analista */}
          <div className="flex items-center gap-2.5">
            <Link
              href={data.header.overviewRoute}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A2230] hover:bg-[#222C3E] border border-[#1F2735] text-[#00F0FF] text-xs font-bold tracking-wider transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              <span>OVERVIEW</span>
            </Link>

            <button
              type="button"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A2230] hover:bg-[#222C3E] border border-[#1F2735] text-white text-xs font-bold tracking-wider transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px] text-[#00F0FF]">
                upload
              </span>
              <span>UPAR DEMO</span>
            </button>

            {/* Export Replay & Share */}
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151B26] hover:bg-[#1A2230] border border-[#1F2735] text-[#E1E2EB] text-xs font-semibold transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span className="hidden sm:inline">Export Replay</span>
            </button>

            <button
              type="button"
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#151B26] hover:bg-[#1A2230] border border-[#1F2735] text-[#E1E2EB] transition-colors shadow-sm"
              aria-label="Compartilhar"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
            </button>

            <div className="h-6 w-px bg-[#1F2735]" />

            {/* Analyst Desk Profile */}
            <div className="flex items-center gap-2 pl-1">
              <div className="w-8 h-8 rounded-full bg-[#00F0FF] flex items-center justify-center text-[#001F24] shadow-[0_0_8px_rgba(0,240,255,0.3)]">
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
              <div className="hidden 2xl:flex flex-col text-left">
                <span className="text-xs font-bold text-white leading-none">
                  Analyst Desk
                </span>
                <span className="text-[10px] text-[#00F0FF] leading-tight">
                  Tier-1 Verified
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* =======================================================================
            3. MAIN VIEWPORT: RADAR 2D + ANALYTICS BENTO + PAINEL DE JOGADORES
           ======================================================================= */}
        <main className="w-full pt-16 bg-[#0A0E14] min-h-screen">
          <div className="p-3.5 grid grid-cols-12 gap-3.5">
            {/* COLUNA ESQUERDA: Radar 2D, Scrubber e 4 Cards Bento */}
            <div className="col-span-12 xl:col-span-9 flex flex-col gap-3 min-w-0">
              {/* CARD DO RADAR 2D */}
              <div className="relative bg-[#121721] border border-[#1F2735] rounded-lg overflow-hidden flex flex-col shadow-xl">
                {/* Radar HUD Top Bar Overlay */}
                <div className="px-4 py-2 bg-[#151922] border-b border-[#1F2735] flex items-center justify-between z-20">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] shadow-[0_0_6px_#00F0FF]" />
                    <span className="text-[11px] font-mono text-[#BAC9CC] uppercase tracking-wider">
                      RADAR VIEW // FULL MAP
                    </span>
                  </div>

                  {/* Filtros Táticos (Utility, Sightlines, Tracers) com useState */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowUtility((prev) => !prev)}
                      className={`h-[26px] px-2.5 rounded font-sans text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm ${
                        showUtility
                          ? 'bg-[#1A2230] border border-[#00F0FF]/40 text-white'
                          : 'bg-[#151922] border border-[#1F2735] text-[#64748B] hover:text-[#94A3B8]'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          showUtility
                            ? 'bg-[#00F0FF] shadow-[0_0_5px_#00F0FF]'
                            : 'bg-[#64748B]'
                        }`}
                      />
                      <span>Utility</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowSightlines((prev) => !prev)}
                      className={`h-[26px] px-2.5 rounded font-sans text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm ${
                        showSightlines
                          ? 'bg-[#1A2230] border border-[#00F0FF]/40 text-white'
                          : 'bg-[#151922] border border-[#1F2735] text-[#64748B] hover:text-[#94A3B8]'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          showSightlines
                            ? 'bg-[#00F0FF] shadow-[0_0_5px_#00F0FF]'
                            : 'bg-[#64748B]'
                        }`}
                      />
                      <span>Sightlines</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowTracers((prev) => !prev)}
                      className={`h-[26px] px-2.5 rounded font-sans text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm ${
                        showTracers
                          ? 'bg-[#1A2230] border border-[#00F0FF]/40 text-white'
                          : 'bg-[#151922] border border-[#1F2735] text-[#64748B] hover:text-[#94A3B8]'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          showTracers
                            ? 'bg-[#00F0FF] shadow-[0_0_5px_#00F0FF]'
                            : 'bg-[#64748B]'
                        }`}
                      />
                      <span>Tracers</span>
                    </button>
                  </div>
                </div>

                {/* Vector Blueprint Stage (aspect-[16/9]) */}
                <div className="relative w-full aspect-[16/9] bg-[#0A0E14] overflow-hidden select-none">
                  {/* Grid de textura de fundo */}
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#00daf3_1px,transparent_1px)] [background-size:24px_24px]" />

                  {/* KILL FEED TÁTICO (CANTO SUPERIOR DIREITO SOBRE O RADAR VIA .MAP) */}
                  <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5 pointer-events-none max-w-xs">
                    {data.killFeed.map((event: KillFeedEvent) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#121721]/90 border border-[#1F2735] backdrop-blur-md shadow-lg text-[11px]"
                      >
                        <span
                          className="font-bold tracking-tight"
                          style={{
                            color: event.killerSide === 'CT' ? '#2B7FFF' : '#FF5500',
                          }}
                        >
                          {event.killerName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#1A2230] border border-[#1F2735] font-mono text-[9px] font-semibold text-[#00F0FF]">
                          {event.weapon}
                        </span>
                        {event.isHeadshot && (
                          <span className="text-red-400 font-bold text-[9px] px-1 rounded bg-red-950/60 border border-red-800/40">
                            HS
                          </span>
                        )}
                        <span
                          className="font-bold tracking-tight"
                          style={{
                            color: event.victimSide === 'CT' ? '#2B7FFF' : '#FF5500',
                          }}
                        >
                          {event.victimName}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* SVG Blueprint de Mirage */}
                  <svg
                    className="w-full h-full"
                    fill="none"
                    viewBox="0 0 1000 580"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <radialGradient cx="50%" cy="50%" id="smokeGradient" r="50%">
                        <stop offset="0%" stopColor="#BAC9CC" stopOpacity="0.85" />
                        <stop offset="70%" stopColor="#849396" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#849396" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient cx="50%" cy="50%" id="molyGradient" r="50%">
                        <stop offset="0%" stopColor="#FFB690" stopOpacity="0.9" />
                        <stop offset="50%" stopColor="#953F00" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="#953F00" stopOpacity="0" />
                      </radialGradient>
                      <linearGradient id="ctVision" x1="0%" x2="100%" y1="0%" y2="100%">
                        <stop offset="0%" stopColor="#2B7FFF" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#2B7FFF" stopOpacity="0.02" />
                      </linearGradient>
                      <linearGradient id="tVision" x1="0%" x2="100%" y1="0%" y2="100%">
                        <stop offset="0%" stopColor="#FF5500" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#FF5500" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>

                    {/* Geometria Estrutural de de_mirage */}
                    <rect
                      fill="#10131A"
                      height="520"
                      opacity="0.6"
                      rx="8"
                      width="940"
                      x="30"
                      y="30"
                    />

                    {/* T Spawn & T Roofs */}
                    <path d="M 60 210 L 160 210 L 160 380 L 60 380 Z" fill="#191C22" />
                    <text
                      fill="#3B494C"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="11"
                      fontWeight="700"
                      letterSpacing="2"
                      textAnchor="middle"
                      x="110"
                      y="295"
                    >
                      T SPAWN
                    </text>

                    {/* Palace Alley & Interior */}
                    <path
                      d="M 160 390 L 340 390 L 370 470 L 260 470 L 260 520 L 160 520 Z"
                      fill="#191C22"
                    />
                    <path
                      d="M 370 400 L 460 400 L 490 490 L 370 490 Z"
                      fill="#1D2026"
                    />
                    <text
                      fill="#3B494C"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="10"
                      fontWeight="600"
                      textAnchor="middle"
                      x="420"
                      y="450"
                    >
                      PALACE
                    </text>

                    {/* A Ramp & Tetris */}
                    <path
                      d="M 340 360 L 460 360 L 460 390 L 340 390 Z"
                      fill="#191C22"
                    />
                    <text
                      fill="#3B494C"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="9"
                      textAnchor="middle"
                      x="390"
                      y="380"
                    >
                      A RAMP
                    </text>
                    <rect fill="#272A31" height="22" width="22" x="470" y="355" />
                    <text
                      fill="#849396"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="8"
                      textAnchor="middle"
                      x="481"
                      y="370"
                    >
                      TETRIS
                    </text>

                    {/* Bombsite A Ground */}
                    <polygon fill="#191C22" points="500,320 640,320 640,440 500,440" />
                    <rect
                      fill="#272A31"
                      height="30"
                      stroke="#3B494C"
                      strokeWidth="0.5"
                      width="40"
                      x="545"
                      y="365"
                    />
                    <text
                      fill="#00F0FF"
                      fontFamily="Space Grotesk, sans-serif"
                      fontSize="14"
                      fontWeight="700"
                      opacity="0.85"
                      textAnchor="middle"
                      x="565"
                      y="384"
                    >
                      A
                    </text>
                    <text
                      fill="#3B494C"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="9"
                      textAnchor="middle"
                      x="565"
                      y="420"
                    >
                      DEFAULT
                    </text>

                    {/* CT Ticket & Triple Box */}
                    <rect fill="#272A31" height="40" width="30" x="650" y="340" />
                    <text
                      fill="#849396"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="8"
                      textAnchor="middle"
                      x="665"
                      y="364"
                    >
                      CT
                    </text>
                    <rect fill="#272A31" height="22" width="22" x="590" y="335" />

                    {/* Jungle & Connector */}
                    <path
                      d="M 500 240 L 590 240 L 590 320 L 530 320 L 500 280 Z"
                      fill="#191C22"
                    />
                    <text
                      fill="#3B494C"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="9"
                      textAnchor="middle"
                      x="545"
                      y="275"
                    >
                      JUNGLE
                    </text>
                    <path
                      d="M 440 240 L 500 240 L 500 320 L 450 320 Z"
                      fill="#1D2026"
                    />
                    <text
                      fill="#3B494C"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="9"
                      textAnchor="middle"
                      x="470"
                      y="280"
                    >
                      CONN
                    </text>

                    {/* Sniper Nest / Window & Mid Courtyard */}
                    <rect fill="#272A31" height="50" width="60" x="440" y="180" />
                    <text
                      fill="#00F0FF"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="9"
                      fontWeight="700"
                      textAnchor="middle"
                      x="470"
                      y="210"
                    >
                      WINDOW
                    </text>
                    <path
                      d="M 280 180 L 440 180 L 440 230 L 280 230 Z"
                      fill="#191C22"
                    />
                    <text
                      fill="#3B494C"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="10"
                      letterSpacing="1"
                      textAnchor="middle"
                      x="360"
                      y="210"
                    >
                      MID COURTYARD
                    </text>
                    <rect fill="#272A31" height="26" width="18" x="365" y="200" />
                    <text
                      fill="#849396"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="7"
                      textAnchor="middle"
                      x="374"
                      y="217"
                    >
                      TOP BOX
                    </text>

                    {/* B Short / Catwalk */}
                    <path
                      d="M 430 130 L 560 130 L 560 170 L 430 170 Z"
                      fill="#191C22"
                    />
                    <text
                      fill="#3B494C"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="9"
                      textAnchor="middle"
                      x="495"
                      y="154"
                    >
                      CATWALK / SHORT
                    </text>

                    {/* B Apartments */}
                    <path
                      d="M 170 80 L 360 80 L 360 140 L 220 140 L 220 160 L 170 160 Z"
                      fill="#191C22"
                    />
                    <text
                      fill="#3B494C"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="10"
                      textAnchor="middle"
                      x="260"
                      y="115"
                    >
                      B APARTMENTS
                    </text>

                    {/* Bombsite B Ground & Van */}
                    <polygon fill="#191C22" points="560,70 720,70 720,190 560,190" />
                    <rect
                      fill="#272A31"
                      height="35"
                      stroke="#3B494C"
                      strokeWidth="0.5"
                      width="45"
                      x="580"
                      y="100"
                    />
                    <text
                      fill="#00F0FF"
                      fontFamily="Space Grotesk, sans-serif"
                      fontSize="14"
                      fontWeight="700"
                      opacity="0.85"
                      textAnchor="middle"
                      x="602"
                      y="122"
                    >
                      B
                    </text>
                    <rect fill="#272A31" height="35" rx="3" width="18" x="545" y="80" />
                    <text
                      fill="#849396"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="7"
                      textAnchor="middle"
                      x="554"
                      y="102"
                    >
                      VAN
                    </text>

                    {/* CT Spawn & Market */}
                    <path
                      d="M 720 160 L 840 160 L 840 260 L 720 260 Z"
                      fill="#191C22"
                    />
                    <text
                      fill="#3B494C"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="10"
                      textAnchor="middle"
                      x="780"
                      y="215"
                    >
                      MARKET
                    </text>
                    <path
                      d="M 720 270 L 870 270 L 870 380 L 720 380 Z"
                      fill="#191C22"
                    />
                    <text
                      fill="#3B494C"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="11"
                      fontWeight="700"
                      letterSpacing="2"
                      textAnchor="middle"
                      x="795"
                      y="330"
                    >
                      CT SPAWN
                    </text>

                    {/* CAMADA DE UTILITÁRIAS DINÂMICAS (CONTROLADA PELO FILTRO showUtility) */}
                    {showUtility && (
                      <g className="transition-opacity duration-300">
                        {/* Smokes */}
                        <circle
                          cx="655"
                          cy="355"
                          fill="url(#smokeGradient)"
                          r="32"
                        />
                        <text
                          fill="#E1E2EB"
                          fontFamily="JetBrains Mono, monospace"
                          fontSize="8"
                          fontWeight="700"
                          textAnchor="middle"
                          x="655"
                          y="358"
                        >
                          SMOKE [CT]
                        </text>
                        <circle
                          cx="535"
                          cy="285"
                          fill="url(#smokeGradient)"
                          r="34"
                        />
                        <text
                          fill="#E1E2EB"
                          fontFamily="JetBrains Mono, monospace"
                          fontSize="8"
                          fontWeight="700"
                          textAnchor="middle"
                          x="535"
                          y="288"
                        >
                          SMOKE [JGL]
                        </text>
                        <circle
                          cx="490"
                          cy="305"
                          fill="url(#smokeGradient)"
                          r="30"
                        />

                        {/* Molotov no Sandwich */}
                        <ellipse
                          cx="510"
                          cy="370"
                          fill="url(#molyGradient)"
                          rx="24"
                          ry="18"
                        />
                        <text
                          fill="#FFE9DF"
                          fontFamily="JetBrains Mono, monospace"
                          fontSize="7"
                          fontWeight="700"
                          textAnchor="middle"
                          x="510"
                          y="373"
                        >
                          INCENDIARY
                        </text>

                        {/* Flash Pop FX */}
                        <g transform="translate(525, 340)">
                          <polygon
                            fill="#FFE9DF"
                            opacity="0.95"
                            points="0,-10 3,-3 10,0 3,3 0,10 -3,3 -10,0 -3,-3"
                          />
                          <circle
                            cx="0"
                            cy="0"
                            fill="none"
                            opacity="0.6"
                            r="14"
                            stroke="#FFE9DF"
                            strokeDasharray="2 2"
                            strokeWidth="1"
                          />
                          <text
                            fill="#FFE9DF"
                            fontFamily="JetBrains Mono, monospace"
                            fontSize="7"
                            fontWeight="700"
                            textAnchor="middle"
                            x="0"
                            y="-13"
                          >
                            FLASH DETONATE
                          </text>
                        </g>
                      </g>
                    )}

                    {/* TRAJETÓRIAS DE GRANADAS (CONTROLADA PELO FILTRO showTracers) */}
                    {showTracers && (
                      <g className="transition-opacity duration-300">
                        <path
                          d="M 370 380 Q 450 330 655 355"
                          fill="none"
                          opacity="0.75"
                          stroke="#00F0FF"
                          strokeDasharray="4 3"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M 380 375 Q 460 290 535 285"
                          fill="none"
                          opacity="0.75"
                          stroke="#2B7FFF"
                          strokeDasharray="4 3"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M 445 420 Q 480 390 510 370"
                          fill="none"
                          opacity="0.8"
                          stroke="#FFB690"
                          strokeDasharray="4 3"
                          strokeWidth="1.5"
                        />
                      </g>
                    )}

                    {/* KIA Gravestone no Connector */}
                    <g transform="translate(475, 275)">
                      <circle cx="0" cy="0" fill="#93000A" opacity="0.7" r="10" />
                      <text
                        fill="#FFDAD6"
                        fontFamily="JetBrains Mono, monospace"
                        fontSize="9"
                        fontWeight="700"
                        textAnchor="middle"
                        x="0"
                        y="3"
                      >
                        ☠
                      </text>
                      <line
                        stroke="#FFB4AB"
                        strokeDasharray="2 2"
                        strokeWidth="1"
                        x1="-12"
                        x2="12"
                        y1="-12"
                        y2="12"
                      />
                      <text
                        fill="#FFB4AB"
                        fontFamily="JetBrains Mono, monospace"
                        fontSize="7"
                        textAnchor="middle"
                        x="0"
                        y="-14"
                      >
                        broky KIA [AWP]
                      </text>
                    </g>

                    {/* ENTIDADES DOS JOGADORES CT VIA .MAP() */}
                    {data.teamCT.players.map((player: PlayerTelemetry) => {
                      if (!player.mapEntity || !player.isAlive) return null;
                      return (
                        <g
                          key={player.id}
                          transform={`translate(${player.mapEntity.x}, ${player.mapEntity.y})`}
                        >
                          {showSightlines && player.mapEntity.visionConePath && (
                            <path
                              d={player.mapEntity.visionConePath}
                              fill="url(#ctVision)"
                            />
                          )}
                          <circle
                            cx="0"
                            cy="0"
                            fill="#0566D9"
                            r="9"
                            stroke={player.primaryWeapon === 'AWP' ? '#00F0FF' : '#2B7FFF'}
                            strokeWidth={player.primaryWeapon === 'AWP' ? '2' : '1.5'}
                          />
                          <text
                            fill="#E6ECFF"
                            fontFamily="JetBrains Mono, monospace"
                            fontSize="8"
                            fontWeight="700"
                            textAnchor="middle"
                            x="0"
                            y="3.5"
                          >
                            {player.number}
                          </text>
                          <text
                            fill={player.primaryWeapon === 'AWP' ? '#00F0FF' : '#2B7FFF'}
                            fontFamily="JetBrains Mono, monospace"
                            fontSize="7.5"
                            fontWeight={player.primaryWeapon === 'AWP' ? '700' : '600'}
                            textAnchor="middle"
                            x="0"
                            y={player.name === 'iM' ? '-12' : '18'}
                          >
                            {player.mapEntity.label || player.name}
                          </text>
                        </g>
                      );
                    })}

                    {/* ENTIDADES DOS JOGADORES T VIA .MAP() */}
                    {data.teamT.players.map((player: PlayerTelemetry) => {
                      if (!player.mapEntity || !player.isAlive) return null;
                      return (
                        <g
                          key={player.id}
                          transform={`translate(${player.mapEntity.x}, ${player.mapEntity.y})`}
                        >
                          {showSightlines && player.mapEntity.visionConePath && (
                            <path
                              d={player.mapEntity.visionConePath}
                              fill="url(#tVision)"
                            />
                          )}
                          {player.isCarryingC4 && (
                            <circle
                              className="animate-spin"
                              cx="0"
                              cy="0"
                              fill="none"
                              r="14"
                              stroke="#FFB4AB"
                              strokeDasharray="3 2"
                              strokeWidth="1.5"
                            />
                          )}
                          <circle
                            cx="0"
                            cy="0"
                            fill={player.isCarryingC4 ? '#93000A' : '#953F00'}
                            r="9"
                            stroke="#FFB690"
                            strokeWidth="1.5"
                          />
                          <text
                            fill="#FFE9DF"
                            fontFamily="JetBrains Mono, monospace"
                            fontSize="8"
                            fontWeight="700"
                            textAnchor="middle"
                            x="0"
                            y="3.5"
                          >
                            {player.isCarryingC4 ? 'C4' : player.number}
                          </text>
                          <text
                            fill={player.isCarryingC4 ? '#FFB4AB' : '#FFB690'}
                            fontFamily="JetBrains Mono, monospace"
                            fontSize="7.5"
                            fontWeight={player.isCarryingC4 ? '700' : '600'}
                            textAnchor="middle"
                            x="0"
                            y={
                              player.name === 'ropz' || player.isCarryingC4
                                ? '-13'
                                : '18'
                            }
                          >
                            {player.mapEntity.label || player.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Pílula Flutuante de Legenda do Radar */}
                  <div className="absolute bottom-3 left-3 bg-[#0A0E14]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1F2735] flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2B7FFF]" />
                      <span className="font-mono text-[11px] text-[#2B7FFF]">
                        CT ({ctAliveCount} ALIVE)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF5500]" />
                      <span className="font-mono text-[11px] text-[#FFB690]">
                        T ({tAliveCount} ALIVE)
                      </span>
                    </div>
                    {deadPlayerNames && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-red-400 font-mono text-xs">☠</span>
                        <span className="font-mono text-[11px] text-red-400">
                          {deadPlayerNames} (KIA)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* BARRA DA LINHA DO TEMPO & CONTROLES DE TRANSPORTE */}
                <div className="bg-[#121721] px-4 py-2.5 flex flex-col gap-2 border-t border-[#1F2735]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Seletor de Round (via Props) */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="w-6 h-6 rounded bg-[#1A2230] hover:bg-[#222C3E] border border-[#1F2735] flex items-center justify-center text-[#E1E2EB] transition-colors"
                        aria-label="Round Anterior"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          chevron_left
                        </span>
                      </button>

                      <div className="flex items-baseline gap-1.5 px-2.5 py-1 rounded bg-[#0A0E14] border border-[#1F2735]">
                        <span className="text-xs font-bold text-white">
                          {data.matchState.roundLabel}
                        </span>
                        <span className="text-[11px] font-mono text-[#849396]">
                          / {data.matchState.totalRounds}
                        </span>
                        {data.matchState.isMapPoint && (
                          <span className="text-[11px] font-mono text-[#00F0FF] font-semibold">
                            [MAP POINT]
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="w-6 h-6 rounded bg-[#1A2230] hover:bg-[#222C3E] border border-[#1F2735] flex items-center justify-center text-[#849396] transition-colors"
                        disabled
                        aria-label="Próximo Round"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          chevron_right
                        </span>
                      </button>
                    </div>

                    {/* Controles de Transporte de Reprodução */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCurrentTimeSeconds(0)}
                        className="p-1.5 rounded hover:bg-[#1A2230] text-[#BAC9CC] hover:text-white transition-colors"
                        title="Início do Round"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          skip_previous
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setCurrentTimeSeconds((prev) => Math.max(0, prev - 5))
                        }
                        className="p-1.5 rounded hover:bg-[#1A2230] text-[#BAC9CC] hover:text-white transition-colors"
                        title="-5 Segundos"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          replay_5
                        </span>
                      </button>

                      {/* Botão Principal PLAY / PAUSE com Glow Ciano */}
                      <button
                        type="button"
                        onClick={() => setIsPlaying((prev) => !prev)}
                        className={`px-3.5 py-1 rounded font-bold text-xs flex items-center gap-1.5 transition-all ${
                          isPlaying
                            ? 'bg-[#00F0FF] text-[#001F24] shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                            : 'bg-[#1A2230] text-white hover:bg-[#222C3E] border border-[#1F2735]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isPlaying ? 'pause' : 'play_arrow'}
                        </span>
                        <span>{isPlaying ? 'PLAYING' : 'PAUSED'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setCurrentTimeSeconds((prev) =>
                            Math.min(data.matchState.maxTimeSeconds, prev + 5)
                          )
                        }
                        className="p-1.5 rounded hover:bg-[#1A2230] text-[#BAC9CC] hover:text-white transition-colors"
                        title="+5 Segundos"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          forward_5
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setCurrentTimeSeconds(data.matchState.maxTimeSeconds)
                        }
                        className="p-1.5 rounded hover:bg-[#1A2230] text-[#BAC9CC] hover:text-white transition-colors"
                        title="Final do Round"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          skip_next
                        </span>
                      </button>
                    </div>

                    {/* Velocidade de Reprodução & Cronômetro Formatado (Sem Ticks Brutos) */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center rounded bg-[#0A0E14] border border-[#1F2735] p-0.5">
                        {playbackSpeedOptions.map((speed) => (
                          <button
                            key={speed}
                            type="button"
                            onClick={() => setPlaybackSpeed(speed)}
                            className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors ${
                              playbackSpeed === speed
                                ? 'bg-[#00F0FF] text-[#001F24] font-bold shadow-sm'
                                : 'text-[#849396] hover:text-white'
                            }`}
                          >
                            {speed.toFixed(1)}x
                          </button>
                        ))}
                      </div>

                      {/* Cronômetro (PROIBIDO EXIBIR NÚMEROS BRUTOS DE TICKS) */}
                      <div className="font-mono text-[13px] font-bold text-[#00F0FF] tracking-wider">
                        <span>{formatTimer(currentTimeSeconds)}</span>
                        <span className="text-[#849396] font-normal">
                          {' '}
                          / {formatTimer(data.matchState.maxTimeSeconds)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Scrubber Interativo com Marcadores de Eventos Chave via .map() */}
                  <div
                    className="relative w-full h-7 flex items-center group cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const percent = Math.max(0, Math.min(1, clickX / rect.width));
                      setCurrentTimeSeconds(percent * data.matchState.maxTimeSeconds);
                    }}
                  >
                    {/* Barra de Progresso Trilha de Fundo */}
                    <div className="w-full h-2 rounded-full bg-[#1A2230] border border-[#1F2735] relative overflow-hidden">
                      {/* Zona de Freeze Time (Primeiros 15s) */}
                      <div className="absolute left-0 top-0 bottom-0 w-[13%] bg-[#272A31] opacity-75" />
                      {/* Preenchimento Ativo Ciano */}
                      <div
                        className="h-full bg-[#00F0FF] shadow-[0_0_8px_rgba(0,240,255,0.6)]"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>

                    {/* Marcadores de Eventos Anotados na Trilha via .map() */}
                    {data.timelineEvents.map((evt: TimelineEvent) => {
                      if (evt.type === 'playhead') return null;

                      if (evt.type === 'freeze') {
                        return (
                          <div
                            key={evt.id}
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-3.5 bg-[#849396]"
                            style={{ left: `${evt.positionPercent}%` }}
                            title={evt.title}
                          />
                        );
                      }

                      if (evt.type === 'smoke') {
                        return (
                          <div
                            key={evt.id}
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
                            style={{ left: `${evt.positionPercent}%` }}
                            title={evt.title}
                          >
                            <div className="w-2.5 h-2.5 rounded-full bg-[#363940] border border-[#849396] flex items-center justify-center text-[9px] text-[#E1E2EB]">
                              {evt.badgeIcon}
                            </div>
                          </div>
                        );
                      }

                      if (evt.type === 'first_kill') {
                        return (
                          <div
                            key={evt.id}
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
                            style={{ left: `${evt.positionPercent}%` }}
                            title={evt.title}
                          >
                            <div className="w-3.5 h-3.5 rounded-full bg-red-600 border border-red-400 flex items-center justify-center text-[9px] text-white font-bold leading-none shadow-sm">
                              {evt.badgeIcon}
                            </div>
                          </div>
                        );
                      }

                      if (evt.type === 'c4_plant') {
                        return (
                          <div
                            key={evt.id}
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 opacity-75"
                            style={{ left: `${evt.positionPercent}%` }}
                            title={evt.title}
                          >
                            <div className="w-2.5 h-2.5 rounded-full bg-[#FF5500] flex items-center justify-center text-[8px] text-white font-bold">
                              {evt.badgeIcon}
                            </div>
                          </div>
                        );
                      }

                      if (evt.type === 'retake') {
                        return (
                          <div
                            key={evt.id}
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 opacity-50"
                            style={{ left: `${evt.positionPercent}%` }}
                            title={evt.title}
                          >
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                          </div>
                        );
                      }

                      return null;
                    })}

                    {/* Indicador de Cabeça de Leitura (Playhead Ciano com Glow) */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 flex flex-col items-center pointer-events-none"
                      style={{ left: `${progressPercentage}%` }}
                    >
                      <div className="w-4 h-4 rounded-full bg-[#00F0FF] shadow-[0_0_10px_#00F0FF] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#001F24]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===================================================================
                  4. GRADE DE 4 CARDS DE MÉTRICAS AVANÇADAS (INFERIOR)
                 =================================================================== */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* CARD 1: WIN EXPECTANCY */}
                <div className="bg-[#121721] border border-[#1F2735] rounded-lg p-3.5 flex flex-col justify-between shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#BAC9CC] uppercase tracking-wider">
                      WIN EXPECTANCY
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#2B7FFF]/20 text-[#2B7FFF] border border-[#2B7FFF]/30 font-mono text-[10px] font-semibold">
                      {data.advancedMetrics.winExpectancy.deltaLabel}
                    </span>
                  </div>

                  <div className="my-2.5 flex items-baseline justify-between">
                    <div>
                      <span className="font-mono text-2xl font-bold text-[#00F0FF]">
                        {data.advancedMetrics.winExpectancy.ctPercentage.toFixed(1)}
                      </span>
                      <span className="font-mono text-xs text-[#00F0FF] ml-0.5">
                        %
                      </span>
                      <span className="font-mono text-[11px] text-[#849396] ml-1.5">
                        {data.advancedMetrics.winExpectancy.ctTeamName}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-2xl font-bold text-[#FFB690]">
                        {data.advancedMetrics.winExpectancy.tPercentage.toFixed(1)}
                      </span>
                      <span className="font-mono text-xs text-[#FFB690] ml-0.5">
                        %
                      </span>
                      <span className="font-mono text-[11px] text-[#849396] ml-1.5">
                        {data.advancedMetrics.winExpectancy.tTeamName}
                      </span>
                    </div>
                  </div>

                  {/* Barra Dupla de Probabilidade dos Times */}
                  <div className="w-full h-1.5 rounded-full bg-[#1A2230] overflow-hidden flex border border-[#1F2735]">
                    <div
                      className="h-full bg-[#00F0FF]"
                      style={{
                        width: `${data.advancedMetrics.winExpectancy.ctPercentage}%`,
                      }}
                    />
                    <div
                      className="h-full bg-[#FFB690]"
                      style={{
                        width: `${data.advancedMetrics.winExpectancy.tPercentage}%`,
                      }}
                    />
                  </div>
                </div>

                {/* CARD 2: TERRITORY CONTROL */}
                <div className="bg-[#121721] border border-[#1F2735] rounded-lg p-3.5 flex flex-col justify-between shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#BAC9CC] uppercase tracking-wider">
                      TERRITORY CONTROL
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/30 text-[#00F0FF] font-mono text-[10px] font-bold uppercase tracking-wide">
                      {data.advancedMetrics.territoryControl.badge}
                    </span>
                  </div>

                  <div className="my-1.5 flex flex-col gap-0.5">
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-2xl font-bold text-white">
                        {data.advancedMetrics.territoryControl.percentage.toFixed(1)}
                      </span>
                      <span className="font-mono text-xs text-[#00F0FF]">%</span>
                    </div>
                    <div className="text-[11px] text-[#BAC9CC]">
                      {data.advancedMetrics.territoryControl.description}
                    </div>
                  </div>

                  {/* Linhas de divisão de território mapeadas via .map() */}
                  <div className="flex flex-col gap-1 py-1.5 border-t border-b border-[#1F2735] font-mono text-[10px]">
                    {data.advancedMetrics.territoryControl.breakdown.map(
                      (row: TerritoryAreaControl, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between"
                        >
                          <span className="text-[#849396]">{row.area}</span>
                          <span
                            className={`font-semibold ${
                              row.status.includes('CONTROLLED')
                                ? 'text-[#2B7FFF]'
                                : 'text-[#FFB690]'
                            }`}
                          >
                            {row.status}
                          </span>
                        </div>
                      )
                    )}
                  </div>

                  <div className="flex flex-col gap-1 pt-1.5">
                    <div className="w-full h-1.5 rounded-full bg-[#1A2230] overflow-hidden flex border border-[#1F2735]">
                      <div
                        className="h-full bg-[#00F0FF]"
                        style={{
                          width: `${data.advancedMetrics.territoryControl.percentage}%`,
                        }}
                      />
                      <div
                        className="h-full bg-[#272A31]"
                        style={{
                          width: `${
                            100 - data.advancedMetrics.territoryControl.percentage
                          }%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-[#849396]">
                        {data.advancedMetrics.territoryControl.paceLabel}
                      </span>
                      <span className="text-[#BAC9CC]">
                        {data.advancedMetrics.territoryControl.paceBenchmark}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CARD 3: TRADE FRAG RATE */}
                <div className="bg-[#121721] border border-[#1F2735] rounded-lg p-3.5 flex flex-col justify-between shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#BAC9CC] uppercase tracking-wider">
                      TRADE FRAG RATE
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#1A2230] text-[#00F0FF] border border-[#1F2735] font-mono text-[10px] font-bold">
                      {data.advancedMetrics.tradeFragRate.badge}
                    </span>
                  </div>

                  <div className="my-2">
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-2xl font-bold text-[#00F0FF]">
                        {data.advancedMetrics.tradeFragRate.percentage.toFixed(1)}
                      </span>
                      <span className="font-mono text-xs text-[#00F0FF]">%</span>
                    </div>
                    <div className="text-[11px] text-[#BAC9CC]">
                      {data.advancedMetrics.tradeFragRate.description}
                    </div>
                  </div>

                  {/* Micro Sparkline SVG */}
                  <div className="w-full h-5">
                    <svg
                      className="w-full h-full"
                      preserveAspectRatio="none"
                      viewBox="0 0 100 20"
                    >
                      <polyline
                        fill="none"
                        points="0,15 20,12 40,16 60,8 80,4 100,6"
                        stroke="#00F0FF"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </div>

                {/* CARD 4: OPENING DUELS */}
                <div className="bg-[#121721] border border-[#1F2735] rounded-lg p-3.5 flex flex-col justify-between shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#BAC9CC] uppercase tracking-wider">
                      OPENING DUELS
                    </span>
                    <span className="font-mono text-xs font-bold text-[#2B7FFF]">
                      {data.advancedMetrics.openingDuels.score}
                    </span>
                  </div>

                  <div className="my-2">
                    <div className="text-xs font-bold text-white truncate">
                      {data.advancedMetrics.openingDuels.featuredDuel.matchup}
                    </div>
                    <div className="text-[11px] text-[#00F0FF]">
                      {data.advancedMetrics.openingDuels.featuredDuel.context}
                    </div>
                  </div>

                  <div className="flex items-center justify-between font-mono text-[10px] pt-1 border-t border-[#1F2735]">
                    <span className="text-[#849396]">FB WIN PROB.</span>
                    <span className="text-[#2B7FFF] font-bold">
                      {data.advancedMetrics.openingDuels.firstBulletWinProbability.percentage.toFixed(
                        1
                      )}
                      % {data.advancedMetrics.openingDuels.firstBulletWinProbability.teamName}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ===================================================================
                5. PAINEL LATERAL DIREITO (JOGADORES E ECONOMIA VIA .MAP)
               =================================================================== */}
            <div className="col-span-12 xl:col-span-3 flex flex-col gap-2.5">
              {/* PAINEL CT: NAVI */}
              <div className="bg-[#121721] border border-blue-500/30 rounded-lg p-3 flex flex-col gap-2.5 shadow-md">
                {/* Header CT */}
                <div className="flex items-center justify-between pb-1.5 border-b border-blue-500/20">
                  <span className="font-bold text-white text-sm tracking-wide">
                    {data.teamCT.name}
                  </span>
                  <div className="flex items-center gap-2.5 font-mono text-xs font-semibold">
                    <span className="px-1.5 py-0.5 rounded bg-[#1A2230] border border-[#1F2735] font-bold text-white">
                      {data.teamCT.score}
                    </span>
                    <span className="text-slate-300 font-normal">
                      ${data.teamCT.totalMoney.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 5 Jogadores CT estritamente renderizados com .map() */}
                <div className="flex flex-col gap-2.5">
                  {data.teamCT.players.map((player: PlayerTelemetry) => (
                    <div key={player.id} className="flex flex-col gap-1">
                      {/* Linha 1: Nome, Role e Arma Dinâmica */}
                      <div className="flex items-center justify-between leading-none">
                        <div className="flex items-center">
                          <span className="text-[13px] font-semibold text-white">
                            {player.name}
                          </span>
                          <span className="text-[10px] uppercase text-slate-500 font-normal ml-1 font-mono">
                            · {player.role}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-300 flex items-center gap-1.5">
                          <WeaponIcon
                            name={player.primaryWeapon}
                            className="h-2.5 max-w-[28px] object-contain opacity-75"
                          />
                          <span>{player.primaryWeapon}</span>
                        </span>
                      </div>

                      {/* Linha 2: Barra de Vida (HP) com CT Blue (#2B7FFF) e Valor */}
                      <div className="flex items-center gap-2 w-full">
                        <div className="h-[3px] rounded-full bg-[#1e2330] flex-1 overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-300"
                            style={{
                              width: `${(player.health / player.maxHealth) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono text-[12px] font-bold text-white shrink-0 leading-none">
                          {player.health}
                        </span>
                      </div>

                      {/* Linha 3: Colete SVG/Money e Inventário de Utilitárias via .map() */}
                      <div className="flex items-center justify-between text-[11px] text-[#94A3B8] font-mono leading-none">
                        <div className="flex items-center gap-1">
                          <WeaponIcon
                            name={player.hasHelmet ? 'armor_helmet' : 'armor'}
                            className="w-3.5 h-3.5 object-contain"
                            tint="cyan"
                            title={player.hasHelmet ? 'Kevlar + Helmet' : 'Kevlar'}
                          />
                          <span>${player.money.toLocaleString()}</span>
                        </div>

                        {/* Utilitárias individuais via .map() com SVG dinâmico */}
                        <div className="flex items-center gap-1">
                          {player.utilities.map((util, uIdx) => (
                            <WeaponIcon key={uIdx} name={util} className="w-3.5 h-3.5 object-contain" />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* BANNER CENTRAL DE EVENTO: CLUTCH & PLANT C4 DE ACORDO COM MATCHSTATE */}
              {data.matchState.clutchScenario.isClutchActive && (
                <div className="flex items-center justify-center py-0.5 select-none">
                  <div className="px-2.5 py-1 rounded-full bg-[#121721] border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span className="font-mono text-[10px] font-semibold text-amber-300 tracking-wider uppercase">
                      {data.matchState.clutchScenario.bannerText}
                    </span>
                  </div>
                </div>
              )}

              {/* PAINEL T: FAZE */}
              <div className="bg-[#121721] border border-orange-500/30 rounded-lg p-3 flex flex-col gap-2.5 shadow-md">
                {/* Header T */}
                <div className="flex items-center justify-between pb-1.5 border-b border-orange-500/20">
                  <span className="font-bold text-white text-sm tracking-wide">
                    {data.teamT.name}
                  </span>
                  <div className="flex items-center gap-2.5 font-mono text-xs font-semibold">
                    <span className="px-1.5 py-0.5 rounded bg-[#1A2230] border border-[#1F2735] font-bold text-white">
                      {data.teamT.score}
                    </span>
                    <span className="text-slate-300 font-normal">
                      ${data.teamT.totalMoney.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 5 Jogadores T estritamente renderizados com .map() */}
                <div className="flex flex-col gap-2.5">
                  {data.teamT.players.map((player: PlayerTelemetry) => {
                    const isDead = !player.isAlive;
                    const isLowHp = player.health <= 35 && player.health > 0;

                    return (
                      <div
                        key={player.id}
                        className={`flex flex-col gap-1 transition-opacity ${
                          isDead ? 'opacity-40' : ''
                        }`}
                      >
                        {/* Linha 1: Nome, Role, C4 / KIA Badge e Arma Dinâmica */}
                        <div className="flex items-center justify-between leading-none">
                          <div className="flex items-center gap-1">
                            <span
                              className={`text-[13px] font-semibold text-white ${
                                isDead ? 'line-through' : ''
                              }`}
                            >
                              {player.name}
                            </span>
                            <span className="text-[10px] uppercase text-slate-500 font-normal font-mono">
                              · {player.role}
                            </span>
                            {player.isCarryingC4 && (
                              <span className="px-1 py-0.2 rounded bg-error-container text-on-error-container font-mono text-[8px] font-bold uppercase ml-0.5">
                                C4
                              </span>
                            )}
                            {isDead && player.deathTime && (
                              <span className="px-1 py-0.2 rounded bg-red-950/60 border border-red-800/40 text-red-400 font-mono text-[8px] font-bold ml-0.5">
                                KIA ({player.deathTime})
                              </span>
                            )}
                          </div>
                          <span
                            className={`font-mono text-[11px] flex items-center gap-1.5 ${
                              isDead
                                ? 'line-through text-slate-500'
                                : player.isCarryingC4
                                ? 'text-[#FFB690]'
                                : 'text-slate-300'
                            }`}
                          >
                            <WeaponIcon
                              name={player.primaryWeapon}
                              className={`h-2.5 max-w-[28px] object-contain opacity-75 ${
                                isDead ? 'grayscale' : ''
                              }`}
                            />
                            <span>{player.primaryWeapon}</span>
                          </span>
                        </div>

                        {/* Linha 2: Barra de Vida (HP) com T Orange (#FF5500) e Valor */}
                        <div className="flex items-center gap-2 w-full">
                          <div className="h-[3px] rounded-full bg-[#1e2330] flex-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isDead
                                  ? 'bg-rose-950'
                                  : 'bg-orange-500'
                              }`}
                              style={{
                                width: `${(player.health / player.maxHealth) * 100}%`,
                              }}
                            />
                          </div>
                          <span
                            className={`font-mono text-[12px] font-bold shrink-0 leading-none ${
                              isDead
                                ? 'text-rose-500'
                                : isLowHp
                                ? 'text-rose-400'
                                : 'text-white'
                            }`}
                          >
                            {player.health}
                          </span>
                        </div>

                        {/* Linha 3: Colete SVG/Money e Inventário de Utilitárias via .map() */}
                        <div className="flex items-center justify-between text-[11px] text-[#94A3B8] font-mono leading-none">
                          <div className="flex items-center gap-1">
                            <WeaponIcon
                              name={player.hasHelmet ? 'armor_helmet' : 'armor'}
                              className={`w-3.5 h-3.5 object-contain ${isDead ? 'opacity-30' : ''}`}
                              tint={isDead ? 'white' : 'orange'}
                              title={player.hasHelmet ? 'Kevlar + Helmet' : 'Kevlar'}
                            />
                            <span className={isDead ? 'text-slate-500' : ''}>
                              ${player.money.toLocaleString()}
                            </span>
                          </div>

                          {/* Utilitárias individuais via .map() com SVG dinâmico */}
                          <div className="flex items-center gap-1">
                            {player.utilities.map((util, uIdx) => (
                              <WeaponIcon key={uIdx} name={util} className="w-3.5 h-3.5 object-contain" />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Tactical2DReplayDashboard;
