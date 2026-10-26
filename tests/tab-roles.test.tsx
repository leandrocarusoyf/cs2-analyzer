import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { TabRoles } from '../src/components/stats/TabRoles.tsx';
import type { PlayerPerformanceResult } from '../src/types/stats.ts';

describe('TabRoles (Roles & Positioning / Role Performance)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renderiza a primeira dobra com radar de 12 eixos e bloco de telemetria comparativa', () => {
    render(<TabRoles playerName="donk" matchesCount={43} />);

    // 1. Cabeçalho e Breadcrumbs
    expect(screen.getByText('Role performance')).toBeDefined();
    expect(screen.getByText('FILTER VECTOR:')).toBeDefined();
    expect(screen.getByText(/INDEXING: 1032 MATCH ROUNDS/i)).toBeDefined();

    // 2. Multi-Axis Performance Radar (12 eixos)
    expect(screen.getByText('Multi-Axis Performance Radar')).toBeDefined();
    expect(screen.getByText('12-AXIS BENCHMARK')).toBeDefined();
    expect(screen.getByText('donk')).toBeDefined();
    expect(screen.getByText('Tier 1 Pro Average')).toBeDefined();

    // Eixos do Radar SVG (12 eixos)
    expect(screen.getByText('HLTV RATING')).toBeDefined();
    expect(screen.getAllByText('ADR').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('OPENING ATT')).toBeDefined();
    expect(screen.getByText('OPENING KD')).toBeDefined();
    expect(screen.getByText('TRADE KILLS/R')).toBeDefined();
    expect(screen.getAllByText('KPR').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('KD RATIO')).toBeDefined();
    expect(screen.getByText('DPR')).toBeDefined();
    expect(screen.getByText('TRADED DEATHS')).toBeDefined();
    expect(screen.getByText('UDR')).toBeDefined();
    expect(screen.getByText('FLASH ASSISTS')).toBeDefined();
    expect(screen.getByText('KAST')).toBeDefined();

    // 3. Bloco de Telemetria e Delta
    expect(screen.getByText(/TELEMETRY DELTA \/\/ DONK VS COMPARISON/i)).toBeDefined();
    expect(screen.getByText('MODE: GLOBAL SCOUT')).toBeDefined();
    expect(screen.getAllByText('1.33').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('1.07')).toBeDefined();
    expect(screen.getByText('+0.26')).toBeDefined();
    expect(screen.getByText('vs T1 Baseline')).toBeDefined();

    // Barras comparativas
    expect(screen.getByText('Average Damage / Round (ADR)')).toBeDefined();
    expect(screen.getByText('Kill / Death Ratio')).toBeDefined();
    expect(screen.getByText('Kills Per Round (KPR)')).toBeDefined();
    expect(screen.getByText('KAST Consistency')).toBeDefined();
  });

  it('renderiza a segunda dobra com as tabelas de CT Side e T Side e rodapés de auditoria', () => {
    render(<TabRoles playerName="donk" />);

    // 1. Tabela CT Side Roles & Zones
    expect(screen.getByText('CT Side Roles & Zones')).toBeDefined();
    expect(screen.getAllByText(/ROLES RECORDED/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('B Con')).toBeDefined();
    expect(screen.getByText('B Anchor')).toBeDefined();
    expect(screen.getByText('A Connector')).toBeDefined();
    expect(screen.getByText('DEFENSIVE WIN-RATE: 58.6%')).toBeDefined();

    // 2. Tabela T Side Roles & Execute Vectors
    expect(screen.getByText('T Side Roles & Execute Vectors')).toBeDefined();
    expect(screen.getAllByText('A Lurk').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('T Mid')).toBeDefined();
    expect(screen.getByText('Lower Tunnels')).toBeDefined();
    expect(screen.getByText('OFFENSIVE WIN-RATE: 53.4%')).toBeDefined();

    // 3. Rodapé de Auditoria Técnica
    expect(screen.getByText(/STREAM SYNCHRONIZED/i)).toBeDefined();
    expect(screen.getByText(/ENGINE V2.4 \/\/ ONLINE/i)).toBeDefined();
    expect(screen.getByText(/128-TICK/i)).toBeDefined();
  });

  it('filtra as tabelas de função conforme seleção das pílulas no SegmentedFilter (LURKER / ANCHOR)', () => {
    render(<TabRoles playerName="donk" />);

    // Clica no filtro "Anchor"
    const anchorBtn = screen.getByRole('tab', { name: /^Anchor$/i });
    fireEvent.click(anchorBtn);

    // Deve exibir B Anchor e ocultar outras funções de rotação
    expect(screen.getByText('B Anchor')).toBeDefined();
    expect(screen.queryByText('B Con')).toBeNull();
    // Como é filtro estritamente CT, tabela T deve exibir estado vazio
    expect(screen.getByText('Nenhuma função T registrada para este filtro.')).toBeDefined();

    // Clica no filtro "Lurker" (renomeado de Lurk)
    const lurkerBtn = screen.getByRole('tab', { name: /^Lurker$/i });
    fireEvent.click(lurkerBtn);

    // Deve exibir A Lurk e tabela CT deve ficar vazia
    expect(screen.getAllByText('A Lurk').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Nenhuma função CT registrada para este filtro.')).toBeDefined();

    // Retorna para "All"
    const allBtn = screen.getByRole('tab', { name: /^All$/i });
    fireEvent.click(allBtn);

    expect(screen.getByText('B Con')).toBeDefined();
    expect(screen.getByText('T Mid')).toBeDefined();
  });

  it('atualiza dinamicamente métricas, pico e radar ao alternar de FalleN para Jimpphat', () => {
    const fallenPerformance: PlayerPerformanceResult = {
      steamId: '76561197960690195',
      nickname: 'FalleN',
      team: 'FURIA',
      matchesCount: 2,
      totalRounds: 44,
      currentRating: 0.97,
      adr: 79.7,
      kd: 1.0,
      kpr: 0.61,
      dpr: 0.61,
      kastPct: 61.4,
      ttd: 250,
      ttk: 400,
      roles: {
        ct: 'Inferno A Anchor',
        t: 'Inferno Mid Lurker',
        primary: 'Sniper / IGL',
      },
      history: [
        {
          matchId: 'm1',
          mapName: 'de_dust2',
          date: '18/10',
          opponent: 'Aurora',
          score: '13 - 8',
          result: 'W',
          rating: 0.90,
          adr: 75.6,
          kills: 12,
          deaths: 14,
          ttd: null,
          ttk: null,
        },
        {
          matchId: 'm2',
          mapName: 'de_inferno',
          date: '18/10',
          opponent: 'Aurora',
          score: '13 - 10',
          result: 'W',
          rating: 1.04,
          adr: 83.7,
          kills: 15,
          deaths: 13,
          ttd: null,
          ttk: null,
        },
      ],
      telemetry: [],
    };

    const jimpphatPerformance: PlayerPerformanceResult = {
      steamId: '76561198855375325',
      nickname: 'Jimpphat',
      team: 'MOUZ',
      matchesCount: 2,
      totalRounds: 44,
      currentRating: 1.03,
      adr: 90.6,
      kd: 1.04,
      kpr: 0.66,
      dpr: 0.63,
      kastPct: 60.8,
      ttd: 220,
      ttk: 350,
      roles: {
        ct: 'Inferno A Anchor',
        t: 'Inferno Mid Lurker',
        primary: 'Anchor / Lurker',
      },
      history: [
        {
          matchId: 'm1',
          mapName: 'de_dust2',
          date: '18/10',
          opponent: 'Vitality',
          score: '8 - 13',
          result: 'L',
          rating: 0.60,
          adr: 64.7,
          kills: 9,
          deaths: 16,
          ttd: null,
          ttk: null,
        },
        {
          matchId: 'm2',
          mapName: 'de_inferno',
          date: '18/10',
          opponent: 'Vitality',
          score: '13 - 10',
          result: 'W',
          rating: 1.46,
          adr: 116.5,
          kills: 20,
          deaths: 12,
          ttd: null,
          ttk: null,
        },
      ],
      telemetry: [],
    };

    // Renderiza FalleN
    const { rerender } = render(<TabRoles performance={fallenPerformance} />);

    expect(screen.getByText('FalleN')).toBeDefined();
    expect(screen.getByText('(Sniper / IGL)')).toBeDefined();
    expect(screen.getAllByText('0.97').length).toBeGreaterThanOrEqual(1);
    // Delta negativo: 0.97 - 1.07 = -0.10
    expect(screen.getByText('-0.10')).toBeDefined();
    // Pico dinâmico do FalleN: 1.04
    expect(screen.getByText('PEAK 1.04')).toBeDefined();
    // Rounds reais: 44
    expect(screen.getByText(/INDEXING: 44 MATCH ROUNDS/i)).toBeDefined();

    // Alterna para Jimpphat
    rerender(<TabRoles performance={jimpphatPerformance} />);

    expect(screen.getByText('Jimpphat')).toBeDefined();
    expect(screen.getByText('(Anchor / Lurker)')).toBeDefined();
    expect(screen.getByText('1.03')).toBeDefined();
    // Delta negativo: 1.03 - 1.07 = -0.04
    expect(screen.getByText('-0.04')).toBeDefined();
    // Pico dinâmico do Jimpphat: 1.46
    expect(screen.getByText('PEAK 1.46')).toBeDefined();
    expect(screen.getByText('90.6')).toBeDefined();
    expect(screen.getByText('1.04')).toBeDefined();
    expect(screen.getByText('0.66')).toBeDefined();
    expect(screen.getByText('60.8%')).toBeDefined();
  });
});
