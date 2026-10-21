import type { TeamSide } from '../types/replay.ts';
import type { InterpolatedPlayerState, NukeLayer } from '../types/replayer-engine.ts';

export const RADAR_CANVAS_SIZE = 1024 as const;
export const PLAYER_MARKER_RADIUS = 12 as const;
export const PLAYER_AIM_LINE_LENGTH = 18 as const;
export const DEAD_PLAYER_OPACITY = 0.35 as const;
export const DIFFERENT_FLOOR_OPACITY = 0.25 as const;

export const TEAM_COLORS: Readonly<Record<TeamSide, string>> = Object.freeze({
  CT: '#3B82F6',
  T: '#EAB308',
});

export type BombRenderState = 'carried' | 'planting' | 'planted' | 'defusing';

export interface CanvasPoint {
  canvasX: number;
  canvasY: number;
}

export interface AimVectorEndpoint {
  endX: number;
  endY: number;
}

function cleanFloat(value: number): number {
  return Math.abs(value) < 1e-10 ? 0 : value;
}

/**
 * Converte coordenadas percentuais [0..100] do radar para pixels no espaço lógico [0..1024] do Canvas.
 */
export function percentToCanvasPixels(
  percentX: number,
  percentY: number,
  canvasSize: number = RADAR_CANVAS_SIZE,
): CanvasPoint {
  const canvasX = cleanFloat((percentX / 100) * canvasSize);
  const canvasY = cleanFloat((percentY / 100) * canvasSize);
  return { canvasX, canvasY };
}

/**
 * Calcula a extremidade do vetor de linha de visão (aim line) a partir do centro do marcador e do ângulo yaw.
 * - yaw = 0° aponta para Este / Direita (+X no Canvas)
 * - yaw = 90° aponta para Norte / Cima (-Y no Canvas, pois o eixo Y do Canvas cresce para baixo)
 */
export function calculateAimEndpoint(
  centerX: number,
  centerY: number,
  yawDegrees: number,
  length: number = PLAYER_AIM_LINE_LENGTH,
): AimVectorEndpoint {
  const radians = (yawDegrees * Math.PI) / 180;
  const dx = cleanFloat(Math.cos(radians) * length);
  const dy = cleanFloat(-Math.sin(radians) * length);

  return {
    endX: cleanFloat(centerX + dx),
    endY: cleanFloat(centerY + dy),
  };
}

/**
 * Camada 0 (Fundo): Limpa o contexto 1024x1024 e desenha a textura oficial do radar do mapa.
 */
export function drawRadarBackground(
  ctx: CanvasRenderingContext2D,
  mapImage: HTMLImageElement | null,
): void {
  ctx.clearRect(0, 0, RADAR_CANVAS_SIZE, RADAR_CANVAS_SIZE);

  if (mapImage && mapImage.complete && mapImage.naturalWidth > 0) {
    ctx.drawImage(mapImage, 0, 0, RADAR_CANVAS_SIZE, RADAR_CANVAS_SIZE);
    return;
  }

  ctx.save();
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, RADAR_CANVAS_SIZE, RADAR_CANVAS_SIZE);
  ctx.restore();
}

/**
 * Camada 1 (Utilitários): Desenha granadas ativas (Smokes semitransparentes com raio proporcional, Molly, HE, Flash).
 */
export function drawUtilityEvent(
  ctx: CanvasRenderingContext2D,
  type: string,
  x: number,
  y: number,
  radius: number,
): void {
  if (radius <= 0) return;

  const normalizedType = type.trim().toUpperCase();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);

  if (normalizedType === 'SMOKE') {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.75)';
  } else if (normalizedType === 'MOLLY' || normalizedType === 'INFERNO') {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.40)';
    ctx.strokeStyle = 'rgba(248, 113, 113, 0.85)';
  } else if (normalizedType === 'FLASH') {
    ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
  } else {
    ctx.fillStyle = 'rgba(251, 146, 60, 0.35)';
    ctx.strokeStyle = 'rgba(253, 186, 116, 0.80)';
  }

  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Camada 1 (C4): Desenha o marcador tático da bomba conforme seu estado ('carried' | 'planting' | 'planted' | 'defusing').
 */
export function drawBomb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  state: BombRenderState,
): void {
  ctx.save();

  const colorByState: Record<BombRenderState, string> = {
    carried: '#facc15',
    planting: '#EAB308',
    planted: '#ef4444',
    defusing: '#38bdf8',
  };

  const markerSize = state === 'planted' || state === 'defusing' ? 14 : 10;
  const half = markerSize / 2;

  ctx.fillStyle = colorByState[state];
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.rect(x - half, y - half, markerSize, markerSize);
  ctx.fill();
  ctx.stroke();

  if (state === 'planted' || state === 'defusing') {
    ctx.beginPath();
    ctx.arc(x, y, markerSize, 0, Math.PI * 2);
    ctx.strokeStyle = colorByState[state];
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Camadas 2 e 3 (Jogadores Vivos e Eliminados):
 * - Jogador vivo: círculo preenchido (raio 12px) em #3B82F6 (CT) ou #EAB308 (T),
 *   vetor de mira de 18px a partir do centro e número centralizado.
 * - Jogador em outro andar vertical (de_nuke com activeLayer diferente de player.currentFloor):
 *   opacidade reduzida para 0.25 e anel tracejado com indicador '▲' (acima) ou '▼' (abaixo).
 * - Jogador eliminado: opacidade reduzida (0.35) com marcador 'X' na última posição.
 */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: InterpolatedPlayerState,
  playerNumber: number,
  team: TeamSide,
  activeLayer?: NukeLayer,
): void {
  const { canvasX, canvasY } = percentToCanvasPixels(
    player.percentX,
    player.percentY,
  );
  const teamColor = TEAM_COLORS[team];

  ctx.save();

  // Verifica se o jogador está em outro pavimento (relevante para de_nuke)
  const isDifferentFloor =
    activeLayer !== undefined &&
    player.currentFloor !== 'default' &&
    player.currentFloor !== activeLayer;

  if (isDifferentFloor) {
    ctx.globalAlpha = DIFFERENT_FLOOR_OPACITY;
  }

  if (!player.isAlive) {
    if (!isDifferentFloor) {
      ctx.globalAlpha = DEAD_PLAYER_OPACITY;
    }
    ctx.strokeStyle = teamColor;
    ctx.fillStyle = teamColor;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.arc(canvasX, canvasY, PLAYER_MARKER_RADIUS * 0.75, 0, Math.PI * 2);
    ctx.stroke();

    const crossHalf = 6;
    ctx.beginPath();
    ctx.moveTo(canvasX - crossHalf, canvasY - crossHalf);
    ctx.lineTo(canvasX + crossHalf, canvasY + crossHalf);
    ctx.moveTo(canvasX + crossHalf, canvasY - crossHalf);
    ctx.lineTo(canvasX - crossHalf, canvasY + crossHalf);
    ctx.stroke();

    ctx.restore();
    return;
  }

  // Traço de linha de visão (yaw) projetado a partir do centro com 18px
  const { endX, endY } = calculateAimEndpoint(
    canvasX,
    canvasY,
    player.yaw,
    PLAYER_AIM_LINE_LENGTH,
  );

  ctx.beginPath();
  ctx.moveTo(canvasX, canvasY);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Círculo principal preenchido (raio 12px) ancorado no centro geométrico
  ctx.beginPath();
  ctx.arc(canvasX, canvasY, PLAYER_MARKER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = teamColor;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#090d16';
  ctx.stroke();

  // Se estiver em outro pavimento, desenha um anel tracejado e indicador de piso ▲ ou ▼
  if (isDifferentFloor) {
    ctx.beginPath();
    if (typeof ctx.setLineDash === 'function') {
      ctx.setLineDash([3, 3]);
    }
    ctx.arc(canvasX, canvasY, PLAYER_MARKER_RADIUS + 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (typeof ctx.setLineDash === 'function') {
      ctx.setLineDash([]);
    }

    // Seta indicativa: se o jogador está em 'upper' e a visão é 'lower', ele está acima (▲).
    // Se o jogador está em 'lower' e a visão é 'upper', ele está abaixo (▼).
    const floorIndicator = player.currentFloor === 'upper' ? '▲' : '▼';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(floorIndicator, canvasX, canvasY - PLAYER_MARKER_RADIUS - 4);
  }

  // Número do jogador no interior do círculo
  ctx.fillStyle = '#090d16';
  ctx.font = 'bold 11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(playerNumber), canvasX, canvasY);

  ctx.restore();
}
