import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecentPerformanceChart } from '../src/components/stats/RecentPerformanceChart.tsx';
import { MOCK_RECENT_TELEMETRY } from '../src/data/recent-performance-mock.ts';

describe('RecentPerformanceChart Telemetry HUD Component', () => {
  it('deve renderizar o contêiner principal com dimensões travadas e 10 colunas de partidas', () => {
    render(<RecentPerformanceChart />);

    const container = screen.getByTestId('recent-performance-chart-container');
    expect(container).toBeTruthy();
    expect(container.className).toContain('h-[370px]');

    // 10 colunas de partidas renderizadas no rodapé
    for (let i = 0; i < 10; i++) {
      expect(screen.getByTestId(`match-col-${i}`)).toBeTruthy();
    }
  });

  it('deve renderizar os botões de lado tático (BOTH, T, CT) e alternar a visibilidade das curvas', () => {
    render(<RecentPerformanceChart />);

    const btnBoth = screen.getByTestId('side-filter-both');
    const btnT = screen.getByTestId('side-filter-t');
    const btnCt = screen.getByTestId('side-filter-ct');

    // Estado inicial padrão: BOTH (3 séries presentes)
    expect(screen.getByTestId('telemetry-series-overall')).toBeTruthy();
    expect(screen.getByTestId('telemetry-series-ct')).toBeTruthy();
    expect(screen.getByTestId('telemetry-series-t')).toBeTruthy();

    // Filtra por T: apenas a série T deve estar visível
    fireEvent.click(btnT);
    expect(screen.queryByTestId('telemetry-series-overall')).toBeNull();
    expect(screen.queryByTestId('telemetry-series-ct')).toBeNull();
    expect(screen.getByTestId('telemetry-series-t')).toBeTruthy();

    // Filtra por CT: apenas a série CT deve estar visível
    fireEvent.click(btnCt);
    expect(screen.queryByTestId('telemetry-series-overall')).toBeNull();
    expect(screen.getByTestId('telemetry-series-ct')).toBeTruthy();
    expect(screen.queryByTestId('telemetry-series-t')).toBeNull();

    // Retorna para BOTH: as 3 séries voltam a ser exibidas
    fireEvent.click(btnBoth);
    expect(screen.getByTestId('telemetry-series-overall')).toBeTruthy();
    expect(screen.getByTestId('telemetry-series-ct')).toBeTruthy();
    expect(screen.getByTestId('telemetry-series-t')).toBeTruthy();
  });

  it('deve permitir alternar a métrica selecionada e recalcular o badge de média', () => {
    render(<RecentPerformanceChart />);

    const averageBadge = screen.getByTestId('chart-average-badge');
    expect(averageBadge.textContent).toContain('Average:');

    // Alterna para ADR
    const adrTab = screen.getByTestId('metric-tab-adr');
    fireEvent.click(adrTab);
    expect(adrTab.getAttribute('aria-selected')).toBe('true');
    expect(averageBadge.textContent).toMatch(/Average:\s*\d+(\.\d+)?/);

    // Alterna para KAST
    const kastTab = screen.getByTestId('metric-tab-kast');
    fireEvent.click(kastTab);
    expect(kastTab.getAttribute('aria-selected')).toBe('true');
    expect(averageBadge.textContent).toContain('%');
  });

  it('deve possuir hitboxes ampliadas (r="15") e exibir tooltip com data, mapa, adversário, placar e métrica no hover', () => {
    render(<RecentPerformanceChart />);

    // Inicialmente sem tooltip
    expect(screen.queryByTestId('match-tooltip')).toBeNull();

    // Hitbox com r="15" presente
    const hitbox0 = screen.getByTestId('hitbox-overall-0');
    expect(hitbox0).toBeTruthy();
    expect(hitbox0.getAttribute('r')).toBe('15');

    // Linha vertical em repouso
    const vline0 = screen.getByTestId('match-vertical-line-0');
    expect(vline0.getAttribute('stroke')).toBe('#1A2226');

    // Hover na partida 0 (Vitória contra Liquid: 13 - 7)
    fireEvent.mouseEnter(hitbox0);

    const tooltip = screen.getByTestId('match-tooltip');
    expect(tooltip).toBeTruthy();

    // Data da partida
    const dateEl = screen.getByTestId('tooltip-date');
    expect(dateEl.textContent).toBe('10/10');

    // Mapa e adversário
    const matchupEl = screen.getByTestId('tooltip-matchup');
    expect(matchupEl.textContent).toContain('CACHE (');
    expect(matchupEl.textContent).toContain('Liquid )');

    // Placar da partida em verde #00FFA3 (vitória)
    const scoreEl = screen.getByTestId('tooltip-score');
    expect(scoreEl.textContent).toBe('13 - 7');
    expect(scoreEl.className).toContain('text-[#00FFA3]');

    // Bloco inferior com valor da métrica e rótulo
    const metricEl = screen.getByTestId('tooltip-metric');
    expect(metricEl.textContent).toContain('1.15');
    expect(metricEl.textContent).toContain('HLTV RATING');

    // Linha vertical iluminada em verde neon #00FFA3
    expect(vline0.getAttribute('stroke')).toBe('#00FFA3');

    // Mouse leave oculta o tooltip e restaura a linha vertical
    fireEvent.mouseLeave(hitbox0);
    expect(screen.queryByTestId('match-tooltip')).toBeNull();
    expect(vline0.getAttribute('stroke')).toBe('#1A2226');
  });

  it('deve exibir placar em vermelho (#EF4444) em caso de derrota (ex: partida 2 contra Spirit 8 - 13)', () => {
    render(<RecentPerformanceChart />);

    const hitbox2 = screen.getByTestId('hitbox-overall-2');
    fireEvent.mouseEnter(hitbox2);

    const tooltip = screen.getByTestId('match-tooltip');
    expect(tooltip).toBeTruthy();

    const matchupEl = screen.getByTestId('tooltip-matchup');
    expect(matchupEl.textContent).toContain('ANUBIS (');
    expect(matchupEl.textContent).toContain('Spirit )');

    const scoreEl = screen.getByTestId('tooltip-score');
    expect(scoreEl.textContent).toBe('8 - 13');
    expect(scoreEl.className).toContain('text-[#EF4444]');
  });

  it('suporta interação via teclado (focus e blur) nas hitboxes para acessibilidade', () => {
    render(<RecentPerformanceChart />);

    const hitbox5 = screen.getByTestId('hitbox-overall-5');
    fireEvent.focus(hitbox5);

    expect(screen.getByTestId('match-tooltip')).toBeTruthy();
    expect(screen.getByTestId('tooltip-matchup').textContent).toContain('INFERNO');

    fireEvent.blur(hitbox5);
    expect(screen.queryByTestId('match-tooltip')).toBeNull();
  });
});


