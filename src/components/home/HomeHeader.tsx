import React from 'react';
import Link from 'next/link';

export function HomeHeader() {
  return (
    <header className="fixed top-0 left-0 md:left-64 right-0 h-16 bg-surface/80 backdrop-blur-xl z-40 flex items-center justify-between md:justify-end px-3 sm:px-gutter shadow-[0_1px_8px_rgba(0,0,0,0.25)]">
      <nav aria-label="Navegação móvel" className="md:hidden flex gap-3 text-xs"><Link href="/">Home</Link><Link href="/matches">Partidas</Link><Link href="/stats/player">Stats</Link><Link href="/leaderboards">Ranking</Link></nav>
      <div className="flex items-center gap-space-md">
        <div className="flex items-center gap-space-xs"></div>
        <div className="h-6 w-px bg-surface-container-high"></div>
        <button
          type="button"
          aria-label="Notificações do sistema"
          className="w-8 h-8 rounded bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
        </button>
        <div className="relative flex items-center cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-primary-container ring-2 ring-surface"></span>
        </div>
      </div>
    </header>
  );
}

export default HomeHeader;
