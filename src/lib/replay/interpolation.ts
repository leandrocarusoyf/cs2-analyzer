import { Frame, PlayerMetadata, PlayerState, RawPlayerFrame } from '../../types/replay';
import { decompressFrame } from './decompress';
import { worldToRadarPercent } from './coordinates';

export const NUKE_VERTICAL_THRESHOLD_Z = -495;

export function lerp(a: number, b: number, t: number): number {
  const clampedT = Math.max(0, Math.min(1, t));
  return a + (b - a) * clampedT;
}

export function computeInterpolationAlpha(
  currentTick: number,
  startTick: number,
  endTick: number
): number {
  if (endTick === startTick) return 0;
  return Math.max(0, Math.min(1, (currentTick - startTick) / (endTick - startTick)));
}

export function lerpAngleDegrees(angleA: number, angleB: number, t: number): number {
  const clampedT = Math.max(0, Math.min(1, t));
  let diff = (angleB - angleA) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  let res = (angleA + diff * clampedT) % 360;
  if (res < 0) res += 360;
  return res;
}

export const slerpYaw = lerpAngleDegrees;
export const lerpDegrees = lerpAngleDegrees;

export function lerpPitch(pitchA: number, pitchB: number, t: number): number {
  const p = lerp(pitchA, pitchB, t);
  return Math.max(-89, Math.min(89, p));
}

export function classifyPlayerFloor(
  z: number,
  map: string
): 'upper' | 'lower' | 'default' {
  if (map === 'de_nuke') {
    return z >= NUKE_VERTICAL_THRESHOLD_Z ? 'upper' : 'lower';
  }
  return 'default';
}

export function interpolatePlayerFrames(
  prev: RawPlayerFrame,
  next: RawPlayerFrame,
  t: number,
  map: string
) {
  const clampedT = Math.max(0, Math.min(1, t));
  const worldX = lerp(prev[1], next[1], clampedT);
  const worldY = lerp(prev[2], next[2], clampedT);
  const worldZ = lerp(prev[3], next[3], clampedT);
  const yaw = lerpAngleDegrees(prev[4], next[4], clampedT);

  const { percentX, percentY } = worldToRadarPercent(worldX, worldY, map);
  const currentFloor = classifyPlayerFloor(worldZ, map);

  const chooseNext = clampedT >= 0.5;
  const hp = chooseNext ? next[5] : prev[5];
  const armor = chooseNext ? next[6] : prev[6];
  const isAlive = Boolean(chooseNext ? next[8] : prev[8]);
  const isDefusing = Boolean(chooseNext ? next[9] : prev[9]);
  const isPlanting = Boolean(chooseNext ? next[10] : prev[10]);
  const activeWeaponId = chooseNext ? next[11] : prev[11];
  const flashDuration = lerp(prev[12] ?? 0, next[12] ?? 0, clampedT);
  const ping = chooseNext ? next[13] : prev[13];

  return {
    playerId: prev[0],
    worldX,
    worldY,
    worldZ,
    percentX,
    percentY,
    yaw,
    currentFloor,
    hp,
    armor,
    isAlive,
    isDefusing,
    isPlanting,
    activeWeaponId,
    flashDuration,
    ping,
  };
}

export function findSurroundingFrames(
  frames: any[],
  targetTick: number
): { prev: any | null; next: any | null; index: number } {
  const len = frames.length;
  if (len === 0) return { prev: null, next: null, index: -1 };

  const getTick = (f: any): number => {
    if (!f) return 0;
    return Array.isArray(f) ? Number(f[0]) : Number(f.tick);
  };

  if (targetTick <= getTick(frames[0])) {
    return { prev: frames[0], next: frames[0], index: 0 };
  }

  if (targetTick >= getTick(frames[len - 1])) {
    return { prev: frames[len - 1], next: frames[len - 1], index: len - 1 };
  }

  let low = 0;
  let high = len - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midTick = getTick(frames[mid]);

    if (midTick === targetTick) {
      return { prev: frames[mid], next: frames[mid], index: mid };
    }

    if (midTick < targetTick) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const prevIdx = Math.max(0, high);
  const nextIdx = Math.min(len - 1, low);

  return {
    prev: frames[prevIdx],
    next: frames[nextIdx],
    index: prevIdx,
  };
}

export function getInterpolatedPlayers(
  rawFrames: any[],
  targetTick: number,
  playerMetaMap?: Record<string, PlayerMetadata>
): PlayerState[] {
  if (!rawFrames || rawFrames.length === 0) {
    return [];
  }

  const { prev: rawPrev, next: rawNext } = findSurroundingFrames(rawFrames, targetTick);
  if (!rawPrev) return [];

  const prevFrame: Frame = decompressFrame(rawPrev, playerMetaMap);

  if (!rawNext || rawPrev === rawNext) {
    return prevFrame.players;
  }

  const nextFrame: Frame = decompressFrame(rawNext, playerMetaMap);

  const prevTick = prevFrame.tick;
  const nextTick = nextFrame.tick;

  if (nextTick === prevTick || prevFrame.players.length === 0) {
    return prevFrame.players.length > 0 ? prevFrame.players : nextFrame.players;
  }

  const t = Math.max(0, Math.min(1, (targetTick - prevTick) / (nextTick - prevTick)));

  const nextPlayerMap = new Map<string, PlayerState>();
  for (const np of nextFrame.players) {
    nextPlayerMap.set(String(np.id), np);
  }

  const result: PlayerState[] = [];
  const processedIds = new Set<string>();

  for (const pA of prevFrame.players) {
    const pId = String(pA.id);
    processedIds.add(pId);
    const pB = nextPlayerMap.get(pId);

    if (!pB) {
      result.push(pA);
      continue;
    }

    // Interpolação vetorial de velocidade
    const vx = lerp(pA.velocity?.x ?? 0, pB.velocity?.x ?? 0, t);
    const vy = lerp(pA.velocity?.y ?? 0, pB.velocity?.y ?? 0, t);
    const vz = lerp(pA.velocity?.z ?? 0, pB.velocity?.z ?? 0, t);
    const speed2D = Math.hypot(vx, vy);

    // Decaimento linear proporcional ao delta de ticks decorridos
    const flashDuration = Math.max(0, lerp(pA.flashDuration ?? 0, pB.flashDuration ?? 0, t));

    // Flags discretas: mantidas pelo frame mais recente (t >= 0.5 ? next : prev)
    const isScoped = t >= 0.5 ? pB.isScoped : pA.isScoped;
    const isCrouching = t >= 0.5 ? pB.isCrouching : pA.isCrouching;
    const isAirborne = t >= 0.5 ? pB.isAirborne : pA.isAirborne;
    const isDefusing = t >= 0.5 ? pB.isDefusing : pA.isDefusing;

    if (pA.isAlive && pB.isAlive) {
      result.push({
        ...pA,
        x: lerp(pA.x, pB.x, t),
        y: lerp(pA.y, pB.y, t),
        z: lerp(pA.z, pB.z, t),
        yaw: lerpAngleDegrees(pA.yaw, pB.yaw, t),
        pitch: lerpPitch(pA.pitch ?? 0, pB.pitch ?? 0, t),
        velocity: { x: vx, y: vy, z: vz, speed2D },
        hp: t < 0.5 ? pA.hp : pB.hp,
        armor: t < 0.5 ? pA.armor : pB.armor,
        hasHelmet: t < 0.5 ? pA.hasHelmet : pB.hasHelmet,
        hasDefuser: t < 0.5 ? pA.hasDefuser : pB.hasDefuser,
        isAlive: true,
        activeWeapon: t < 0.5 ? pA.activeWeapon : pB.activeWeapon,
        money: t < 0.5 ? pA.money : pB.money,
        isScoped,
        isCrouching,
        isAirborne,
        isDefusing,
        flashDuration,
      });
    } else if (pA.isAlive && !pB.isAlive) {
      const died = t >= 0.5;
      result.push({
        ...(died ? pB : pA),
        x: lerp(pA.x, pB.x, t),
        y: lerp(pA.y, pB.y, t),
        z: lerp(pA.z, pB.z, t),
        yaw: lerpAngleDegrees(pA.yaw, pB.yaw, t),
        pitch: lerpPitch(pA.pitch ?? 0, pB.pitch ?? 0, t),
        velocity: { x: vx, y: vy, z: vz, speed2D },
        isAlive: !died,
        hp: died ? 0 : pA.hp,
        isScoped: died ? false : isScoped,
        isCrouching,
        isAirborne,
        isDefusing: died ? false : isDefusing,
        flashDuration: died ? 0 : flashDuration,
      });
    } else {
      result.push({
        ...pB,
        velocity: { x: vx, y: vy, z: vz, speed2D },
        flashDuration,
      });
    }
  }

  for (const pB of nextFrame.players) {
    const pId = String(pB.id);
    if (!processedIds.has(pId)) {
      result.push(pB);
    }
  }

  return result;
}

export function interpolateSnapshotFrames(
  frames: any[] | undefined | null,
  currentTick: number,
  mapName?: string,
  playerMetaMap?: Record<string, PlayerMetadata>
): PlayerState[] {
  if (!frames || frames.length === 0) return [];
  return getInterpolatedPlayers(frames, currentTick, playerMetaMap);
}

