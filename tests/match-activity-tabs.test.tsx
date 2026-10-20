import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PlayerStatsTable, type PlayerStatRow } from '../src/components/stats/PlayerStatsTable.tsx';

describe('PlayerStatsTable - Abas e Leetify Clone (Activity, Trades, Opening Duels)', () => {
  afterEach(() => {
    cleanup();
  });

  const testPlayers: PlayerStatRow[] = [
    {
      steamId: '76561198855375325',
      nickname: 'Jimpphat',
      team: 'Aurora',
      rating: 1.46,
      kills: 19,
      deaths: 10,
      assists: 4,
      adr: 116.5,
      ttd: 430,
      ttk: 234,
      metrics_json: {
        udr: { overall: 12.0 },
        opening: { firstKills: 4, firstDeaths: 2 },
        activity: {
          totalDamage: 2363,
          heDmg: 187,
          molotovDmg: 132,
          enemiesFlashed: 15,
          shotsFired: 298,
          wastedMagPct: 32,
          wastedBullets: 67,
          roundsSurvived: 10,
          roundsSurvivedPct: 50,
        },
      },
    },
    {
      steamId: '76561198058500492',
      nickname: 'KSCERATO',
      team: 'FURIA',
      rating: 1.22,
      kills: 16,
      deaths: 13,
      assists: 2,
      adr: 113.7,
      ttd: null,
      ttk: 327,
      metrics_json: {
        udr: { overall: 8.5 },
        opening: { firstKills: 2, firstDeaths: 1 },
        activity: {
          totalDamage: 1441,
          heDmg: 306,
          molotovDmg: 120,
          enemiesFlashed: 4,
          shotsFired: 279,
          wastedMagPct: 39,
          wastedBullets: 107,
          roundsSurvived: 8,
          roundsSurvivedPct: 40,
        },
      },
    },
  ];

  it('1. REMOÇÃO DE TIMELINE: a aba Timeline não existe no conjunto de abas da tabela', () => {
    render(<PlayerStatsTable players={testPlayers} />);
    expect(screen.queryByTestId('match-tab-timeline')).toBeNull();
    expect(screen.queryByText('Timeline')).toBeNull();
  });

  it('2. ABA ACTIVITY: renderiza as colunas exatas da referência Leetify', () => {
    render(<PlayerStatsTable players={testPlayers} defaultTab="Activity" />);

    // Verifica presença dos cabeçalhos exatos
    expect(screen.getAllByText('Total Damage').length).toBeGreaterThan(0);
    expect(screen.getAllByText('HE dmg').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Molotov dmg').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Enemies Flashed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Shots Fired').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Wasted Magazine %').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rounds Survived').length).toBeGreaterThan(0);

    // Verifica os valores formatados de Wasted Magazine e Rounds Survived
    expect(screen.getByText('32% (67 bullets)')).toBeTruthy();
    expect(screen.getByText('10 (50%)')).toBeTruthy();
    expect(screen.getByText('39% (107 bullets)')).toBeTruthy();
    expect(screen.getByText('8 (40%)')).toBeTruthy();
  });

  it('3. ABA OPENING DUELS: calcula e exibe o ratio no formato FD:FK (1:2)', () => {
    render(<PlayerStatsTable players={testPlayers} defaultTab="Opening Duels" />);

    // Jimpphat: FD=2, FK=4 -> "2:4"
    expect(screen.getByText('2:4')).toBeTruthy();

    // KSCERATO: FD=1, FK=2 -> "1:2"
    expect(screen.getByText('1:2')).toBeTruthy();
  });

  it('4. ABA TRADES: renderiza métricas de trocas e rating tático de trade', () => {
    render(<PlayerStatsTable players={testPlayers} defaultTab="Trades" />);

    expect(screen.getAllByText('Trade Kills').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Traded Deaths').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Trade Kill %').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Traded Death %').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Untraded Deaths').length).toBeGreaterThan(0);
  });
});
