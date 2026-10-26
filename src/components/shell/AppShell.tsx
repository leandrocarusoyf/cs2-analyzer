'use client';

import Link from 'next/link';
import React, { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar.tsx';
import { FilterBar } from './FilterBar.tsx';

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname() ?? '';
  const isHomeRoute = pathname === '/' || pathname === '/home';
  const isTacticalMapRoute = pathname.startsWith('/tactical-map');
  const isReplayerRoute = pathname.startsWith('/replayer');
  const isLeaderboardsRoute = pathname.startsWith('/leaderboards');
  const isStatsRoute = pathname.startsWith('/stats');

  if (isHomeRoute || isTacticalMapRoute) {
    return <>{children}</>;
  }

  if (isReplayerRoute) {
    return (
      <div className="flex h-screen max-h-screen w-screen overflow-hidden bg-[#0B0E0F] text-white select-none">
        <Suspense fallback={<div className="w-[215px] min-w-[215px] h-screen bg-[#111618] border-r border-[#1F2629]" />}>
          <Sidebar />
        </Suspense>
        <div className="flex flex-1 flex-col h-screen max-h-screen min-w-0 overflow-hidden">
          <main className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col bg-[#0B0E0F]">{children}</main>
        </div>
      </div>
    );
  }

  if (isLeaderboardsRoute) {
    return (
      <div className="flex h-screen max-h-screen w-screen overflow-hidden bg-[#0B0E0F] text-white select-none">
        <Suspense fallback={<div className="w-[215px] min-w-[215px] h-screen bg-[#111618] border-r border-[#1F2629]" />}>
          <Sidebar />
        </Suspense>
        <div className="flex-1 min-w-0 h-full overflow-y-auto px-8 py-6">
          <div className="max-w-[1360px] mx-auto">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0B0E0F] text-white">
      <Suspense fallback={<div className="w-[215px] min-w-[215px] min-h-screen bg-[#111618] border-r border-[#1F2629]" />}>
        <Sidebar />
      </Suspense>
      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-y-auto">
        <Suspense fallback={<div className="h-12 border-b border-[#1F2629] bg-[#111618]" />}>
          <FilterBar />
        </Suspense>
        <nav aria-label="Navegação móvel" className="flex gap-5 overflow-x-auto border-b border-border-subtle px-4 py-3 text-xs md:hidden"><Link href="/matches">Partidas</Link><Link href="/stats/player">Jogadores</Link><Link href="/leaderboards">Ranking</Link></nav>
        <main className={`flex-1 bg-[#0B0E0F] ${isStatsRoute ? '' : 'p-4 lg:p-6'}`}>{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
