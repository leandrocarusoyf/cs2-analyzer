import React from 'react';
import Link from 'next/link';

export function HomeSidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-lowest z-40 hidden md:flex flex-col justify-between py-space-lg px-space-md shadow-[0_1px_8px_rgba(0,0,0,0.35)] select-none">
      <div className="flex flex-col gap-space-xl">
        <Link
          href="/"
          className="cursor-pointer block group select-none transition-all duration-200 p-1.5 -m-1.5 rounded-lg border border-transparent hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,240,255,0.25)]"
        >
          <div className="flex items-center gap-space-sm px-space-sm">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-container shadow-[0_0_12px_rgba(0,229,255,0.4)] group-hover:border group-hover:border-cyan-400 group-hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all">
              <span className="material-symbols-outlined text-[20px] group-hover:text-cyan-300 transition-colors">
                radar
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-screen-title text-screen-title tracking-wider text-on-surface leading-none group-hover:text-cyan-300 transition-colors">
                CS2 <span className="text-primary-container group-hover:text-cyan-300 transition-colors">ANALYZER</span>
              </span>
              <span className="font-benchmark-label text-benchmark-label text-outline uppercase tracking-widest group-hover:text-cyan-300/80 transition-colors">
                TACTICAL HUD
              </span>
            </div>
          </div>
        </Link>

        <nav
          className="flex flex-col gap-space-xs"
          data-active-classes="bg-primary-container text-on-primary-container font-bold shadow-[0_0_16px_rgba(0,229,255,0.3)]"
        >
          <Link
            aria-current="page"
            className="flex items-center gap-space-md px-space-md py-space-sm rounded-lg transition-colors bg-primary-container text-on-primary-container font-bold shadow-[0_0_16px_rgba(0,229,255,0.3)]"
            data-path="home"
            href="/"
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span>Home</span>
          </Link>
          <Link
            className="flex items-center gap-space-md px-space-md py-space-sm rounded-lg font-card-header text-card-header text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            data-path="match-history"
            href="/matches"
          >
            <span className="material-symbols-outlined text-[20px]">history</span>
            <span>Match History</span>
          </Link>
          <Link
            className="flex items-center gap-space-md px-space-md py-space-sm rounded-lg font-card-header text-card-header text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            data-path="2d-replayer"
            href="/matches"
          >
            <span className="material-symbols-outlined text-[20px]">play_circle</span>
            <span>2D Replayer</span>
          </Link>
          <Link
            className="flex items-center gap-space-md px-space-md py-space-sm rounded-lg font-card-header text-card-header text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            data-path="player-stats"
            href="/stats/player"
          >
            <span className="material-symbols-outlined text-[20px]">analytics</span>
            <span>Player Stats</span>
          </Link>
          <Link
            className="flex items-center gap-space-md px-space-md py-space-sm rounded-lg font-card-header text-card-header text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            data-path="leaderboards"
            href="/leaderboards"
          >
            <span className="material-symbols-outlined text-[20px]">military_tech</span>
            <span>Leaderboards</span>
          </Link>
        </nav>
      </div>

      <div className="bg-surface-container-low rounded-lg p-space-md flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <span className="font-benchmark-label text-benchmark-label text-outline uppercase tracking-wider">
            SYSTEM TELEMETRY
          </span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-container"></span>
          </span>
        </div>
        <div className="flex items-center justify-between font-stat-mono-md text-stat-mono-md">
          <span className="text-on-surface-variant">PARSER ENGINE</span>
          <span className="text-primary-container">128-TICK</span>
        </div>
        <div className="flex items-center justify-between font-stat-mono-md text-stat-mono-md">
          <span className="text-on-surface-variant">LATENCY</span>
          <span className="text-on-surface">14ms</span>
        </div>
      </div>
    </aside>
  );
}

export default HomeSidebar;
