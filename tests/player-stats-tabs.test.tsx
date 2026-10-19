import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import PlayerStatsPage from '../src/app/stats/player/PlayerStatsClient.tsx';
import { TabIntro } from '../src/components/stats/TabIntro.tsx';
import { TabWeapons } from '../src/components/stats/TabWeapons.tsx';
import type { PlayerOverviewStats, WeaponPerformanceStat } from '../src/types/analytics.ts';

const pushMock = vi.fn();
let currentSearchParams = new URLSearchParams();
let currentPathname = '/stats/player';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
  }),
  usePathname: () => currentPathname,
  useSearchParams: () => currentSearchParams,
}));

describe('Player Stats Tabs & Visual Components', () => {
  beforeEach(() => {
    pushMock.mockReset();
    currentSearchParams = new URLSearchParams();
    currentPathname = '/stats/player';
  });

  afterEach(() => {
    cleanup();
  });

  it('deve alternar de forma reativa entre as abas via parâmetro tab na URL', () => {
    // 1. Renderiza inicialmente na aba Intro (padrão)
    const { rerender } = render(<PlayerStatsPage />);
    expect(screen.getByTestId('tab-intro-content')).toBeTruthy();

    // Clica na aba Weapons e verifica a chamada do roteador
    const weaponsTabBtn = screen.getByTestId('tab-btn-weapons');
    fireEvent.click(weaponsTabBtn);

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/stats/player?tab=weapons');

    // 2. Simula a URL com tab=roles
    currentSearchParams = new URLSearchParams('tab=roles');
    rerender(<PlayerStatsPage />);
    expect(screen.getByTestId('tab-roles-content')).toBeTruthy();

    // 3. Simula a URL com tab=buy_types
    currentSearchParams = new URLSearchParams('tab=buy_types');
    rerender(<PlayerStatsPage />);
    expect(screen.getByTestId('tab-buy-types-content')).toBeTruthy();

    // 4. Simula a URL com tab=maps
    currentSearchParams = new URLSearchParams('tab=maps');
    rerender(<PlayerStatsPage />);
    expect(screen.getByTestId('tab-maps-content')).toBeTruthy();
  });

  it('deve renderizar com exatidão os 4 cartões principais de KPI na aba Intro (ADR, K/D, KPR, DPR)', () => {
    const customOverview: PlayerOverviewStats = {
      steamId: '76561198000000002',
      name: 'yuurih',
      avatarUrl: '/avatars/yuurih.png',
      teamName: 'FURIA',
      matchesCount: 30,
      roundWinRatePct: 60.0,
      currentRating: 1.25,
      adr: 87.5,
      kd: 1.35,
      kpr: 0.82,
      dpr: 0.61,
      kastPct: 76.5,
      recentRatingHistory: [
        { matchId: 'm1', date: '12/10', rating: 1.25 },
        { matchId: 'm2', date: '13/10', rating: 1.3 },
      ],
    };

    render(<TabIntro overview={customOverview} />);

    // Verificar se os 4 KPIs foram renderizados com os valores fornecidos
    const adrCard = screen.getByTestId('kpi-card-adr');
    const kdCard = screen.getByTestId('kpi-card-kd');
    const kprCard = screen.getByTestId('kpi-card-kpr');
    const dprCard = screen.getByTestId('kpi-card-dpr');

    expect(adrCard.textContent).toContain('87.5');
    expect(kdCard.textContent).toContain('1.35');
    expect(kprCard.textContent).toContain('0.82');
    expect(dprCard.textContent).toContain('0.61');

    // Verificar se os blocos de RoleEqualizer foram renderizados com agulha de benchmark
    const equalizers = screen.getAllByTestId('role-equalizer');
    expect(equalizers).toHaveLength(2);
    const benchmarkNeedles = screen.getAllByTestId('role-equalizer-benchmark-needle');
    expect(benchmarkNeedles).toHaveLength(2);
  });

  it('deve apresentar e calcular com exatidão os rácios e valores na tabela analítica de armas', () => {
    const customWeapons: WeaponPerformanceStat[] = [
      {
        weaponId: 7,
        weaponName: 'AK-47',
        usagePct: 50.0,
        roundsPlayed: 100,
        adr: 90.0,
        roundWinRatePct: 60.0,
        openingDuelsCount: 20,
        economyRating: 120.0,
        damagePerDollar: 0.12,
      },
      {
        weaponId: 16,
        weaponName: 'M4A1-S',
        usagePct: 30.0,
        roundsPlayed: 60,
        adr: 80.0,
        roundWinRatePct: 55.0,
        openingDuelsCount: 10,
        economyRating: 105.5,
        damagePerDollar: 0.1055,
      },
    ];

    render(<TabWeapons weapons={customWeapons} />);

    const akRow = screen.getByTestId('weapon-row-7');
    expect(akRow.textContent).toContain('AK-47');
    expect(akRow.textContent).toContain('50.0%');
    expect(akRow.textContent).toContain('90.0');
    expect(akRow.textContent).toContain('60.0%');
    expect(akRow.textContent).toContain('120.0');
    expect(akRow.textContent).toContain('0.1200');

    const m4Row = screen.getByTestId('weapon-row-16');
    expect(m4Row.textContent).toContain('M4A1-S');
    expect(m4Row.textContent).toContain('30.0%');
    expect(m4Row.textContent).toContain('80.0');
    expect(m4Row.textContent).toContain('105.5');
    expect(m4Row.textContent).toContain('0.1055');

    // Verificar se os ícones SVG foram renderizados nos cards de topo e na tabela
    const topIcons = screen.getAllByTestId('top-weapon-icon');
    expect(topIcons).toHaveLength(2);
    expect(topIcons[0].getAttribute('src')).toBe('/icons/icon-ak47.svg');
    expect(topIcons[1].getAttribute('src')).toBe('/icons/icon-m4a1_silencer.svg');

    const akTableIcon = screen.getByTestId('weapon-table-icon-7');
    expect(akTableIcon.getAttribute('src')).toBe('/icons/icon-ak47.svg');

    const m4TableIcon = screen.getByTestId('weapon-table-icon-16');
    expect(m4TableIcon.getAttribute('src')).toBe('/icons/icon-m4a1_silencer.svg');
  });
});

