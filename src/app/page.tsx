import React from 'react';
import { HomeSidebar } from '../components/home/HomeSidebar';
import { HomeHeader } from '../components/home/HomeHeader';
import { HomeMatches } from '../components/home/HomeMatches';
import { ValveStandingsCard } from '../components/home/ValveStandingsCard';
import { NewsFeedCard } from '../components/home/NewsFeedCard';
import { DemoUploadCard } from '../components/home/DemoUploadCard';
import { PlayerSearchCard } from '../components/home/PlayerSearchCard';
import { getLiveMatches } from '../services/home/live-matches';
import { getNewsFeed } from '../services/home/news-feed';
import { getValveRegionalStandings } from '../services/home/valve-standings';
import type { MatchItem, NewsItem, ValveRegion, ValveStandingItem } from '../types/home-data';

export const metadata = {
  title: 'CS2 ANALYZER // TACTICAL HUD',
  description: 'Visão geral tática em tempo real, partidas ao vivo, ranking Valve e análise de telemetria CS2.',
};

export const revalidate = 60;

export default async function HomePage() {
  // 1. Fetch real de partidas via Dust2 Brasil com tratamento rigoroso contra 403
  let matches: MatchItem[] = [];
  try {
    matches = await getLiveMatches();
  } catch (err) {
    // Se a API da Dust2 Brasil retornar 403 (Cloudflare) ou estiver offline, não estoura erro no console do cliente
    console.warn('[Home] Partidas Dust2 Brasil temporariamente indisponíveis (403/Rede):', err instanceof Error ? err.message : err);
  }

  // 2. Fetch real de notícias via RSS
  let newsItems: NewsItem[] = [];
  try {
    newsItems = await getNewsFeed();
  } catch (err) {
    console.warn('[Home] Feed de notícias RSS temporariamente indisponível:', err instanceof Error ? err.message : err);
  }

  // 3. Ranking regional oficial da Valve (VRS)
  let valveStandings: Record<ValveRegion, ValveStandingItem[]> | undefined;
  try {
    valveStandings = await getValveRegionalStandings();
  } catch (err) {
    console.warn('[Home] Ranking regional da Valve temporariamente indisponível:', err instanceof Error ? err.message : err);
  }

  // Partida central em destaque: primeiro jogo 'live' ou próximo agendado
  const featuredMatch = matches.find((m) => m.status === 'live') || matches[0] || null;

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container min-h-screen">
      {/* 1. Layout Global e Casca (ESTÁTICO) */}
      <HomeSidebar />

      <div className="md:pl-64">
        <HomeHeader />

        <main className="relative pt-16 bg-surface w-full px-3 sm:px-gutter min-h-screen">
          <div className="flex flex-col w-full pb-space-xl">
            {/* HUD Top Ribbon: Breadcrumb & Realtime Heartbeat */}
            <div className="flex items-center justify-between py-space-sm mb-space-sm">
              <div className="flex items-center gap-space-sm">
                <span className="text-outline-variant font-stat-mono-md text-stat-mono-md">/</span>
                <h1 className="font-screen-title text-screen-title text-on-surface tracking-wider uppercase flex items-center gap-space-xs">
                  Home
                </h1>
              </div>
            </div>

            <HomeMatches
              matches={matches}
              featuredMatch={featuredMatch}
              news={<NewsFeedCard key="home-news-feed-card" newsItems={newsItems} />}
              sidebar={
                <React.Fragment key="home-sidebar-cards">
                  <ValveStandingsCard key="sidebar-valve-standings" standingsByRegion={valveStandings} />
                  <DemoUploadCard key="sidebar-demo-upload" />
                  <PlayerSearchCard key="sidebar-player-search" />
                </React.Fragment>
              }
            />
          </div>
        </main>
      </div>
    </div>
  );
}
