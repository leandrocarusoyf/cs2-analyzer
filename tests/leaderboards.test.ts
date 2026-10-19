import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import LeaderboardsPage from '../src/app/leaderboards/page.tsx';

describe('Leaderboards Page & Tactical Telemetry Grid (Edge/Skybox)', () => {
  afterEach(() => {
    cleanup();
  });

  it('deve renderizar a tabela com 15 atletas profissionais por padrão ordenados por HLTV desc', () => {
    render(React.createElement(LeaderboardsPage));

    // 1. Título com prefixo slash neon
    expect(screen.getByRole('heading', { level: 1, name: /leaderboards/i })).toBeTruthy();

    // 2. Renderização exata de 15 linhas de jogadores
    const rows = screen.getAllByTestId('leaderboard-row');
    expect(rows).toHaveLength(15);

    // 3. Top 1 por padrão deve ser ZywOo (HLTV 1.34)
    expect(rows[0].getAttribute('data-player-name')).toBe('ZywOo');
    expect(rows[0].getAttribute('data-rank')).toBe('1');
    expect(screen.getByTestId('cell-hltv-zywoo').textContent).toBe('1.34');

    // 4. Segundo lugar deve ser m0NESY (HLTV 1.31)
    expect(rows[1].getAttribute('data-player-name')).toBe('m0NESY');
    expect(rows[1].getAttribute('data-rank')).toBe('2');
  });

  it('deve alternar a ordenação por clique nos cabeçalhos da tabela (ex: ADR e K/D)', () => {
    render(React.createElement(LeaderboardsPage));

    const adrHeader = screen.getByTestId('th-sort-adr');

    // Clique 1: Ordenar por ADR decrescente (donk possui maior ADR: 91.4)
    fireEvent.click(adrHeader);

    let rows = screen.getAllByTestId('leaderboard-row');
    expect(rows[0].getAttribute('data-player-name')).toBe('donk');
    expect(screen.getByTestId('cell-adr-donk').textContent).toBe('91.4');

    // Clique 2: Inverter para ADR crescente (FalleN possui menor ADR: 68.4)
    fireEvent.click(adrHeader);

    rows = screen.getAllByTestId('leaderboard-row');
    expect(rows[0].getAttribute('data-player-name')).toBe('FalleN');
    expect(screen.getByTestId('cell-adr-fallen').textContent).toBe('68.4');

    // Clique 3: Ordenar por K/D (ZywOo tem 1.42)
    const kdHeader = screen.getByTestId('th-sort-kd');
    fireEvent.click(kdHeader);

    rows = screen.getAllByTestId('leaderboard-row');
    expect(rows[0].getAttribute('data-player-name')).toBe('ZywOo');
    expect(screen.getByTestId('cell-kd-zywoo').textContent).toBe('1.42');
  });

  it('deve filtrar os dados e métricas ao selecionar um mapa específico (ex: Inferno)', () => {
    render(React.createElement(LeaderboardsPage));

    // Verificar métricas padrão gerais de ZywOo antes do filtro
    expect(screen.getByTestId('cell-rounds-zywoo').textContent).toBe('780');
    expect(screen.getByTestId('cell-hltv-zywoo').textContent).toBe('1.34');

    // Clicar no pill do mapa Inferno
    const infernoPill = screen.getByTestId('filter-map-Inferno');
    fireEvent.click(infernoPill);

    // As métricas devem ser atualizadas para os dados específicos da Inferno
    // ZywOo na Inferno: 142 rounds e 1.38 HLTV
    expect(screen.getByTestId('cell-rounds-zywoo').textContent).toBe('142');
    expect(screen.getByTestId('cell-hltv-zywoo').textContent).toBe('1.38');

    // donk na Inferno: 120 rounds e 1.35 HLTV
    expect(screen.getByTestId('cell-rounds-donk').textContent).toBe('120');
    expect(screen.getByTestId('cell-hltv-donk').textContent).toBe('1.35');
  });

  it('deve filtrar por função (Role) e busca textual por jogador', () => {
    render(React.createElement(LeaderboardsPage));

    // 1. Filtrar por função AWP (ZywOo, m0NESY, sh1ro, broky)
    const awpPill = screen.getByTestId('filter-role-AWP');
    fireEvent.click(awpPill);

    let rows = screen.getAllByTestId('leaderboard-row');
    expect(rows).toHaveLength(4);
    const awpNames = rows.map((r) => r.getAttribute('data-player-name'));
    expect(awpNames).toEqual(['ZywOo', 'm0NESY', 'sh1ro', 'broky']);

    // 2. Busca textual por "kscerato"
    const searchInput = screen.getByTestId('search-player-input');
    fireEvent.change(searchInput, { target: { value: 'kscerato' } });

    // Com filtro AWP ativo, KSCERATO (Rifler) não deve aparecer
    expect(screen.queryByTestId('leaderboard-row')).toBeNull();

    // Resetar filtros
    fireEvent.click(screen.getByTestId('reset-filters-btn'));

    // Agora busca novamente por KSCERATO
    fireEvent.change(screen.getByTestId('search-player-input'), { target: { value: 'KSCERATO' } });
    rows = screen.getAllByTestId('leaderboard-row');
    expect(rows).toHaveLength(1);
    expect(rows[0].getAttribute('data-player-name')).toBe('KSCERATO');
  });
});

