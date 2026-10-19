import { describe, it, expect, vi } from 'vitest';
import {
  RADAR_CANVAS_SIZE,
  PLAYER_MARKER_RADIUS,
  PLAYER_AIM_LINE_LENGTH,
  DEAD_PLAYER_OPACITY,
  TEAM_COLORS,
  percentToCanvasPixels,
  calculateAimEndpoint,
  drawPlayer,
  drawUtilityEvent,
  drawBomb,
  drawRadarBackground,
} from '../src/utils/canvas-renderer.ts';
import type { InterpolatedPlayerState } from '../src/types/replayer-engine.ts';

function createMockContext2D() {
  const fillStyles: string[] = [];
  const strokeStyles: string[] = [];
  const alphas: number[] = [];

  let currentFillStyle = '#000000';
  let currentStrokeStyle = '#000000';
  let currentAlpha = 1;

  const ctx = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fill: vi.fn(() => {
      fillStyles.push(currentFillStyle);
    }),
    stroke: vi.fn(() => {
      strokeStyles.push(currentStrokeStyle);
    }),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    getLineDash: vi.fn(() => []),
    set fillStyle(val: string) {
      currentFillStyle = val;
    },
    get fillStyle() {
      return currentFillStyle;
    },
    set strokeStyle(val: string) {
      currentStrokeStyle = val;
    },
    get strokeStyle() {
      return currentStrokeStyle;
    },
    set globalAlpha(val: number) {
      currentAlpha = val;
      alphas.push(val);
    },
    get globalAlpha() {
      return currentAlpha;
    },
    lineWidth: 1,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
  };

  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    mocks: ctx,
    fillStyles,
    strokeStyles,
    alphas,
  };
}

function createSamplePlayer(
  overrides: Partial<InterpolatedPlayerState> = {},
): InterpolatedPlayerState {
  return {
    playerId: 1,
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
    ...overrides,
  };
}

describe('Canvas 2D Tactical Renderer (canvas-renderer)', () => {
  it('deve converter coordenadas percentuais [0..100] com exatidão para o espaço [0..1024] do Canvas', () => {
    expect(percentToCanvasPixels(0, 0)).toEqual({ canvasX: 0, canvasY: 0 });
    expect(percentToCanvasPixels(50, 50)).toEqual({
      canvasX: 512,
      canvasY: 512,
    });
    expect(percentToCanvasPixels(100, 100)).toEqual({
      canvasX: 1024,
      canvasY: 1024,
    });
    expect(percentToCanvasPixels(25, 75)).toEqual({
      canvasX: 256,
      canvasY: 768,
    });
  });

  it('deve calcular a ponta do vetor de orientação (18px) a partir do ângulo yaw (0° Este, 90° Norte, 180° Oeste, 270° Sul)', () => {
    const centerX = 512;
    const centerY = 512;

    // yaw 0° -> aponta para a direita / Este (+18 em X, 0 em Y)
    expect(calculateAimEndpoint(centerX, centerY, 0)).toEqual({
      endX: 512 + PLAYER_AIM_LINE_LENGTH,
      endY: 512,
    });

    // yaw 90° -> aponta para o Norte / cima no Canvas (0 em X, -18 em Y)
    expect(calculateAimEndpoint(centerX, centerY, 90)).toEqual({
      endX: 512,
      endY: 512 - PLAYER_AIM_LINE_LENGTH,
    });

    // yaw 180° -> aponta para o Oeste / esquerda (-18 em X, 0 em Y)
    expect(calculateAimEndpoint(centerX, centerY, 180)).toEqual({
      endX: 512 - PLAYER_AIM_LINE_LENGTH,
      endY: 512,
    });

    // yaw 270° -> aponta para o Sul / baixo no Canvas (0 em X, +18 em Y)
    expect(calculateAimEndpoint(centerX, centerY, 270)).toEqual({
      endX: 512,
      endY: 512 + PLAYER_AIM_LINE_LENGTH,
    });
  });

  it('deve aplicar raio de 12px, linha de visão de 18px e cores táticas exatas (#00d2d3 para CT e #ff9f43 para T)', () => {
    expect(PLAYER_MARKER_RADIUS).toBe(12);
    expect(PLAYER_AIM_LINE_LENGTH).toBe(18);
    expect(TEAM_COLORS.CT).toBe('#00d2d3');
    expect(TEAM_COLORS.T).toBe('#ff9f43');

    const ctRender = createMockContext2D();
    const ctPlayer = createSamplePlayer({ percentX: 50, percentY: 50, yaw: 0 });
    drawPlayer(ctRender.ctx, ctPlayer, 1, 'CT');

    expect(ctRender.mocks.arc).toHaveBeenCalledWith(
      512,
      512,
      12,
      0,
      Math.PI * 2,
    );
    expect(ctRender.mocks.moveTo).toHaveBeenCalledWith(512, 512);
    expect(ctRender.mocks.lineTo).toHaveBeenCalledWith(530, 512);
    expect(ctRender.fillStyles).toContain('#00d2d3');
    expect(ctRender.mocks.fillText).toHaveBeenCalledWith('1', 512, 512);

    const tRender = createMockContext2D();
    const tPlayer = createSamplePlayer({
      percentX: 25,
      percentY: 75,
      yaw: 90,
    });
    drawPlayer(tRender.ctx, tPlayer, 6, 'T');

    expect(tRender.mocks.arc).toHaveBeenCalledWith(
      256,
      768,
      12,
      0,
      Math.PI * 2,
    );
    expect(tRender.mocks.moveTo).toHaveBeenCalledWith(256, 768);
    expect(tRender.mocks.lineTo).toHaveBeenCalledWith(256, 750);
    expect(tRender.fillStyles).toContain('#ff9f43');
    expect(tRender.mocks.fillText).toHaveBeenCalledWith('6', 256, 768);
  });

  it('deve desenhar jogadores eliminados na Camada 3 com opacidade reduzida (0.35) e marcador X', () => {
    const deadRender = createMockContext2D();
    const deadPlayer = createSamplePlayer({
      percentX: 50,
      percentY: 50,
      isAlive: false,
    });

    drawPlayer(deadRender.ctx, deadPlayer, 3, 'CT');

    expect(deadRender.alphas).toContain(DEAD_PLAYER_OPACITY);
    expect(deadRender.strokeStyles).toContain('#00d2d3');
    expect(deadRender.mocks.fillText).not.toHaveBeenCalled();
  });

  it('deve desenhar jogador em pavimento diferente com opacidade reduzida para 0.25 e indicador de piso', () => {
    const diffFloorRender = createMockContext2D();
    const playerLower = createSamplePlayer({
      percentX: 50,
      percentY: 50,
      currentFloor: 'lower',
    });

    // Visão ativa no piso 'upper', jogador em 'lower' (diferente)
    drawPlayer(diffFloorRender.ctx, playerLower, 4, 'CT', 'upper');

    expect(diffFloorRender.alphas).toContain(0.25);
    // Deve desenhar indicador de piso '▼' indicando que está abaixo
    expect(diffFloorRender.mocks.fillText).toHaveBeenCalledWith('▼', 512, expect.any(Number));
  });

  it('deve desenhar fundo 1024x1024, utilitários (SMOKE) e marcador da C4 sem erros', () => {
    const scene = createMockContext2D();

    drawRadarBackground(scene.ctx, null);
    expect(scene.mocks.clearRect).toHaveBeenCalledWith(
      0,
      0,
      RADAR_CANVAS_SIZE,
      RADAR_CANVAS_SIZE,
    );

    drawUtilityEvent(scene.ctx, 'SMOKE', 400, 400, 28);
    expect(scene.mocks.arc).toHaveBeenCalledWith(400, 400, 28, 0, Math.PI * 2);

    drawBomb(scene.ctx, 600, 600, 'planted');
    expect(scene.mocks.rect).toHaveBeenCalled();
  });
});

