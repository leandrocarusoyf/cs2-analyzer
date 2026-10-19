import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TabRoles } from '../src/components/stats/TabRoles.tsx';
import {
  KSCERATO_ROLE_ANALYTICS,
  NIKO_ROLE_ANALYTICS,
  CANONICAL_RADAR_AXES,
} from '../src/data/roles-mock.ts';

describe('TabRoles Tactical HUD Component (EDGE/Skybox Design System)', () => {
  afterEach(() => {
    cleanup();
  });

  it('deve renderizar o título de seção / Role performance e o container geral', () => {
    render(<TabRoles data={KSCERATO_ROLE_ANALYTICS} />);

    expect(screen.getByTestId('tab-roles-content')).toBeTruthy();
    expect(screen.getByText('Role performance')).toBeTruthy();
  });

  it('deve renderizar os 10 eixos canónicos no gráfico de radar SVG', () => {
    render(<TabRoles data={KSCERATO_ROLE_ANALYTICS} />);

    for (const axis of CANONICAL_RADAR_AXES) {
      expect(screen.getAllByText(axis).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('deve renderizar todos os pills de filtro de função e alternar seleção', () => {
    render(<TabRoles data={KSCERATO_ROLE_ANALYTICS} />);

    const anchorPill = screen.getByRole('button', { name: 'Anchor' });
    const lurkPill = screen.getByRole('button', { name: 'Lurk' });
    const allPill = screen.getByRole('button', { name: 'All' });

    expect(anchorPill).toBeTruthy();
    expect(lurkPill).toBeTruthy();
    expect(allPill).toBeTruthy();

    // Clica no pill Anchor (CT)
    fireEvent.click(anchorPill);
    expect(anchorPill.className).toContain('text-[#2979FF]');

    // Clica no pill Lurk (TR)
    fireEvent.click(lurkPill);
    expect(lurkPill.className).toContain('text-[#FF8C00]');
  });

  it('deve renderizar a coluna comparativa com as 5 métricas principais', () => {
    render(<TabRoles data={KSCERATO_ROLE_ANALYTICS} />);

    expect(screen.getByText(/vs Comparison/i)).toBeTruthy();
    expect(screen.getByText('HLTV RATING')).toBeTruthy();
    expect(screen.getAllByText('ADR').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('K/D').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('KPR').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('KAST').length).toBeGreaterThanOrEqual(1);
  });


  it('deve renderizar as tabelas inferiores de funções CT e TR com cabeçalhos canónicos', () => {
    render(<TabRoles data={KSCERATO_ROLE_ANALYTICS} />);

    // Deve haver 2 cabeçalhos de tabela (CT e TR)
    const roleHeaders = screen.getAllByText('ROLE');
    expect(roleHeaders.length).toBe(2);

    const mapHeaders = screen.getAllByText('MAP');
    expect(mapHeaders.length).toBe(2);

    const hltvHeaders = screen.getAllByText('HLTV');
    expect(hltvHeaders.length).toBe(2);

    const roundHeaders = screen.getAllByText('ROUNDS');
    expect(roundHeaders.length).toBe(2);
  });

  it('deve aceitar dados dinâmicos de outros jogadores como NiKo via props', () => {
    render(<TabRoles data={NIKO_ROLE_ANALYTICS} />);

    // NiKo deve aparecer no botão de jogador ativo
    expect(screen.getAllByText('NiKo').length).toBeGreaterThanOrEqual(1);
  });
});
