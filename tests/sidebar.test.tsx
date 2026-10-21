import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Sidebar } from '../src/components/shell/Sidebar.tsx';

let currentPathname = '/stats/player';
let currentSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
  useSearchParams: () => currentSearchParams,
}));

describe('Sidebar Component Integration (EDGE/Skybox Design System)', () => {
  beforeEach(() => {
    currentPathname = '/stats/player';
    currentSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    cleanup();
  });

  it('deve renderizar o logo display itálico "CS2 ANALYZER", badge "v0.1.0" e grupos slash de navegação', () => {
    render(<Sidebar />);

    expect(screen.getByText('CS2 ANALYZER')).toBeTruthy();
    expect(screen.getByText('v0.1.0')).toBeTruthy();

    // Rótulos de grupo no padrão / GRP
    expect(screen.getByText('GAMES')).toBeTruthy();
    expect(screen.getByText('2D TOOLS')).toBeTruthy();
    expect(screen.getByText('STATISTICS')).toBeTruthy();

    // Links de navegação canônicos
    const matchesLink = screen.getByRole('link', { name: /matches/i });
    const replayerLink = screen.getByRole('link', { name: /2d replayer/i });
    const statsLink = screen.getByRole('link', { name: /player stats/i });
    const leaderboardsLink = screen.getByRole('link', { name: /leaderboards/i });

    expect(matchesLink.getAttribute('href')).toBe('/matches');
    expect(replayerLink.getAttribute('href')).toBe('/matches');
    expect(statsLink.getAttribute('href')).toBe('/stats/player');
    expect(leaderboardsLink.getAttribute('href')).toBe('/leaderboards');

    // Em /stats/player, o link de Player Stats deve estar ativo
    expect(statsLink.getAttribute('data-active')).toBe('true');
    expect(matchesLink.getAttribute('data-active')).toBe('false');
    expect(replayerLink.getAttribute('data-active')).toBe('false');
  });

  it('deve marcar o link 2D Replayer como ativo quando pathname estiver em /replayer/[id]', () => {
    currentPathname = '/replayer/54e43847-2490-4751-9981-831bf7cf367c';
    render(<Sidebar />);

    const replayerLink = screen.getByRole('link', { name: /2d replayer/i });
    expect(replayerLink.getAttribute('data-active')).toBe('true');
  });
});

