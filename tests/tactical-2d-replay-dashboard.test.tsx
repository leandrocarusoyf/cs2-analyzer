import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Tactical2DReplayDashboard } from '../src/components/telemetry/Tactical2DReplayDashboard';
import { mockTelemetryData } from '../src/data/mockTelemetryData';
import { getContrastingTeamColor } from '../src/utils/contrast';

vi.mock('next/navigation', () => ({
  usePathname: () => '/tactical-map',
  useSearchParams: () => new URLSearchParams(),
}));

describe('Utilitário getContrastingTeamColor', () => {
  it('deve forçar branco (#F8FAFC) para cores de time muito escuras garantindo contraste no placar', () => {
    expect(getContrastingTeamColor('#000000')).toBe('#F8FAFC');
    expect(getContrastingTeamColor('#111618')).toBe('#F8FAFC');
    expect(getContrastingTeamColor('#121721')).toBe('#F8FAFC');
    expect(getContrastingTeamColor('#1A1A1A')).toBe('#F8FAFC');
  });

  it('deve manter cores vibrantes e contrastantes sem alteração', () => {
    expect(getContrastingTeamColor('#FFEE00')).toBe('#FFEE00');
    expect(getContrastingTeamColor('#00F0FF')).toBe('#00F0FF');
    expect(getContrastingTeamColor('#E41C24')).toBe('#E41C24');
    expect(getContrastingTeamColor('#2B7FFF')).toBe('#2B7FFF');
  });

  it('deve lidar seguramente com valores vazios ou hex de 3 caracteres', () => {
    expect(getContrastingTeamColor('')).toBe('#F8FAFC');
    expect(getContrastingTeamColor('#000')).toBe('#F8FAFC');
    expect(getContrastingTeamColor('#FFF')).toBe('#FFF');
  });
});

describe('Tactical2DReplayDashboard Component', () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it('deve renderizar a Sidebar fixa com ANALYTICS, // CS2 TELEMETRY e estritamente as 4 operações', () => {
    render(<Tactical2DReplayDashboard initialData={mockTelemetryData} />);

    // Cabeçalho da Sidebar
    expect(screen.getByText('ANALYTICS')).toBeTruthy();
    expect(screen.getByText('// CS2 TELEMETRY')).toBeTruthy();

    // Seção OPERATIONS com estritamente 4 itens permitidos
    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Match History')).toBeTruthy();
    expect(screen.getByText('2D Tactical Map')).toBeTruthy();
    expect(screen.getByText('Player Stats')).toBeTruthy();

    // Item não listado (Grenade Lineups) deve estar ausente
    expect(screen.queryByText('Grenade Lineups')).toBeNull();

    // Rodapé de telemetria
    expect(screen.getByText('ENGINE V2.4 // ONLINE')).toBeTruthy();
    expect(screen.getByText('14ms')).toBeTruthy();
    expect(screen.getByText('128-TICK')).toBeTruthy();
  });

  it('deve renderizar o Header da Partida com placares, metadados, OVERVIEW e UPAR DEMO', () => {
    render(<Tactical2DReplayDashboard initialData={mockTelemetryData} />);

    // Times e placares
    expect(screen.getAllByText('NAVI').length).toBeGreaterThan(0);
    expect(screen.getAllByText('13').length).toBeGreaterThan(0);
    expect(screen.getAllByText('FAZE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('11').length).toBeGreaterThan(0);

    // Metadados
    expect(screen.getByText('DE_MIRAGE')).toBeTruthy();
    expect(screen.getByText('OCT 24, 2026')).toBeTruthy();
    expect(screen.getByText('ESL PRO LEAGUE S24 GRAND FINALS')).toBeTruthy();
    expect(screen.getByText('POST-MATCH ANALYTICS')).toBeTruthy();

    // Botões de ação solicitados
    const overviewBtn = screen.getByText('OVERVIEW');
    expect(overviewBtn).toBeTruthy();
    expect(overviewBtn.closest('a')?.getAttribute('href')).toBe('/matches');

    const uparDemoBtn = screen.getByText('UPAR DEMO');
    expect(uparDemoBtn).toBeTruthy();
  });

  it('deve renderizar os 4 cards de métricas avançadas dinamicamente via AdvancedMatchMetrics', () => {
    render(<Tactical2DReplayDashboard initialData={mockTelemetryData} />);

    // Card 1: Win Expectancy
    expect(screen.getByText('WIN EXPECTANCY')).toBeTruthy();
    expect(screen.getByText('+14.6% frag delta')).toBeTruthy();
    expect(screen.getByText('68.2')).toBeTruthy();
    expect(screen.getByText('31.8')).toBeTruthy();

    // Card 2: Territory Control
    expect(screen.getByText('TERRITORY CONTROL')).toBeTruthy();
    expect(screen.getByText('MID DOMINANCE')).toBeTruthy();
    expect(screen.getByText('64.5')).toBeTruthy();
    expect(screen.getByText('CONTROLLED (NAVI)')).toBeTruthy();
    expect(screen.getByText('CONTESTED')).toBeTruthy();

    // Card 3: Trade Frag Rate
    expect(screen.getByText('TRADE FRAG RATE')).toBeTruthy();
    expect(screen.getByText('ELITE')).toBeTruthy();
    expect(screen.getByText('71.4')).toBeTruthy();
    expect(screen.getByText('5/7 conversions · 420ms reaction')).toBeTruthy();

    // Card 4: Opening Duels
    expect(screen.getByText('OPENING DUELS')).toBeTruthy();
    expect(screen.getByText('14 : 10')).toBeTruthy();
    expect(screen.getByText('w0nderful vs broky')).toBeTruthy();
    expect(screen.getByText('AWP Pick in Connector (00:38)')).toBeTruthy();
    expect(screen.getByText(/78.5%/)).toBeTruthy();
  });

  it('deve renderizar os 10 jogadores mapeados com HP, armas, utilitárias e status de clutch/C4', () => {
    render(<Tactical2DReplayDashboard initialData={mockTelemetryData} />);

    // 5 Jogadores CT
    expect(screen.getAllByText('Aleksib').length).toBeGreaterThan(0);
    expect(screen.getAllByText('iM').length).toBeGreaterThan(0);
    expect(screen.getAllByText('b1t').length).toBeGreaterThan(0);
    expect(screen.getAllByText('jL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('w0nderful').length).toBeGreaterThan(0);

    // 5 Jogadores T
    expect(screen.getAllByText('karrigan').length).toBeGreaterThan(0);
    expect(screen.getAllByText('rain').length).toBeGreaterThan(0);
    expect(screen.getAllByText('frozen').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ropz').length).toBeGreaterThan(0);
    expect(screen.getAllByText('broky').length).toBeGreaterThan(0);

    // Badges dinâmicas de C4 e KIA
    expect(screen.getAllByText('C4').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/KIA/).length).toBeGreaterThan(0);

    // Banner de Clutch e C4 plantada de acordo com o MatchState
    expect(
      screen.getByText('4V4 CLUTCH · C4 PLANTED AT A RAMP')
    ).toBeTruthy();
  });

  it('deve renderizar o Kill Feed tático no canto superior direito sobre o radar', () => {
    render(<Tactical2DReplayDashboard initialData={mockTelemetryData} />);

    // Itens do mockTelemetryData.killFeed
    expect(screen.getAllByText('w0nderful').length).toBeGreaterThan(0);
    expect(screen.getAllByText('broky').length).toBeGreaterThan(0);
    expect(screen.getAllByText('AWP').length).toBeGreaterThan(0);
  });

  it('deve permitir alternar os filtros de radar (Utility, Sightlines, Tracers)', () => {
    render(<Tactical2DReplayDashboard initialData={mockTelemetryData} />);

    const utilityBtn = screen.getByText('Utility').closest('button');
    const sightlinesBtn = screen.getByText('Sightlines').closest('button');
    const tracersBtn = screen.getByText('Tracers').closest('button');

    expect(utilityBtn).toBeTruthy();
    expect(sightlinesBtn).toBeTruthy();
    expect(tracersBtn).toBeTruthy();

    if (utilityBtn) fireEvent.click(utilityBtn);
    if (sightlinesBtn) fireEvent.click(sightlinesBtn);
    if (tracersBtn) fireEvent.click(tracersBtn);
  });

  it('não deve exibir números brutos de ticks da engine na timeline do replay', () => {
    const { container } = render(
      <Tactical2DReplayDashboard initialData={mockTelemetryData} />
    );

    // Busca pela região da linha do tempo
    expect(screen.getByText('Round 24')).toBeTruthy();
    expect(screen.getByText('[MAP POINT]')).toBeTruthy();

    // Assegura que nenhum texto com tick bruto (ex: 64812) esteja visível na timeline
    expect(screen.queryByText('64812')).toBeNull();
    expect(screen.queryByText('64,812')).toBeNull();
  });
});
