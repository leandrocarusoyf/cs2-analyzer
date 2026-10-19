import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { TeamRosterSidebar as TeamRosterPanel } from '../src/components/replay/TeamRosterSidebar.tsx';
import { RoundCarousel as TimelineControls, type RoundSummaryItem } from '../src/components/replay/RoundCarousel.tsx';
import { LiveKillfeed as KillFeed } from '../src/components/replay/LiveKillfeed.tsx';
import ReplayerPage from '../src/app/replayer/[id]/page.tsx';
import type { PlayerManifestEntry } from '../src/types/replay.ts';
import type { InterpolatedPlayerState } from '../src/types/replayer-engine.ts';

const SAMPLE_PLAYERS_MANIFEST: PlayerManifestEntry[] = [
  { id: 1, steamId: '76561198000000001', name: 'kscerato', initialTeam: 'CT' },
  { id: 2, steamId: '76561198000000002', name: 'yuurih', initialTeam: 'CT' },
  { id: 3, steamId: '76561198000000003', name: 'fallen', initialTeam: 'CT' },
  { id: 4, steamId: '76561198000000004', name: 'chelo', initialTeam: 'CT' },
  { id: 5, steamId: '76561198000000005', name: 'skullz', initialTeam: 'CT' },
  { id: 6, steamId: '76561198000000006', name: 'b1t', initialTeam: 'T' },
  { id: 7, steamId: '76561198000000007', name: 'jL', initialTeam: 'T' },
  { id: 8, steamId: '76561198000000008', name: 'Aleksib', initialTeam: 'T' },
  { id: 9, steamId: '76561198000000009', name: 'iM', initialTeam: 'T' },
  { id: 10, steamId: '76561198000000010', name: 'w0nderful', initialTeam: 'T' },
];

const SAMPLE_PLAYER_STATES: InterpolatedPlayerState[] =
  SAMPLE_PLAYERS_MANIFEST.map((p) => ({
    playerId: p.id,
    percentX: 50,
    percentY: 50,
    worldZ: 0,
    currentFloor: 'default',
    yaw: 0,
    hp: 100,
    armor: 100,
    hasHelmet: true,
    isAlive: true,
    activeWeaponId: 7,
    isDefusing: false,
    isPlanting: false,
    flashDuration: 0,
    ping: 15,
  }));

describe('Replayer Tactical UI (TeamRosterPanel, TimelineControls, KillFeed)', () => {
  afterEach(() => {
    cleanup();
  });

  it('deve posicionar a equipe CT no bloco superior no round 5 e inverter para o bloco inferior no round 14 (regra MR12)', () => {
    const { rerender } = render(
      <TeamRosterPanel
        roundNumber={5}
        playersManifest={SAMPLE_PLAYERS_MANIFEST}
        playerStates={SAMPLE_PLAYER_STATES}
      />,
    );

    const topBlockRound5 = screen.getByTestId('roster-block-top');
    const bottomBlockRound5 = screen.getByTestId('roster-block-bottom');

    expect(topBlockRound5.getAttribute('data-team-side')).toBe('CT');
    expect(bottomBlockRound5.getAttribute('data-team-side')).toBe('T');
    expect(topBlockRound5.textContent).toContain('Equipe CT');
    expect(bottomBlockRound5.textContent).toContain('Equipe T');

    rerender(
      <TeamRosterPanel
        roundNumber={14}
        playersManifest={SAMPLE_PLAYERS_MANIFEST}
        playerStates={SAMPLE_PLAYER_STATES}
      />,
    );

    const topBlockRound14 = screen.getByTestId('roster-block-top');
    const bottomBlockRound14 = screen.getByTestId('roster-block-bottom');

    expect(topBlockRound14.getAttribute('data-team-side')).toBe('T');
    expect(bottomBlockRound14.getAttribute('data-team-side')).toBe('CT');
    expect(topBlockRound14.textContent).toContain('Equipe T');
    expect(bottomBlockRound14.textContent).toContain('Equipe CT');
  });

  it('deve renderizar os botões de round com as cores temáticas do lado vencedor (#2563EB para CT e #EA580C para TR)', () => {
    const rounds: RoundSummaryItem[] = [
      {
        roundNumber: 1,
        startTick: 1000,
        endTick: 2000,
        winnerSide: 'CT',
        events: {
          damages: [],
          kills: [[1400, 1, 6, 16, true, false]],
          utility: [],
          bomb: [[1600, 'bomb_planted', 7, 500, 500]],
        },
      },
      {
        roundNumber: 2,
        startTick: 2000,
        endTick: 3000,
        winnerSide: 'T',
        events: {
          damages: [],
          kills: [],
          utility: [],
          bomb: [],
        },
      },
    ];

    const onSelectRound = vi.fn();

    render(
      <TimelineControls
        rounds={rounds}
        currentRoundIndex={0}
        currentTick={1500}
        isPlaying={false}
        playbackSpeed={1}
        onTogglePlay={vi.fn()}
        onSeekToTick={vi.fn()}
        onSelectRound={onSelectRound}
        onSelectSpeed={vi.fn()}
      />,
    );

    const round1Btn = screen.getByTestId('round-btn-1');
    const round2Btn = screen.getByTestId('round-btn-2');

    expect(round1Btn.getAttribute('data-winner-side')).toBe('CT');
    expect(round1Btn.getAttribute('data-winner-color')).toBe('#2563EB');
    expect(round1Btn.getAttribute('data-active')).toBe('true');

    expect(round2Btn.getAttribute('data-winner-side')).toBe('T');
    expect(round2Btn.getAttribute('data-winner-color')).toBe('#EA580C');
    expect(round2Btn.getAttribute('data-active')).toBe('false');

    fireEvent.click(round2Btn);
    expect(onSelectRound).toHaveBeenCalledWith(1);
  });

  it('deve sincronizar o KillFeed exibindo apenas eliminações até o currentTick', () => {
    const kills: Array<[number, number, number, number, boolean, boolean]> = [
      [1200, 1, 6, 16, true, false],
      [1800, 7, 2, 7, false, true],
    ];

    const { rerender } = render(
      <KillFeed
        kills={kills}
        currentTick={1500}
        roundNumber={1}
        playersManifest={SAMPLE_PLAYERS_MANIFEST}
      />,
    );

    const entriesAt1500 = screen.getAllByTestId('kill-feed-entry');
    expect(entriesAt1500).toHaveLength(1);
    expect(entriesAt1500[0].textContent).toContain('kscerato');
    expect(entriesAt1500[0].textContent).toContain('b1t');

    rerender(
      <KillFeed
        kills={kills}
        currentTick={1900}
        roundNumber={1}
        playersManifest={SAMPLE_PLAYERS_MANIFEST}
      />,
    );

    const entriesAt1900 = screen.getAllByTestId('kill-feed-entry');
    expect(entriesAt1900).toHaveLength(2);
  });

  it('deve renderizar ícones SVG oficiais para armas, armadura/capacete e defuser kit no TeamRosterPanel', () => {
    render(
      <TeamRosterPanel
        roundNumber={1}
        playersManifest={SAMPLE_PLAYERS_MANIFEST}
        playerStates={SAMPLE_PLAYER_STATES}
      />,
    );

    // Deve renderizar ícones de arma para os jogadores
    const weaponIcons = screen.getAllByTestId('weapon-icon');
    expect(weaponIcons.length).toBeGreaterThanOrEqual(10);
    expect(weaponIcons[0].getAttribute('src')).toBe('/icons/icon-ak47.svg');

    // Deve renderizar ícone de armor/helmet (jogadores com armor=100 e hasHelmet=true)
    const armorIcons = screen.getAllByTestId('armor-icon');
    expect(armorIcons.length).toBe(10);
    expect(armorIcons[0].getAttribute('src')).toBe('/icons/icon-armor-helmet.svg');

    // Deve renderizar ícones de defuser kit apenas para a equipe CT (5 jogadores)
    const defuserIcons = screen.getAllByTestId('defuser-icon');
    expect(defuserIcons).toHaveLength(5);
    expect(defuserIcons[0].getAttribute('src')).toBe('/icons/icon-defuser.svg');
  });

  it('deve exibir indicador de carregamento tático enquanto a requisição de telemetria estiver em andamento (isLoading)', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}) as any);

    await act(async () => {
      render(
        <React.Suspense fallback={null}>
          <ReplayerPage params={Promise.resolve({ id: 'furia-vs-aurora' })} />
        </React.Suspense>,
      );
    });

    const loadingIndicator = screen.getByTestId('replayer-loading-indicator');
    expect(loadingIndicator).toBeTruthy();
    expect(loadingIndicator.textContent).toContain('CARREGANDO TELEMETRIA DA PARTIDA...');
    expect(loadingIndicator.textContent).toContain('Descompactando .bin.gz');

    fetchSpy.mockRestore();
  });

  it('deve renderizar o layout do replayer sem crash para a partida canônica 54e43847-2490-4751-9981-831bf7cf367c', async () => {
    await act(async () => {
      render(
        <React.Suspense fallback={null}>
          <ReplayerPage
            params={Promise.resolve({ id: '54e43847-2490-4751-9981-831bf7cf367c' })}
          />
        </React.Suspense>,
      );
    });

    const heading = screen.getByRole('heading', {
      name: /Partida #54e43847-2490-4751-9981-831bf7cf367c/i,
    });
    expect(heading).toBeTruthy();
    expect(screen.getByTestId('kill-feed')).toBeTruthy();
    expect(screen.getByTestId('radar-canvas')).toBeTruthy();
    expect(screen.getByTestId('roster-block-top')).toBeTruthy();
    expect(screen.getByTestId('telestrator-canvas')).toBeTruthy();
    expect(screen.getByTestId('telestrator-toolbar')).toBeTruthy();
  });

  it('deve validar projeção Source 2 -> 2D, slerp angular sem flip 360° e descompressão gzip em chunks', async () => {
    const { worldToRadarUV, worldRadiusToCanvasPixels, isBelowSplitZ } = await import(
      '../src/lib/replay/coordinates.ts'
    );
    const { slerpYaw, lerp, computeInterpolationAlpha } = await import(
      '../src/lib/replay/interpolation.ts'
    );
    const { decompressGzipChunksToText } = await import(
      '../src/lib/replay/decompress.ts'
    );
    const zlib = await import('node:zlib');

    // Projeção Source 2 (de_inferno: posX=-2087, posY=3870, scale=4.9)
    const uv = worldToRadarUV(-2087 + 490, 3870 - 980, 'de_inferno');
    expect(uv.u).toBeCloseTo(100, 3);
    expect(uv.v).toBeCloseTo(200, 3);

    // Smoke 144 unidades mundiais em de_inferno (~29.39px)
    const smokePx = worldRadiusToCanvasPixels(144, 'de_inferno');
    expect(smokePx).toBeCloseTo(144 / 4.9, 2);

    // Eixo Z multi-piso (de_nuke splitZ = -480)
    expect(isBelowSplitZ(-520, 'de_nuke')).toBe(true);
    expect(isBelowSplitZ(-300, 'de_nuke')).toBe(false);

    // Interpolação slerpYaw na fronteira 350° -> 10° (caminho curto de +20° -> 0° em alpha=0.5)
    expect(computeInterpolationAlpha(150, 100, 200)).toBe(0.5);
    expect(lerp(100, 200, 0.5)).toBe(150);
    expect(slerpYaw(350, 10, 0.5)).toBeCloseTo(0, 3);
    expect(slerpYaw(170, -170, 0.5)).toBeCloseTo(180, 3);

    // Descompressão gzip via pako/DecompressionStream
    const sampleJson = JSON.stringify({ mapName: 'de_inferno', tickrate: 64 });
    const compressed = new Uint8Array(zlib.gzipSync(Buffer.from(sampleJson, 'utf8')));
    const decompressedText = await decompressGzipChunksToText(compressed);
    expect(JSON.parse(decompressedText)).toEqual({
      mapName: 'de_inferno',
      tickrate: 64,
    });
  });

  it('deve permitir alternar ferramentas no TelestratorLayer e acionar velocidades 0.25x a 4x', async () => {
    await act(async () => {
      render(
        <React.Suspense fallback={null}>
          <ReplayerPage
            params={Promise.resolve({ id: '54e43847-2490-4751-9981-831bf7cf367c' })}
          />
        </React.Suspense>,
      );
    });

    const penBtn = screen.getByTestId('telestrator-tool-pen');
    const arrowBtn = screen.getByTestId('telestrator-tool-arrow');
    const zoneBtn = screen.getByTestId('telestrator-tool-zone');
    const fadeBtn = screen.getByTestId('telestrator-auto-fade');

    fireEvent.click(penBtn);
    fireEvent.click(arrowBtn);
    fireEvent.click(zoneBtn);
    fireEvent.click(fadeBtn);

    expect(screen.getByTestId('speed-btn-0.25')).toBeTruthy();
    expect(screen.getByTestId('speed-btn-0.5')).toBeTruthy();
    expect(screen.getByTestId('speed-btn-1')).toBeTruthy();
    expect(screen.getByTestId('speed-btn-2')).toBeTruthy();
    expect(screen.getByTestId('speed-btn-4')).toBeTruthy();
  });
});


