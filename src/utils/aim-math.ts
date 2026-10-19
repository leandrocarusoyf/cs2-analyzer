export type Vec3 = [number, number, number];

export const DEFAULT_TRADE_WINDOW_MS = 4000;
/** Limiar de estabilização: 34% da velocidade máxima da arma. */
export const COUNTER_STRAFE_SPEED_RATIO = 0.34;

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

function ticksToMs(ticks: number, tickrate: number): number {
  if (!Number.isFinite(tickrate) || tickrate <= 0) return 0;
  return ticks * (1000 / tickrate);
}

/**
 * Vetor diretor da visão (Source Engine): yaw 0° = +X, yaw 90° = +Y,
 * pitch positivo = olhando para baixo (-Z).
 */
export function viewDirectionFromAngles(yawDegrees: number, pitchDegrees: number): Vec3 {
  const yaw = yawDegrees * DEG_TO_RAD;
  const pitch = pitchDegrees * DEG_TO_RAD;
  const cosPitch = Math.cos(pitch);
  return [cosPitch * Math.cos(yaw), cosPitch * Math.sin(yaw), -Math.sin(pitch)];
}

/**
 * Ângulo (graus) entre o vetor de visão do atacante e o vetor olho -> cabeça do alvo.
 * Devolve 0 se o alvo coincidir com a posição do olho.
 */
export function calculatePreAimAngularError(
  attackerPos: Vec3,
  attackerYaw: number,
  attackerPitch: number,
  targetHeadPos: Vec3,
): number {
  const view = viewDirectionFromAngles(attackerYaw, attackerPitch);

  const dx = targetHeadPos[0] - attackerPos[0];
  const dy = targetHeadPos[1] - attackerPos[1];
  const dz = targetHeadPos[2] - attackerPos[2];
  const length = Math.hypot(dx, dy, dz);
  if (length === 0) return 0;

  const dot = view[0] * (dx / length) + view[1] * (dy / length) + view[2] * (dz / length);
  const clamped = Math.max(-1, Math.min(1, dot));
  return Math.acos(clamped) * RAD_TO_DEG;
}

/** TTD em ms. Se a ordem dos ticks estiver invertida, devolve 0. */
export function calculateTimeToDamage(
  firstSightTick: number,
  firstDamageTick: number,
  tickrate: number,
): number {
  return Math.max(0, ticksToMs(firstDamageTick - firstSightTick, tickrate));
}

/**
 * Tempo (ms) entre estabilizar abaixo de 34% da velocidade máxima e o tiro.
 * Negativo = tiro disparado antes de estabilizar (em movimento).
 */
export function calculateCounterStrafingDelta(
  stopVelocityTick: number,
  shotTick: number,
  tickrate: number,
): number {
  return ticksToMs(shotTick - stopVelocityTick, tickrate);
}

/** Vingança dentro da janela canônica (padrão 4000ms) após a morte do aliado. */
export function isTradeKill(
  victimDeathTick: number,
  revengeKillTick: number,
  tickrate: number,
  maxWindowMs = DEFAULT_TRADE_WINDOW_MS,
): boolean {
  const deltaTicks = revengeKillTick - victimDeathTick;
  if (deltaTicks < 0) return false;
  return ticksToMs(deltaTicks, tickrate) <= maxWindowMs;
}

