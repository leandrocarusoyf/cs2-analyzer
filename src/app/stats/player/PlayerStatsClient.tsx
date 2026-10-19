'use client';

import React, { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TabIntro } from '../../../components/stats/TabIntro.tsx';
import { TabRoles } from '../../../components/stats/TabRoles.tsx';
import { TabWeapons } from '../../../components/stats/TabWeapons.tsx';
import { TabBuyTypes } from '../../../components/stats/TabBuyTypes.tsx';
import { TabMaps } from '../../../components/stats/TabMaps.tsx';
import type { PlayerPerformanceResult } from '../../../types/stats.ts';

const PLAYER_STATS_TABS = [
  { id: 'intro', label: 'Intro' },
  { id: 'roles', label: 'Roles' },
  { id: 'weapons', label: 'Weapons' },
  { id: 'buy_types', label: 'Buy Types' },
  { id: 'maps', label: 'Maps' },
] as const;

export type PlayerStatsTabId = (typeof PLAYER_STATS_TABS)[number]['id'];

const VALID_TAB_IDS = new Set<PlayerStatsTabId>([
  'intro',
  'roles',
  'weapons',
  'buy_types',
  'maps',
]);

export interface PlayerStatsClientProps {
  initialPerformance?: PlayerPerformanceResult | null;
}

export function PlayerStatsClient({ initialPerformance }: PlayerStatsClientProps = {}) {
  const router = useRouter();
  const pathname = usePathname() ?? '/stats/player';
  const searchParams = useSearchParams();

  const currentParams = useMemo(
    () => new URLSearchParams(searchParams ? searchParams.toString() : ''),
    [searchParams],
  );

  const rawTab = currentParams.get('tab');
  const activeTab: PlayerStatsTabId =
    rawTab && VALID_TAB_IDS.has(rawTab as PlayerStatsTabId)
      ? (rawTab as PlayerStatsTabId)
      : 'intro';

  const handleTabChange = (tabId: PlayerStatsTabId) => {
    const nextParams = new URLSearchParams(currentParams.toString());
    if (tabId === 'intro') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', tabId);
    }

    const query = nextParams.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;
    router.push(nextUrl);
  };

  const mappedOverview = useMemo(() => {
    if (!initialPerformance) return undefined;
    const wins = initialPerformance.history.filter((h) => h.result === 'W').length;
    const total = Math.max(1, initialPerformance.history.length);
    return {
      steamId: initialPerformance.steamId,
      name: initialPerformance.nickname,
      avatarUrl: `/players/${initialPerformance.nickname.toLowerCase()}.png`,
      teamName: initialPerformance.team,
      matchesCount: initialPerformance.matchesCount,
      roundWinRatePct: Number(((wins / total) * 100).toFixed(1)),
      currentRating: initialPerformance.currentRating,
      adr: initialPerformance.adr,
      kd: initialPerformance.kd,
      kpr: initialPerformance.kpr,
      dpr: initialPerformance.dpr,
      kastPct: initialPerformance.kastPct,
      ttd: initialPerformance.ttd,
      ttk: initialPerformance.ttk,
      fsp: initialPerformance.fsp,
      recentRatingHistory: initialPerformance.history.map((h) => ({
        matchId: h.matchId,
        date: h.date,
        rating: h.rating,
      })),
    };
  }, [initialPerformance]);

  return (
    <section
      aria-labelledby="player-stats-heading"
      className="max-w-[1280px] w-full mx-auto px-4 pt-4 pb-5 select-none"
    >
      {/* Realinhamento do Título da Seção */}
      <div className="flex items-center justify-start h-7 mb-4 select-none">
        <span className="text-accent text-[13px] font-bold mr-1.5 font-mono">/</span>
        <h1
          id="player-stats-heading"
          className="text-[14px] font-bold uppercase tracking-[0.05em] text-text-primary not-italic"
        >
          {activeTab === 'intro' ? 'Player Introduction' : 'DASHBOARD ANALÍTICO DO JOGADOR'}
        </h1>
      </div>

      {/* Barra de Navegação Interna entre Abas */}
      <div
        role="tablist"
        aria-label="Abas de Estatísticas do Jogador"
        className="flex items-center gap-6 h-7 mb-4 border-b border-border-subtle"
      >
        {PLAYER_STATS_TABS.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              data-testid={`tab-btn-${tab.id}`}
              onClick={() => handleTabChange(tab.id)}
              className={`text-xs pb-1.5 font-mono transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-t-[2px] ${
                isSelected
                  ? 'font-semibold text-text-primary border-b-2 border-white'
                  : 'text-text-secondary hover:text-text-primary border-b-2 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Renderização Condicional da Aba Ativa */}
      <div
        role="tabpanel"
        aria-label={`Conteúdo da aba ${activeTab}`}
        data-testid="stats-tab-panel"
        className="min-h-[420px]"
      >
        {activeTab === 'intro' && (
          <TabIntro
            overview={mappedOverview}
            telemetryData={initialPerformance?.telemetry}
          />
        )}
        {activeTab === 'roles' && <TabRoles />}
        {activeTab === 'weapons' && <TabWeapons />}
        {activeTab === 'buy_types' && <TabBuyTypes />}
        {activeTab === 'maps' && <TabMaps />}
      </div>
    </section>
  );
}

export default PlayerStatsClient;
