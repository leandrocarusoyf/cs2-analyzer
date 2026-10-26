import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { PlayerMatchInspectModal } from '../src/components/replay/PlayerMatchInspectModal.tsx';
import { TeamRosterSidebar } from '../src/components/replay/TeamRosterSidebar.tsx';
import { PlayerStatsTable, type PlayerStatRow } from '../src/components/stats/PlayerStatsTable.tsx';
import type { PlayerManifestEntry } from '../src/types/replay.ts';
import type { InterpolatedPlayerState } from '../src/types/replayer-engine.ts';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

const SAMPLE_PLAYERS_MANIFEST: PlayerManifestEntry[] = [
  { id: 1, steamId: '76561198058500492', name: 'Aleksib', initialTeam: 'CT' },
  { id: 2, steamId: '76561198000000002', name: 'b1t', initialTeam: 'CT' },
  { id: 3, steamId: '76561198000000003', name: 'iM', initialTeam: 'CT' },
  { id: 4, steamId: '76561198000000004', name: 'w0nderful', initialTeam: 'CT' },
  { id: 5, steamId: '76561198000000005', name: 'jL', initialTeam: 'CT' },
  { id: 6, steamId: '76561198000000006', name: 'karrigan', initialTeam: 'T' },
  { id: 7, steamId: '76561198000000007', name: 'rain', initialTeam: 'T' },
  { id: 8, steamId: '76561198000000008', name: 'frozen', initialTeam: 'T' },
  { id: 9, steamId: '76561198000000009', name: 'ropz', initialTeam: 'T' },
  { id: 10, steamId: '76561198000000010', name: 'broky', initialTeam: 'T' },
];

const SAMPLE_PLAYER_STATES: InterpolatedPlayerState[] = SAMPLE_PLAYERS_MANIFEST.map((p) => ({
  playerId: p.id,
  percentX: 50,
  percentY: 50,
  worldZ: 0,
  currentFloor: 'default',
  yaw: 0,
  hp: 100,
  armor: 100,
  hasHelmet: true,
  hasDefuser: p.initialTeam === 'CT',
  isAlive: true,
  activeWeaponId: 7,
  isDefusing: false,
  isPlanting: false,
  flashDuration: 0,
  ping: 15,
}));

describe('PlayerMatchInspectModal & TeamRoster Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renderiza o modal com fidelidade visual ao protótipo Stitch (Breadcrumbs, Bio, Badges, Radar, Hitbox e Duelos)', () => {
    render(
      <PlayerMatchInspectModal
        matchId="54e43847-2490-4751-9981-831bf7cf367c"
        steamId="76561198058500492"
        isOpen={true}
        onClose={vi.fn()}
        playerInfo={{
          nickname: 'Aleksib',
          realName: 'Aleksi Virolainen',
          team: 'NAVI',
          side: 'CT',
          role: 'TACTICAL SHOT-CALLER (IGL)',
          mapName: 'DE_MIRAGE',
        }}
      />,
    );

    // 1. Header & Navigation
    expect(screen.getByText(/2D TACTICAL MAP/i)).toBeDefined();
    expect(screen.getByText(/OVERVIEW/i)).toBeDefined();
    expect(screen.getByText(/BACK TO 2D MAP/i)).toBeDefined();
    expect(screen.getByText(/Close \[ESC\]/i)).toBeDefined();
    expect(screen.getByText(/INSPECTING: ALEKSIB \(NAVI · CT\)/i)).toBeDefined();

    // 2. Player Bio & 6 Primary KPI Badges
    expect(screen.getByText('Aleksi Virolainen')).toBeDefined();
    expect(screen.getByText('TACTICAL SHOT-CALLER (IGL)')).toBeDefined();
    expect(screen.getByText('Tier 1 Filter: ON')).toBeDefined();
    expect(screen.getByText('HLTV 2.1')).toBeDefined();
    expect(screen.getByText('ADR')).toBeDefined();
    expect(screen.getByText('K/D RATIO')).toBeDefined();
    expect(screen.getByText('KAST')).toBeDefined();
    expect(screen.getByText('HS %')).toBeDefined();
    expect(screen.getAllByText('IMPACT').length).toBeGreaterThanOrEqual(2);

    // 3. Central Grid: Radar & Hitbox
    expect(screen.getByText('Tactical Profiling Vector')).toBeDefined();
    expect(screen.getByText('6-AXIS RADAR')).toBeDefined();
    expect(screen.getByText('OPENING DUELS')).toBeDefined();
    expect(screen.getByText('TRADE FRAG SUCCESS')).toBeDefined();
    expect(screen.getByText('HE GRENADE DAMAGE')).toBeDefined();
    expect(screen.getByText('FLASH IMPACT')).toBeDefined();
    expect(screen.getByText('TRIGGER SPACING / SPRAY')).toBeDefined();
    expect(screen.getByText('1vX CLUTCH CONV.')).toBeDefined();
    expect(screen.getByText('Hitbox & Aim Mechanics')).toBeDefined();
    expect(screen.getByText('2D ANATOMY REGISTRATION')).toBeDefined();
    expect(screen.getByText('HEADSHOT ZONE')).toBeDefined();
    expect(screen.getByText('CHEST / UPPER TORSO')).toBeDefined();
    expect(screen.getByText('Reaction Speed')).toBeDefined();
    expect(screen.getByText('Headlock Offset')).toBeDefined();

    // 4. Bottom Section: Micro-duels
    expect(screen.getByText(/Match Micro-Duels/i)).toBeDefined();
    expect(screen.getByRole('tab', { name: /All Duels/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Opening Duels/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Clutch Encounters/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Trades/i })).toBeDefined();

    // 5. Footer Status Bar
    expect(
      screen.getByText(/LIVE TELEMETRY STREAM \/\/ SUB-TICK VERIFIED/i),
    ).toBeDefined();
    expect(screen.getByText(/v2.4-PRO/i)).toBeDefined();
  });

  it('aciona onClose ao clicar no botão BACK TO 2D MAP, CLOSE [ESC], breadcrumb OVERVIEW, backdrop ou tecla ESC', () => {
    const handleClose = vi.fn();

    const { unmount } = render(
      <PlayerMatchInspectModal
        matchId="54e43847-2490-4751-9981-831bf7cf367c"
        steamId="76561198058500492"
        isOpen={true}
        onClose={handleClose}
      />,
    );

    // Clique no botão ciano
    const backBtn = screen.getByTestId('inspect-back-button');
    fireEvent.click(backBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Clique no botão close
    const closeBtn = screen.getByTestId('inspect-close-button');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);

    // Clique no breadcrumb OVERVIEW fecha o modal e redireciona para a rota da partida via router.push
    const overviewBreadcrumb = screen.getByTestId('inspect-breadcrumb-overview');
    fireEvent.click(overviewBreadcrumb);
    expect(handleClose).toHaveBeenCalledTimes(3);
    expect(mockPush).toHaveBeenCalledWith('/matches/54e43847-2490-4751-9981-831bf7cf367c');

    // Clique no breadcrumb 2D TACTICAL MAP
    const mapBreadcrumb = screen.getByTestId('inspect-breadcrumb-map');
    fireEvent.click(mapBreadcrumb);
    expect(handleClose).toHaveBeenCalledTimes(4);

    // Clique no backdrop
    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(5);

    // Tecla ESC
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(6);

    unmount();
  });

  it('renderiza cabeçalho dinâmico sem strings fixas e faz fallback para facção tática quando role for nula', () => {
    render(
      <PlayerMatchInspectModal
        matchId="match-dynamic-test"
        steamId="76561198999999999"
        isOpen={true}
        onClose={vi.fn()}
        playerInfo={{
          nickname: 'CUSTOM_PRO',
          team: 'FURIA',
          side: 'T',
          // role, realName e country propositalmente omitidos/nulos
        }}
      />,
    );

    // Deve exibir o nickname e time fornecidos
    expect(screen.getByText('CUSTOM_PRO')).toBeDefined();
    expect(screen.getByText(/INSPECTING: CUSTOM_PRO \(FURIA · T\)/i)).toBeDefined();

    // Como role é nula e side é T, exibe a facção tática T ATTACKER
    expect(screen.getByText('T ATTACKER')).toBeDefined();

    // Não deve conter strings fixas de protótipo
    expect(screen.queryByText('Aleksi Virolainen')).toBeNull();
    expect(screen.queryByText('TACTICAL SHOT-CALLER (IGL)')).toBeNull();
  });

  it('consome a foto do jogador dos assets locais (/players/[slug].png) e renderiza fallback tático de iniciais se a foto falhar ou for nula', () => {
    const { rerender } = render(
      <PlayerMatchInspectModal
        matchId="match-fallback-test"
        steamId="76561198000000099"
        isOpen={true}
        onClose={vi.fn()}
        playerInfo={{
          nickname: 'FalleN',
          team: 'FURIA',
          side: 'CT',
          avatarUrl: undefined,
        }}
      />,
    );

    // Deve resolver automaticamente a imagem local para /players/fallen.png
    const fallenImg = screen.getByAltText('FalleN') as HTMLImageElement;
    expect(fallenImg).toBeDefined();
    expect(fallenImg.getAttribute('src')).toBe('/players/fallen.png');

    // Ao disparar onError (caso o asset não exista localmente para aquele atleta), deve alternar para o fallback tático
    fireEvent.error(fallenImg);
    const fallbackBox = screen.getByTestId('player-avatar-fallback');
    expect(fallbackBox).toBeDefined();
    expect(screen.getByText('FA')).toBeDefined();

    // Se uma URL customizada for fornecida e disparar erro, também usa o fallback
    rerender(
      <PlayerMatchInspectModal
        matchId="match-fallback-test"
        steamId="76561198000000099"
        isOpen={true}
        onClose={vi.fn()}
        playerInfo={{
          nickname: 'KSCERATO',
          team: 'FURIA',
          side: 'T',
          avatarUrl: 'https://invalid-url.com/broken.jpg',
        }}
      />,
    );

    const ksceratoImg = screen.getByAltText('KSCERATO');
    fireEvent.error(ksceratoImg);

    expect(screen.getByTestId('player-avatar-fallback')).toBeDefined();
    expect(screen.getByText('KS')).toBeDefined();
  });

  it('filtra a tabela de micro-duelos ao selecionar abas do SegmentedFilter', () => {
    render(
      <PlayerMatchInspectModal
        matchId="54e43847-2490-4751-9981-831bf7cf367c"
        steamId="76561198058500492"
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    // Na aba inicial "All Duels", todos os duelos canônicos (4) devem ser renderizados sem limites rígidos de slice
    expect(screen.getByTestId('inspect-duel-row-12')).toBeDefined();
    expect(screen.getByTestId('inspect-duel-row-18')).toBeDefined();
    expect(screen.getByTestId('inspect-duel-row-21')).toBeDefined();
    expect(screen.getByTestId('inspect-duel-row-24')).toBeDefined();

    const openingTab = screen.getByRole('tab', { name: /Opening Duels/i });
    fireEvent.click(openingTab);

    // Deve filtrar e exibir duel do Round 18 (Opening Frag)
    expect(screen.getByTestId('inspect-duel-row-18')).toBeDefined();
    expect(screen.queryByTestId('inspect-duel-row-21')).toBeNull();

    const tradesTab = screen.getByRole('tab', { name: /Trades/i });
    fireEvent.click(tradesTab);

    // Deve filtrar e exibir duel do Round 21 (Trade Frag)
    expect(screen.getByTestId('inspect-duel-row-21')).toBeDefined();
    expect(screen.queryByTestId('inspect-duel-row-18')).toBeNull();
  });

  it('dispara requisição para GET /api/players/:steamid/match-inspect?matchId=... e consome dados retornados', async () => {
    const mockApiResponse = {
      matchId: '54e43847-2490-4751-9981-831bf7cf367c',
      steamid: '76561198058500492',
      player_advanced_stats: {
        match_id: '54e43847-2490-4751-9981-831bf7cf367c',
        steamid: '76561198058500492',
        hltv_rating: 1.45,
        adr: 98.7,
        kast: 85.0,
        impact: 1.62,
        hs_percent: 68.2,
        hit_head_pct: 71.5,
        hit_chest_pct: 20.0,
        hit_stomach_pct: 5.0,
        hit_limbs_pct: 3.5,
        reaction_time_ms: 165,
        headlock_offset: 2.8,
        first_5_bullets_pct: 94.0,
        prefire_pct: 89.0,
        score_opening: 88.0,
        score_trade: 75.0,
        score_utility: 48.0,
        score_flash: 60.0,
        score_clutch: 80.0,
        he_damage: 148,
      },
      match_duels: [
        {
          id: 'duel-api-1',
          match_id: '54e43847-2490-4751-9981-831bf7cf367c',
          round_number: 7,
          round_time: '01:05',
          winner_steamid: '76561198058500492',
          loser_steamid: '76561198000000009',
          winner_weapon: 'weapon_ak47',
          loser_weapon: 'weapon_m4a1_silencer',
          winner_hp_remaining: 85,
          map_zone: 'B Apartments',
          is_opening: true,
          is_trade: false,
          is_clutch: false,
          duel_tag: 'Entry Headshot',
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as any);

    render(
      <PlayerMatchInspectModal
        matchId="54e43847-2490-4751-9981-831bf7cf367c"
        steamId="76561198058500492"
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    expect(String(fetchSpy.mock.calls[0][0])).toContain(
      '/api/players/76561198058500492/match-inspect?matchId=54e43847-2490-4751-9981-831bf7cf367c',
    );

    await waitFor(() => {
      expect(screen.getByText('1.45')).toBeDefined();
      expect(screen.getByText('98.7')).toBeDefined();
      expect(screen.getByText('85.0%')).toBeDefined();
      expect(screen.getByText('71.5%')).toBeDefined();
      expect(screen.getByText('165ms')).toBeDefined();
      expect(screen.getByText('148 HP')).toBeDefined();
      expect(screen.getByText('Entry Headshot')).toBeDefined();
    });
  });

  it('integra clique na lista lateral TeamRosterSidebar para abrir inspeção do jogador selecionado', () => {
    const handleInspect = vi.fn();

    render(
      <TeamRosterSidebar
        roundNumber={1}
        playersManifest={SAMPLE_PLAYERS_MANIFEST}
        playerStates={SAMPLE_PLAYER_STATES}
        onInspectPlayer={handleInspect}
        selectedSteamId="76561198058500492"
      />,
    );

    // O jogador Aleksib deve ter estilo de seleção
    const aleksibRow = screen.getByTestId('roster-player-1');
    expect(aleksibRow.className).toContain('border-[#00E5FF]');

    // Clica no jogador b1t (id 2)
    const b1tRow = screen.getByTestId('roster-player-2');
    fireEvent.click(b1tRow);

    expect(handleInspect).toHaveBeenCalledTimes(1);
    expect(handleInspect).toHaveBeenCalledWith(
      '76561198000000002',
      expect.objectContaining({ name: 'b1t' }),
    );
  });

  it('integra Match Overview (PlayerStatsTable) tornando as linhas clicáveis e abrindo PlayerMatchInspectModal', async () => {
    const sampleStats: PlayerStatRow[] = [
      {
        steamId: '76561198058500492',
        nickname: 'Aleksib',
        team: 'NAVI',
        rating: 1.18,
        kills: 19,
        deaths: 17,
        assists: 5,
        adr: 78.4,
      },
      {
        steamId: '76561198000000009',
        nickname: 'ropz',
        team: 'FaZe',
        rating: 1.25,
        kills: 22,
        deaths: 16,
        assists: 4,
        adr: 85.2,
      },
    ];

    render(
      <PlayerStatsTable
        players={sampleStats}
        matchId="54e43847-2490-4751-9981-831bf7cf367c"
        team1Name="NAVI"
        team2Name="FaZe"
      />,
    );

    // Linha do jogador tem cursor-pointer e hover:bg-surface-elevated/40
    const aleksibRow = screen.getByTestId('player-row-76561198058500492');
    expect(aleksibRow.className).toContain('cursor-pointer');
    expect(aleksibRow.className).toContain('hover:bg-surface-elevated/40');

    // Inicialmente, o modal não está aberto
    expect(screen.queryByTestId('modal-backdrop')).toBeNull();

    // Clica na linha de Aleksib
    fireEvent.click(aleksibRow);

    // O modal deve ser montado exibindo a inspeção de Aleksib
    expect(screen.getByTestId('modal-backdrop')).toBeDefined();
    expect(screen.getByText(/INSPECTING: ALEKSIB/i)).toBeDefined();

    // Fecha o modal pelo botão BACK TO 2D MAP
    const backBtn = screen.getByTestId('inspect-back-button');
    fireEvent.click(backBtn);

    // O modal deve ser desmontado e o estado redefinido para null
    expect(screen.queryByTestId('modal-backdrop')).toBeNull();

    // Clica na linha de ropz da outra equipe
    const ropzRow = screen.getByTestId('player-row-76561198000000009');
    fireEvent.click(ropzRow);

    expect(screen.getByTestId('modal-backdrop')).toBeDefined();
    expect(screen.getByText(/INSPECTING: ROPZ/i)).toBeDefined();

    // Fecha com ESC
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('modal-backdrop')).toBeNull();
  });
});
