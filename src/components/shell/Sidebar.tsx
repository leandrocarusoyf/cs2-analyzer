'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export interface NavItem {
  label: string;
  href: string;
  matchPrefix: string;
  badge?: string;
  Icon: React.ComponentType<{ className?: string }>;
}

export interface NavGroup {
  groupName: string;
  label: string;
  items: NavItem[];
}

function MatchesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function ReplayerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PlayerStatsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </svg>
  );
}

function LeaderboardsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export const SHELL_NAV_GROUPS: readonly NavGroup[] = Object.freeze([
  {
    groupName: '/ GAMES',
    label: 'GAMES',
    items: [
      {
        label: 'Matches',
        href: '/matches',
        matchPrefix: '/matches',
        Icon: MatchesIcon,
      },
    ],
  },
  {
    groupName: '/ 2D TOOLS',
    label: '2D TOOLS',
    items: [
      {
        label: '2D Replayer',
        href: '/replayer/54e43847-2490-4751-9981-831bf7cf367c',
        matchPrefix: '/replayer',
        badge: '2D',
        Icon: ReplayerIcon,
      },
    ],
  },
  {
    groupName: '/ STATISTICS',
    label: 'STATISTICS',
    items: [
      {
        label: 'Player Stats',
        href: '/stats/player',
        matchPrefix: '/stats',
        Icon: PlayerStatsIcon,
      },
      {
        label: 'Leaderboards',
        href: '/leaderboards',
        matchPrefix: '/leaderboards',
        Icon: LeaderboardsIcon,
      },
    ],
  },
]);

export interface SidebarProps {
  defaultCollapsed?: boolean;
}

export function Sidebar({ defaultCollapsed = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const pathname = usePathname() ?? '/matches';
  const searchParams = useSearchParams();
  const queryString = searchParams ? searchParams.toString() : '';

  const buildHrefWithQuery = (baseHref: string): string => {
    if (!queryString) return baseHref;
    return `${baseHref}?${queryString}`;
  };

  return (
    <aside
      aria-label="Navegação Tática Principal"
      data-collapsed={collapsed ? 'true' : 'false'}
      className={`min-h-screen bg-surface border-r border-border-subtle flex flex-col justify-between select-none ${
        collapsed ? 'w-16 min-w-16' : 'w-[215px] min-w-[215px]'
      }`}
    >
      <div>
        {/* Topo da Sidebar: padding px-[18px] py-4 border-b border-border-subtle/50 */}
        <div className="px-[18px] py-4 border-b border-border-subtle/50">
          {!collapsed ? (
            <div className="flex items-start justify-between">
              <div>
                <Link href="/stats/player" className="block group">
                  <span className="text-[25px] font-black italic tracking-tighter text-white leading-none group-hover:text-accent transition-colors block">
                    CS2 ANALYZER
                  </span>
                  <div className="mt-1.5">
                    <span className="rounded-[2px] bg-accent/10 border border-accent/30 px-1 py-0.5 text-[9px] font-mono font-bold text-accent">
                      v0.1.0
                    </span>
                  </div>
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setCollapsed((prev) => !prev)}
                aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                className="text-text-secondary hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-[2px] transition-colors text-xs p-0.5 mt-0.5"
              >
                «
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Link href="/stats/player" className="flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-[2px]">
                <span className="font-black italic text-lg text-accent">CS</span>
              </Link>
              <button
                type="button"
                onClick={() => setCollapsed((prev) => !prev)}
                aria-label="Expandir menu lateral"
                className="text-text-secondary hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-[2px] transition-colors text-xs mt-2"
              >
                »
              </button>
            </div>
          )}
        </div>

        {/* Grupos e Separadores de Categoria */}
        <nav aria-label="Menu Principal" className="px-2">
          {SHELL_NAV_GROUPS.map((group) => (
            <div key={group.groupName}>
              {!collapsed ? (
                <div className="mt-[22px] mb-2.5 flex items-center px-1.5">
                  <span className="text-accent text-[13px] font-bold mr-1.5">/</span>
                  <span className="text-[12px] font-black uppercase tracking-wider text-text-primary shrink-0">
                    {group.label}
                  </span>
                  <div className="flex-1 h-[1px] bg-border-muted ml-2"></div>
                </div>
              ) : (
                <div className="mt-4 mb-2 h-[1px] bg-border-muted" />
              )}

              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/' && pathname.startsWith(item.matchPrefix));

                  return (
                    <li key={item.href}>
                      <Link
                        href={buildHrefWithQuery(item.href)}
                        data-active={isActive ? 'true' : 'false'}
                        aria-current={isActive ? 'page' : undefined}
                        className={`h-[35px] flex items-center px-3.5 my-0.5 rounded-[2px] transition-colors relative cursor-pointer text-[13px] font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
                          isActive
                            ? "bg-surface-active text-white before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-[19px] before:bg-white"
                            : 'text-text-muted hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <item.Icon className="w-4 h-4 mr-2.5 shrink-0" />
                        <span className="truncate">{collapsed ? item.label[0] : item.label}</span>
                        {!collapsed && item.badge && (
                          <span className="ml-auto rounded-[2px] bg-border-subtle px-1.5 py-0.5 text-[10px] font-mono font-bold text-accent">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* Rodapé da Sidebar: Bloco Compacto de Perfil */}
      <div className="p-3 border-t border-border-subtle/50">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-canvas border border-border-subtle rounded-[2px] flex items-center justify-center text-xs font-mono font-bold text-accent">
              KS
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-text-primary truncate">KSCERATO</div>
              <div className="text-[10px] font-mono text-text-secondary truncate">76561198058500492</div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-7 h-7 bg-canvas border border-border-subtle rounded-[2px] flex items-center justify-center text-xs font-mono font-bold text-accent">
              KS
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
