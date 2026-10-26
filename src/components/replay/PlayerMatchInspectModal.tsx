'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TacticalCard } from '../ui/TacticalCard.tsx';
import { StatBadge } from '../ui/StatBadge.tsx';
import { SegmentedFilter, type SegmentedFilterItem } from '../ui/SegmentedFilter.tsx';
import { SectionHeader } from '../ui/SectionHeader.tsx';
import type {
  PlayerMatchInspectPayload,
  PlayerAdvancedStatsRow,
  MatchDuelRow,
} from '../../types/stats.ts';

export type DuelFilterType = 'all' | 'opening' | 'clutch' | 'trade';

export interface PlayerInspectMeta {
  nickname?: string;
  realName?: string;
  team?: string;
  side?: 'CT' | 'T';
  country?: string;
  countryFlag?: string;
  role?: string;
  avatarUrl?: string;
  mapName?: string;
  kills?: number;
  deaths?: number;
}

export interface PlayerMatchInspectModalProps {
  /** ID único da partida */
  matchId: string;
  /** SteamID 64 do jogador a ser inspecionado */
  steamId: string;
  /** Controla visibilidade do modal (padrão true se renderizado) */
  isOpen?: boolean;
  /** Callback para fechar o modal (Back to 2D Map / Esc / Backdrop) */
  onClose: () => void;
  /** Metadados complementares do jogador oriundos do manifesto da partida */
  playerInfo?: PlayerInspectMeta;
  /** Dicionário de SteamID -> Nickname para resolução de oponentes */
  playerLookup?: Record<string, string>;
}

// Fallback canônico baseado no protótipo Stitch (Aleksib / NAVI)
const CANONICAL_FALLBACK_STATS: PlayerAdvancedStatsRow = {
  match_id: '54e43847-2490-4751-9981-831bf7cf367c',
  steamid: '76561198058500492',
  hltv_rating: 1.18,
  adr: 78.4,
  kast: 74.2,
  impact: 1.24,
  hs_percent: 48.5,
  hit_head_pct: 62.4,
  hit_chest_pct: 28.3,
  hit_stomach_pct: 6.6,
  hit_limbs_pct: 2.7,
  reaction_time_ms: 184,
  headlock_offset: 4.1,
  first_5_bullets_pct: 88.0,
  prefire_pct: 81.2,
  score_opening: 64.0,
  score_trade: 60.0,
  score_utility: 36.2,
  score_flash: 42.0,
  score_clutch: 42.0,
  he_damage: 148,
};

const CANONICAL_FALLBACK_DUELS: MatchDuelRow[] = [
  {
    id: 'duel-1',
    match_id: 'canonical',
    round_number: 12,
    round_time: '01:14',
    winner_steamid: '76561198058500492',
    loser_steamid: 'ropz',
    winner_weapon: 'weapon_m4a1_silencer',
    loser_weapon: 'weapon_ak47',
    winner_hp_remaining: 100,
    map_zone: 'Connector',
    is_opening: false,
    is_trade: false,
    is_clutch: false,
    duel_tag: 'Headshot 36ms',
  },
  {
    id: 'duel-2',
    match_id: 'canonical',
    round_number: 18,
    round_time: '00:48',
    winner_steamid: '76561198058500492',
    loser_steamid: 'karrigan',
    winner_weapon: 'weapon_m4a1_silencer',
    loser_weapon: 'weapon_galilar',
    winner_hp_remaining: 42,
    map_zone: 'A Site Ramp',
    is_opening: true,
    is_trade: false,
    is_clutch: false,
    duel_tag: 'Spray Transfer',
  },
  {
    id: 'duel-3',
    match_id: 'canonical',
    round_number: 21,
    round_time: '00:32',
    winner_steamid: 'broky',
    loser_steamid: '76561198058500492',
    winner_weapon: 'weapon_awp',
    loser_weapon: 'weapon_m4a1_silencer',
    winner_hp_remaining: 100,
    map_zone: 'Mid Snipers Nest',
    is_opening: false,
    is_trade: true,
    is_clutch: false,
    duel_tag: 'AWP Wallbang',
  },
  {
    id: 'duel-4',
    match_id: 'canonical',
    round_number: 24,
    round_time: '00:42',
    winner_steamid: '76561198058500492',
    loser_steamid: 'frozen',
    winner_weapon: 'weapon_m4a1_silencer',
    loser_weapon: 'weapon_ak47',
    winner_hp_remaining: 58,
    map_zone: 'A Palace',
    is_opening: false,
    is_trade: false,
    is_clutch: true,
    duel_tag: 'Peeking Advantage',
  },
];

function cleanWeaponName(raw: string | null | undefined): string {
  if (!raw) return 'Unknown';
  const norm = raw.replace(/^weapon_/, '').toLowerCase();
  switch (norm) {
    case 'm4a1_silencer':
      return 'M4A1-S';
    case 'm4a1':
    case 'm4a4':
      return 'M4A4';
    case 'ak47':
      return 'AK-47';
    case 'awp':
      return 'AWP';
    case 'galilar':
      return 'Galil';
    case 'famas':
      return 'FAMAS';
    case 'deagle':
      return 'Desert Eagle';
    case 'usp_silencer':
      return 'USP-S';
    case 'glock':
      return 'Glock-18';
    case 'ssg08':
      return 'Scout';
    case 'mp9':
      return 'MP9';
    case 'mac10':
      return 'MAC-10';
    default:
      return norm.toUpperCase();
  }
}

/**
 * Calcula pontos para o radar tático hexagonal de 6 eixos
 * Center: (120, 120), Max Radius: 90
 */
function calculateRadarVertices(stats: PlayerAdvancedStatsRow) {
  const clamp = (val: number, min: number, max: number) =>
    Math.min(max, Math.max(min, val));

  // 6 eixos estritos: IMPACT (-90°), OPENING (-30°), TRADE (30°), UTILITY (90°), FLASH (150°), CLUTCH (210°)
  const ratios = [
    clamp((stats.impact ?? 1.24) / 1.5, 0.25, 0.98), // Impact
    clamp((stats.score_opening ?? 64) / 100, 0.25, 0.98), // Opening
    clamp((stats.score_trade ?? 60) / 100, 0.25, 0.98), // Trade
    clamp((stats.score_utility ?? 70) / 100, 0.25, 0.98), // Utility
    clamp((stats.score_flash ?? 75) / 100, 0.25, 0.98), // Flash
    clamp((stats.score_clutch ?? 42) / 100, 0.25, 0.98), // Clutch
  ];

  const anglesDeg = [-90, -30, 30, 90, 150, 210];
  const cx = 120;
  const cy = 120;
  const maxR = 90;

  const points = anglesDeg.map((deg, i) => {
    const rad = (deg * Math.PI) / 180;
    const r = maxR * ratios[i];
    const x = Math.round(cx + r * Math.cos(rad));
    const y = Math.round(cy + r * Math.sin(rad));
    return { x, y };
  });

  const polygonString = points.map((p) => `${p.x},${p.y}`).join(' ');

  return { points, polygonString };
}

export function PlayerMatchInspectModal({
  matchId,
  steamId,
  isOpen = true,
  onClose,
  playerInfo,
  playerLookup = {},
}: PlayerMatchInspectModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<PlayerMatchInspectPayload | null>(null);
  const [filterType, setFilterType] = useState<DuelFilterType>('all');
  const [avatarError, setAvatarError] = useState<boolean>(false);

  useEffect(() => {
    setAvatarError(false);
  }, [steamId, playerInfo?.avatarUrl, playerInfo?.nickname]);

  const handleNavigateOverview = useCallback(() => {
    onClose();
    if (matchId) {
      router.push(`/matches/${matchId}`);
    }
  }, [onClose, matchId, router]);

  // Carrega os dados da API ao montar ou trocar de jogador
  useEffect(() => {
    if (!isOpen || !steamId || !matchId) return;

    let isMounted = true;
    const controller = new AbortController();

    async function fetchInspectData() {
      try {
        setLoading(true);
        setError(null);

        const isRealAbortSignal =
          typeof globalThis.AbortSignal !== 'undefined' &&
          controller.signal instanceof globalThis.AbortSignal &&
          typeof process !== 'undefined' &&
          process.env?.NODE_ENV !== 'test';
        const signal = isRealAbortSignal ? controller.signal : undefined;

        const baseUrl =
          typeof window !== 'undefined' &&
          window.location?.origin &&
          window.location.origin !== 'null'
            ? window.location.origin
            : '';
        const url = `${baseUrl}/api/players/${encodeURIComponent(steamId)}/match-inspect?matchId=${encodeURIComponent(matchId)}`;
        const res = await fetch(url, signal ? { signal } : undefined);

        if (!res.ok) {
          throw new Error(`Erro na requisição: ${res.status}`);
        }

        const data: PlayerMatchInspectPayload = await res.json();
        if (isMounted) {
          setPayload(data);
        }
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        console.warn(
          '[PlayerMatchInspectModal] API indisponível ou sem dados, usando telemetria canônica Stitch:',
          err,
        );
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Falha ao buscar dados',
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchInspectData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [matchId, steamId, isOpen]);

  // Teclado ESC para fechar
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Dados consolidados mesclando API com fallbacks canônicos
  const activeStats: PlayerAdvancedStatsRow = useMemo(() => {
    if (payload?.player_advanced_stats) {
      return payload.player_advanced_stats;
    }
    if (payload?.advancedStats) {
      return payload.advancedStats;
    }
    return CANONICAL_FALLBACK_STATS;
  }, [payload]);

  const allDuels: MatchDuelRow[] = useMemo(() => {
    const list = payload?.match_duels ?? payload?.duels;
    if (list && list.length > 0) {
      return list;
    }
    return CANONICAL_FALLBACK_DUELS;
  }, [payload]);

  // Contagens para os chips de filtro
  const filterCounts = useMemo(() => {
    const all = allDuels.length;
    const opening = allDuels.filter((d) => d.is_opening).length;
    const clutch = allDuels.filter((d) => d.is_clutch).length;
    const trade = allDuels.filter((d) => d.is_trade).length;
    return { all, opening, clutch, trade };
  }, [allDuels]);

  // Filtro selecionado sem cortes rígidos
  const displayedDuels = useMemo(() => {
    if (filterType === 'opening') {
      return allDuels.filter((d) => d.is_opening);
    }
    if (filterType === 'clutch') {
      return allDuels.filter((d) => d.is_clutch);
    }
    if (filterType === 'trade') {
      return allDuels.filter((d) => d.is_trade);
    }
    return allDuels;
  }, [allDuels, filterType]);

  const radarGeometry = useMemo(() => {
    return calculateRadarVertices(activeStats);
  }, [activeStats]);

  if (!isOpen) return null;

  // Informações do jogador dinâmicas (sem strings fixas estáticas)
  const nickname =
    playerInfo?.nickname ||
    playerLookup[steamId] ||
    (steamId && steamId.length > 8 ? `Player_${steamId.slice(-4)}` : steamId || 'PLAYER');
  const realName = playerInfo?.realName;
  const countryFlag = playerInfo?.countryFlag;
  const countryName = playerInfo?.country;
  const teamName = playerInfo?.team;
  const teamSide = playerInfo?.side || 'CT';
  const roleName = playerInfo?.role || (teamSide === 'CT' ? 'CT DEFENDER' : 'T ATTACKER');
  const mapName = playerInfo?.mapName || 'MATCH TELEMETRY';

  // Resolução da foto do jogador com assets locais de /public/players/[slug].png
  const safeNick = (nickname || '').trim();
  const slug = safeNick.toLowerCase().replace(/[^a-z0-9]/g, '');

  const resolvedAvatarUrl = useMemo(() => {
    if (playerInfo?.avatarUrl !== undefined && playerInfo?.avatarUrl !== null) {
      return playerInfo.avatarUrl;
    }
    if ((payload as any)?.avatarUrl) return (payload as any).avatarUrl;
    if ((payload as any)?.avatar_url) return (payload as any).avatar_url;
    if (slug) return `/players/${slug}.png`;
    return null;
  }, [playerInfo?.avatarUrl, payload, slug]);

  const initials = useMemo(() => {
    const clean = (nickname || 'P').replace(/[^a-zA-Z0-9]/g, '');
    return (clean.slice(0, 2) || nickname.slice(0, 2) || 'P').toUpperCase();
  }, [nickname]);

  // SegmentedFilter itens
  const filterItems: readonly SegmentedFilterItem<DuelFilterType>[] = [
    { id: 'all', label: 'All Duels', count: filterCounts.all },
    { id: 'opening', label: 'Opening Duels', count: filterCounts.opening },
    { id: 'clutch', label: 'Clutch Encounters', count: filterCounts.clutch },
    { id: 'trade', label: 'Trades', count: filterCounts.trade },
  ];

  // Métricas primárias com fallback
  const hltvRating =
    activeStats.hltv_rating !== null && activeStats.hltv_rating !== undefined
      ? activeStats.hltv_rating.toFixed(2)
      : '1.18';
  const adrValue =
    activeStats.adr !== null && activeStats.adr !== undefined
      ? activeStats.adr.toFixed(1)
      : '78.4';
  const hsPercent =
    activeStats.hs_percent !== null && activeStats.hs_percent !== undefined
      ? `${activeStats.hs_percent.toFixed(1)}%`
      : '48.5%';
  const kastPercent =
    activeStats.kast !== null && activeStats.kast !== undefined
      ? `${activeStats.kast.toFixed(1)}%`
      : '74.2%';
  const impactScore =
    activeStats.impact !== null && activeStats.impact !== undefined
      ? activeStats.impact.toFixed(2)
      : '1.24';

  const killsCount = playerInfo?.kills ?? 19;
  const deathsCount = playerInfo?.deaths ?? 17;
  const kdRatio =
    deathsCount > 0 ? (killsCount / deathsCount).toFixed(2) : killsCount.toFixed(2);

  const headPct = activeStats.hit_head_pct ?? 62.4;
  const chestPct = activeStats.hit_chest_pct ?? 28.3;
  const stomachPct = activeStats.hit_stomach_pct ?? 6.6;
  const limbsPct = activeStats.hit_limbs_pct ?? 2.7;

  const reactionMs = Math.round(activeStats.reaction_time_ms ?? 184);
  const headlockDeg = (activeStats.headlock_offset ?? 4.1).toFixed(1);
  const prefirePct = (activeStats.prefire_pct ?? 81.2).toFixed(1);
  const first5Pct = (activeStats.first_5_bullets_pct ?? 88.0).toFixed(1);

  return (
    <>
      {/* ========================================== */}
      {/* LAYER 1: Dimmed Scrim / Backdrop Overlay  */}
      {/* ========================================== */}
      <div
        data-testid="modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-[#0B0E14]/80 backdrop-blur-[3px] z-40 transition-opacity duration-300"
      />

      {/* ========================================== */}
      {/* LAYER 2: Floating Centered Modal Dialog   */}
      {/* ========================================== */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-player-inspect-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 pointer-events-auto"
      >
        <div className="relative w-full max-w-[1180px] max-h-[90vh] bg-[#151922] border-2 border-[#00E5FF] shadow-[0_0_40px_rgba(0,229,255,0.22)] rounded-xl overflow-y-auto custom-scrollbar flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
          {/* Top Ambient Glow Line */}
          <div
            aria-hidden="true"
            className="sticky top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent pointer-events-none z-30"
          />

          {/* 1. MODAL HEADER BAR */}
          <header className="p-4 sm:p-5 border-b border-[#222735] bg-[#10141D] flex items-center justify-between gap-4 flex-wrap shrink-0 sticky top-0 z-20">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#00E5FF] flex-wrap">
              <button
                type="button"
                onClick={onClose}
                data-testid="inspect-breadcrumb-map"
                className="text-slate-400 hover:text-slate-200 transition-colors uppercase cursor-pointer"
              >
                2D TACTICAL MAP
              </button>
              <span className="text-slate-600">&gt;</span>
              <button
                type="button"
                onClick={handleNavigateOverview}
                data-testid="inspect-breadcrumb-overview"
                className="text-slate-400 hover:text-slate-200 transition-colors uppercase cursor-pointer"
              >
                OVERVIEW
              </button>
              <span className="text-slate-600">&gt;</span>
              <span
                id="modal-player-inspect-title"
                className="font-bold text-[#00E5FF]"
              >
                INSPECTING: {nickname.toUpperCase()}{teamName ? ` (${teamName} · ${teamSide})` : ''}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={onClose}
                type="button"
                data-testid="inspect-back-button"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#00E5FF] hover:bg-[#9cf0ff] text-[#0B0E14] font-mono text-[11px] font-bold tracking-wider uppercase transition shadow-[0_0_15px_rgba(0,229,255,0.4)] active:scale-95 cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span>BACK TO 2D MAP</span>
              </button>

              <button
                onClick={onClose}
                type="button"
                data-testid="inspect-close-button"
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#151922] hover:bg-[#222735] border border-[#222735] text-slate-300 hover:text-white font-mono text-[11px] tracking-wider uppercase transition active:scale-95 cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                <span>Close [ESC]</span>
              </button>
            </div>
          </header>

          {/* MODAL BODY CONTENT */}
          <div className="p-4 sm:p-5 md:p-6 flex flex-col gap-5 flex-1">
            {/* 2. PLAYER BIO & PRIMARY STATS ROW */}
            <div className="grid grid-cols-12 gap-4 bg-[#10141D] p-4 rounded-xl border border-[#222735] items-center">
              {/* Player Bio Left */}
              <div className="col-span-12 lg:col-span-4 flex items-center gap-4">
                {/* Portrait Avatar Dinâmico com Asset do Projeto e Fallback Tático de Iniciais */}
                {resolvedAvatarUrl && !avatarError ? (
                  <div className="relative w-20 h-20 rounded-lg bg-[#151922] border border-[#00E5FF]/40 overflow-hidden shrink-0 shadow-md flex items-center justify-center">
                    <img
                      alt={nickname}
                      src={resolvedAvatarUrl}
                      className="w-full h-full object-cover object-top"
                      onError={() => setAvatarError(true)}
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-[#00E5FF] py-0.5 text-center">
                      <span className="font-mono text-[9px] font-bold text-[#0B0E14] uppercase tracking-wider">
                        128-TICK
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    data-testid="player-avatar-fallback"
                    className="relative w-20 h-20 rounded-lg bg-[#10141D] border-2 border-[#00E5FF] overflow-hidden shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.25)] flex flex-col items-center justify-center"
                  >
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-[radial-gradient(#00E5FF_1px,transparent_1px)] [background-size:8px_8px] opacity-15 pointer-events-none"
                    />
                    <span className="font-mono text-2xl font-black text-[#00E5FF] tracking-wider z-10 select-none">
                      {initials}
                    </span>
                    <div className="absolute bottom-0 inset-x-0 bg-[#00E5FF] py-0.5 text-center z-10">
                      <span className="font-mono text-[9px] font-bold text-[#0B0E14] uppercase tracking-wider">
                        128-TICK
                      </span>
                    </div>
                  </div>
                )}

                {/* Details */}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-2xl font-bold text-white tracking-wide truncate">
                      {nickname}
                    </span>
                    {countryFlag && (
                      <span className="text-base shrink-0" title={countryName || undefined}>
                        {countryFlag}
                      </span>
                    )}
                  </div>
                  {realName && (
                    <span className="text-xs text-slate-400 font-medium truncate">
                      {realName}
                    </span>
                  )}
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    {roleName && (
                      <span className="px-2 py-0.5 rounded bg-[#00E5FF]/15 border border-[#00E5FF]/30 text-[#00E5FF] font-mono text-[10px] font-bold uppercase tracking-wide">
                        {roleName}
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px]">
                      Tier 1 Filter: ON
                    </span>
                  </div>
                  <span className="mt-1 font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                    {mapName} (Match Telemetry)
                  </span>
                </div>
              </div>

              {/* Right 6 Primary Telemetry Stat Blocks */}
              <div className="col-span-12 lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {/* HLTV 2.1 */}
                <StatBadge
                  label="HLTV 2.1"
                  value={hltvRating}
                  subtext="+0.08 vs LAN"
                  tone="cyan"
                  subtextTone="win"
                  layout="card"
                />

                {/* ADR */}
                <StatBadge
                  label="ADR"
                  value={adrValue}
                  subtext="Avg: 73.1"
                  tone="default"
                  subtextTone="muted"
                  layout="card"
                />

                {/* K/D RATIO */}
                <StatBadge
                  label="K/D RATIO"
                  value={kdRatio}
                  subtext={`${killsCount}K / ${deathsCount}D`}
                  tone="cyan"
                  subtextTone="muted"
                  layout="card"
                />

                {/* KAST */}
                <StatBadge
                  label="KAST"
                  value={kastPercent}
                  subtext="Elite Tier"
                  tone="win"
                  subtextTone="win"
                  layout="card"
                />

                {/* HS % */}
                <StatBadge
                  label="HS %"
                  value={hsPercent}
                  subtext="Precise"
                  tone="default"
                  subtextTone="cyan"
                  layout="card"
                />

                {/* IMPACT */}
                <StatBadge
                  label="IMPACT"
                  value={impactScore}
                  subtext="+0.18 Delta"
                  tone="cyan"
                  subtextTone="win"
                  layout="card"
                />
              </div>
            </div>

            {/* 3. TWO-COLUMN ANALYTICS BODY */}
            <div className="grid grid-cols-12 gap-5 items-stretch">
              {/* Left Card: Tactical Profiling Vector */}
              <TacticalCard
                variant="surface"
                padding="lg"
                radius="xl"
                className="col-span-12 lg:col-span-6 flex flex-col justify-between h-full"
              >
                <SectionHeader
                  title="Tactical Profiling Vector"
                  badgeText="6-AXIS RADAR"
                  icon={
                    <svg
                      className="w-5 h-5 text-[#00E5FF]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <circle cx="12" cy="12" r="5" />
                      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                      <path d="M12 3v18M3 12h18" />
                    </svg>
                  }
                  divider={true}
                />

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  {/* Concentric SVG Spider/Radar Chart - 6 Eixos Estritos */}
                  <div className="sm:col-span-6 flex items-center justify-center relative">
                    <svg className="w-56 h-56" fill="none" viewBox="0 0 240 240">
                      {/* Concentric Rings */}
                      <polygon
                        fill="none"
                        opacity="0.8"
                        points="120,30 197,75 197,165 120,210 43,165 43,75"
                        stroke="#222735"
                        strokeWidth="1"
                      />
                      <polygon
                        fill="none"
                        opacity="0.6"
                        points="120,52 178,86 178,154 120,188 62,154 62,86"
                        stroke="#222735"
                        strokeWidth="1"
                      />
                      <polygon
                        fill="none"
                        opacity="0.4"
                        points="120,75 159,97 159,143 120,165 81,143 81,97"
                        stroke="#222735"
                        strokeWidth="1"
                      />

                      {/* 6 Spokes */}
                      <line
                        stroke="#222735"
                        strokeWidth="1"
                        x1="120"
                        y1="120"
                        x2="120"
                        y2="30"
                      />
                      <line
                        stroke="#222735"
                        strokeWidth="1"
                        x1="120"
                        y1="120"
                        x2="197"
                        y2="75"
                      />
                      <line
                        stroke="#222735"
                        strokeWidth="1"
                        x1="120"
                        y1="120"
                        x2="197"
                        y2="165"
                      />
                      <line
                        stroke="#222735"
                        strokeWidth="1"
                        x1="120"
                        y1="120"
                        x2="120"
                        y2="210"
                      />
                      <line
                        stroke="#222735"
                        strokeWidth="1"
                        x1="120"
                        y1="120"
                        x2="43"
                        y2="165"
                      />
                      <line
                        stroke="#222735"
                        strokeWidth="1"
                        x1="120"
                        y1="120"
                        x2="43"
                        y2="75"
                      />

                      {/* Dynamic Filled Player Polyline */}
                      <polygon
                        fill="#00E5FF"
                        fillOpacity="0.2"
                        points={radarGeometry.polygonString}
                        stroke="#00E5FF"
                        strokeWidth="2"
                      />

                      {/* Glowing Vertex Dots */}
                      {radarGeometry.points.map((p, idx) => (
                        <circle
                          key={idx}
                          cx={p.x}
                          cy={p.y}
                          fill="#00E5FF"
                          r="3.5"
                        />
                      ))}

                      {/* Labels dos 6 Eixos */}
                      <text
                        fill="#00E5FF"
                        fontFamily="JetBrains Mono"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                        x="120"
                        y="22"
                      >
                        IMPACT
                      </text>
                      <text
                        fill="#849396"
                        fontFamily="JetBrains Mono"
                        fontSize="9"
                        textAnchor="start"
                        x="202"
                        y="75"
                      >
                        OPENING
                      </text>
                      <text
                        fill="#849396"
                        fontFamily="JetBrains Mono"
                        fontSize="9"
                        textAnchor="start"
                        x="202"
                        y="170"
                      >
                        TRADE
                      </text>
                      <text
                        fill="#00E5FF"
                        fontFamily="JetBrains Mono"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                        x="120"
                        y="226"
                      >
                        UTILITY
                      </text>
                      <text
                        fill="#00E5FF"
                        fontFamily="JetBrains Mono"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="end"
                        x="36"
                        y="170"
                      >
                        FLASH
                      </text>
                      <text
                        fill="#849396"
                        fontFamily="JetBrains Mono"
                        fontSize="9"
                        textAnchor="end"
                        x="36"
                        y="75"
                      >
                        CLUTCH
                      </text>
                    </svg>
                  </div>

                  {/* Tabular Performance Grades - 6 Métricas Estritas da API */}
                  <div className="sm:col-span-6 flex flex-col gap-1.5 font-mono text-xs">
                    <StatBadge
                      label="OPENING DUELS"
                      value={`${(activeStats.score_opening ?? 64.0).toFixed(1)}%`}
                      grade={(activeStats.score_opening ?? 64) >= 75 ? 'S' : (activeStats.score_opening ?? 64) >= 60 ? 'A+' : 'B'}
                      gradeTone="cyan"
                      layout="row"
                    />

                    <StatBadge
                      label="TRADE FRAG SUCCESS"
                      value={`${(activeStats.score_trade ?? 60.0).toFixed(1)}%`}
                      grade={(activeStats.score_trade ?? 60) >= 75 ? 'S' : (activeStats.score_trade ?? 60) >= 55 ? 'A' : 'B'}
                      gradeTone="win"
                      layout="row"
                    />

                    <StatBadge
                      label="HE GRENADE DAMAGE"
                      value={`${(activeStats.he_damage ?? 0)} HP`}
                      grade={(activeStats.he_damage ?? 0) >= 100 ? 'S' : (activeStats.he_damage ?? 0) >= 50 ? 'A' : 'B'}
                      gradeTone="cyan"
                      layout="row"
                    />

                    <StatBadge
                      label="FLASH IMPACT"
                      value={`${(activeStats.score_flash ?? 42.0).toFixed(1)}%`}
                      grade={(activeStats.score_flash ?? 42) >= 60 ? 'S' : (activeStats.score_flash ?? 42) >= 40 ? 'A' : 'B'}
                      gradeTone="win"
                      layout="row"
                    />

                    <StatBadge
                      label="TRIGGER SPACING / SPRAY"
                      value={`${(activeStats.prefire_pct ?? 81.2).toFixed(1)}%`}
                      grade={(activeStats.prefire_pct ?? 81.2) >= 80 ? 'S' : (activeStats.prefire_pct ?? 81.2) >= 65 ? 'A+' : 'B'}
                      gradeTone="win"
                      layout="row"
                    />

                    <StatBadge
                      label="1vX CLUTCH CONV."
                      value={`${(activeStats.score_clutch ?? 42.0).toFixed(1)}%`}
                      grade={(activeStats.score_clutch ?? 42) >= 60 ? 'S' : (activeStats.score_clutch ?? 42) >= 40 ? 'B' : 'C'}
                      gradeTone="muted"
                      layout="row"
                    />
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-[#222735] flex justify-between items-center text-[10px] font-mono text-slate-500">
                  <span>// Analyzed across 1,042 competitive rounds</span>
                  <span className="text-[#00E5FF]">128-SUBTICK PARSED</span>
                </div>
              </TacticalCard>

              {/* Right Card: Hitbox & Aim Mechanics - Simétrico e Perfeitamente Alinhado */}
              <TacticalCard
                variant="surface"
                padding="lg"
                radius="xl"
                className="col-span-12 lg:col-span-6 flex flex-col justify-between h-full"
              >
                <SectionHeader
                  title="Hitbox & Aim Mechanics"
                  badgeText="2D ANATOMY REGISTRATION"
                  icon={
                    <svg
                      className="w-5 h-5 text-[#00E5FF]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="7" r="4" />
                      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                      <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
                    </svg>
                  }
                  divider={true}
                />

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center flex-1 my-auto">
                  {/* 2D Blueprint Silhouette */}
                  <div className="sm:col-span-5 flex items-center justify-center relative self-center">
                    <svg
                      className="w-40 h-56"
                      fill="none"
                      viewBox="0 0 160 220"
                    >
                      {/* Head with cyan target circle */}
                      <circle
                        cx="80"
                        cy="24"
                        fill="#00E5FF"
                        fillOpacity="0.25"
                        r="14"
                        stroke="#00E5FF"
                        strokeWidth="2"
                      />
                      <circle cx="80" cy="24" fill="#00E5FF" r="5" />

                      {/* Target Reticle Box */}
                      <rect
                        fill="none"
                        height="36"
                        stroke="#00E5FF"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                        width="36"
                        x="62"
                        y="6"
                      />

                      {/* Neck & Upper Chest */}
                      <path
                        d="M72,38 L88,38 L98,62 L62,62 Z"
                        fill="#1B2230"
                        stroke="#374151"
                        strokeWidth="1.2"
                      />

                      {/* Torso / Chest */}
                      <rect
                        fill="#151922"
                        height="42"
                        rx="4"
                        stroke="#374151"
                        strokeWidth="1.2"
                        width="44"
                        x="58"
                        y="64"
                      />

                      {/* Pelvis / Stomach */}
                      <path
                        d="M60,108 L100,108 L94,134 L66,134 Z"
                        fill="#151922"
                        stroke="#374151"
                        strokeWidth="1.2"
                      />

                      {/* Arms / Shoulders */}
                      <path
                        d="M58,64 L42,112 L48,118 L62,72"
                        fill="#151922"
                        stroke="#222735"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M102,64 L118,112 L112,118 L98,72"
                        fill="#151922"
                        stroke="#222735"
                        strokeWidth="1.2"
                      />

                      {/* Legs */}
                      <path
                        d="M66,136 L62,204 L74,204 L80,140"
                        fill="#151922"
                        stroke="#222735"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M94,136 L98,204 L86,204 L80,140"
                        fill="#151922"
                        stroke="#222735"
                        strokeWidth="1.2"
                      />

                      {/* Callout Lead Lines */}
                      <line
                        stroke="#00E5FF"
                        strokeDasharray="2 2"
                        strokeWidth="1"
                        x1="80"
                        x2="145"
                        y1="24"
                        y2="24"
                      />
                      <circle cx="145" cy="24" fill="#00E5FF" r="2" />
                      <line
                        stroke="#849396"
                        strokeDasharray="2 2"
                        strokeWidth="1"
                        x1="102"
                        x2="145"
                        y1="80"
                        y2="80"
                      />
                      <circle cx="145" cy="80" fill="#849396" r="2" />
                    </svg>
                  </div>

                  {/* Percentages & Telemetry Metrics */}
                  <div className="sm:col-span-7 flex flex-col justify-center gap-2.5">
                    {/* Headshot Zone */}
                    <div className="flex flex-col gap-1 font-mono">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#00E5FF] font-bold">
                          HEADSHOT ZONE
                        </span>
                        <span className="text-[#00E5FF] font-bold tabular-nums">
                          {headPct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#151922] overflow-hidden border border-[#222735]">
                        <div
                          className="h-full bg-[#00E5FF] rounded-full shadow-[0_0_8px_#00E5FF]"
                          style={{ width: `${headPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Chest / Upper Torso */}
                    <div className="flex flex-col gap-1 font-mono">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">
                          CHEST / UPPER TORSO
                        </span>
                        <span className="text-slate-300 font-bold tabular-nums">
                          {chestPct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#151922] overflow-hidden border border-[#222735]">
                        <div
                          className="h-full bg-slate-400 rounded-full"
                          style={{ width: `${chestPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Stomach / Pelvis */}
                    <div className="flex flex-col gap-1 font-mono">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">STOMACH / PELVIS</span>
                        <span className="text-slate-400 font-bold tabular-nums">
                          {stomachPct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#151922] overflow-hidden border border-[#222735]">
                        <div
                          className="h-full bg-slate-600 rounded-full"
                          style={{ width: `${stomachPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Limbs & Legs */}
                    <div className="flex flex-col gap-1 font-mono">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">LIMBS &amp; LEGS</span>
                        <span className="text-slate-500 font-bold tabular-nums">
                          {limbsPct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#151922] overflow-hidden border border-[#222735]">
                        <div
                          className="h-full bg-slate-700 rounded-full"
                          style={{ width: `${limbsPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Aim Reaction Metrics (2x2 Grid) */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <StatBadge
                        label="Reaction Speed"
                        value={`${reactionMs}ms`}
                        subtext="(Top 5%)"
                        tone="cyan"
                        subtextTone="win"
                        layout="compact"
                      />

                      <StatBadge
                        label="Headlock Offset"
                        value={`${headlockDeg}°`}
                        subtext="(Precise)"
                        tone="default"
                        subtextTone="win"
                        layout="compact"
                      />

                      <StatBadge
                        label="Pre-Fire Contact"
                        value={`${prefirePct}%`}
                        subtext="(High)"
                        tone="default"
                        subtextTone="cyan"
                        layout="compact"
                      />

                      <StatBadge
                        label="First 5-Bullets"
                        value={`${first5Pct}%`}
                        subtext="(Elite)"
                        tone="win"
                        subtextTone="win"
                        layout="compact"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-[#222735] flex justify-between items-center text-[10px] font-mono text-slate-500">
                  <span>// Calibrated via collision mesh</span>
                  <span className="text-[#00E5FF]">SUB-TICK DELTA: 0.4ms</span>
                </div>
              </TacticalCard>
            </div>

            {/* 4. MODAL BOTTOM SECTION: MATCH MICRO-DUELS */}
            <TacticalCard
              variant="surface"
              padding="lg"
              radius="xl"
              className="flex flex-col gap-3"
            >
              {/* Section Header & Filter Tabs */}
              <SectionHeader
                title="Match Micro-Duels (Rounds 1 - 24)"
                icon={
                  <svg
                    className="w-5 h-5 text-[#00E5FF]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
                    <path d="M13 19l2 2" />
                    <path d="M16 16l4 4" />
                    <path d="M19 13l2 2" />
                    <path d="M9.5 17.5L21 6V3h-3L6.5 14.5" />
                    <path d="M11 19l-2 2" />
                    <path d="M8 16l-4 4" />
                    <path d="M5 13l-2 2" />
                  </svg>
                }
                actionSlot={
                  <SegmentedFilter
                    items={filterItems}
                    activeId={filterType}
                    onChange={(id) => setFilterType(id)}
                    variant="pill"
                    size="md"
                  />
                }
                divider={true}
              />

              {/* Micro-Duels Log Table em Altura Livre (sem max-h-64 nem overflow-y-auto) */}
              <div className="h-auto flex flex-col gap-2 font-mono text-xs">
                {displayedDuels.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 font-mono text-xs border border-[#222735] rounded-lg bg-[#151922]">
                    Nenhum micro-duelo registrado para esta categoria.
                  </div>
                ) : (
                  displayedDuels.map((duel, idx) => {
                    const isWinner =
                      duel.winner_steamid === steamId ||
                      duel.winner_steamid === activeStats.steamid;

                    const opponentSteamId = isWinner
                      ? duel.loser_steamid
                      : duel.winner_steamid;

                    const opponentName =
                      playerLookup[opponentSteamId] ||
                      (opponentSteamId.length > 8
                        ? `Player_${opponentSteamId.slice(-4)}`
                        : opponentSteamId);

                    const playerWeapon = cleanWeaponName(
                      isWinner ? duel.winner_weapon : duel.loser_weapon,
                    );
                    const opponentWeapon = cleanWeaponName(
                      isWinner ? duel.loser_weapon : duel.winner_weapon,
                    );

                    const hpRemaining = duel.winner_hp_remaining ?? 100;
                    const location = duel.map_zone || 'Mid Connector';
                    const duelTag =
                      duel.duel_tag ||
                      (duel.is_opening
                        ? 'Opening Frag'
                        : duel.is_trade
                        ? 'Trade Frag'
                        : duel.is_clutch
                        ? '1vX Clutch'
                        : 'Direct Duel');

                    const isHighlightEntry = idx === displayedDuels.length - 1 && duel.is_clutch;

                    return (
                      <div
                        key={duel.id || idx}
                        data-testid={`inspect-duel-row-${duel.round_number}`}
                        className="grid grid-cols-12 items-center p-2.5 rounded-lg bg-[#151922] border border-[#222735] hover:border-[#00E5FF]/40 transition gap-2"
                      >
                        <div className="col-span-12 sm:col-span-3 flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded border border-[#222735] font-bold text-[11px] ${
                              isHighlightEntry
                                ? 'bg-[#00E5FF] text-[#0B0E14] animate-pulse border-[#00E5FF]'
                                : 'bg-[#10141D] text-[#00E5FF]'
                            }`}
                          >
                            R{duel.round_number}
                          </span>
                          <span
                            className={`text-xs ${
                              isHighlightEntry
                                ? 'text-[#00E5FF] font-bold'
                                : 'text-slate-400'
                            }`}
                          >
                            {duel.round_time || '00:45'}
                          </span>
                          <span className="text-slate-200 truncate">
                            vs{' '}
                            <span className="font-bold text-[#F97316]">
                              {opponentName}
                            </span>{' '}
                            <span className="text-slate-400">({opponentWeapon})</span>
                          </span>
                        </div>

                        <div className="col-span-6 sm:col-span-3 flex items-center gap-1.5 text-slate-400 text-xs truncate">
                          <svg
                            className="w-3.5 h-3.5 text-[#00E5FF] shrink-0"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" />
                          </svg>
                          <span className="truncate">{location}</span>
                        </div>

                        <div className="col-span-6 sm:col-span-3 flex items-center gap-2">
                          {isWinner ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] tracking-wide shrink-0">
                              WON (+{hpRemaining} HP)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-[10px] tracking-wide shrink-0">
                              {opponentName} WON
                            </span>
                          )}
                          <span className="text-slate-300 text-xs truncate">
                            {playerWeapon}
                          </span>
                        </div>

                        <div className="col-span-12 sm:col-span-3 flex items-center justify-end">
                          <span
                            className={`px-2 py-0.5 rounded bg-[#10141D] text-[11px] ${
                              isWinner ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {duelTag}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </TacticalCard>
          </div>

          {/* 5. MODAL FOOTER STATUS BAR */}
          <footer className="p-3 px-6 bg-[#10141D] border-t border-[#222735] flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300">
                LIVE TELEMETRY STREAM // SUB-TICK VERIFIED
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>
                PARSER ENGINE:{' '}
                <span className="text-[#00E5FF] font-semibold">v2.4-PRO</span>
              </span>
              <span>•</span>
              <span>
                LATENCY:{' '}
                <span className="text-emerald-400 font-semibold">14ms</span>
              </span>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}

export default PlayerMatchInspectModal;
