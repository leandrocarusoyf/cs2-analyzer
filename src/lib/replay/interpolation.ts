import type {
  CS2Map,
  CompactPlayerTuple,
  RawFrame,
  RawPlayerFrame,
  TacticalSnapshotFrame,
} from '../../types/replay.ts';
import type { InterpolatedPlayerState, PlayerFloor } from '../../types/replayer-engine.ts';
import { resolveFloorLayer, worldToRadarUV } from './coordinates.ts';
import { RADAR_SIZE } from './constants.ts';

export const NUKE_VERTICAL_THRESHOLD_Z = -495;

export function classifyPlayerFloor(worldZ: number, map: CS2Map | string): PlayerFloor {
  if (map === 'de_nuke') {
    return worldZ < NUKE_VERTICAL_THRESHOLD_Z ? 'lower' : 'upper';
  }
  return 'default';
}

export interface TacticalInterpolatedPlayer extends InterpolatedPlayerState {
  id: number;
  playerId: number;
  x: number;
  y: number;
  z: number;
  u: number;
  v: number;
  xWorld: number;
  yWorld: number;
  zWorld: number;
  pitch: number;
  isFlashed: boolean;
  activeWeapon: string;
  hasC4: boolean;
  hasDefuser: boolean;
  money: number;
}

function cleanZero(val: number): number {
  return Object.is(val, -0) || Math.abs(val) < 1e-10 ? 0 : val;
}

export function computeInterpolationAlpha(
  currentTick: number,
  tickK: number,
  tickKNext: number,
): number {
  const span = tickKNext - tickK;
  if (span <= 0) return 0;
  const raw = (currentTick - tickK) / span;
  return cleanZero(Math.max(0, Math.min(1, raw)));
}

export function lerp(xK: number, xKNext: number, alpha: number): number {
  const clamped = Math.max(0, Math.min(1, alpha));
  return cleanZero(xK + clamped * (xKNext - xK));
}

export function slerpYaw(
  thetaK: number,
  thetaKNext: number,
  alpha: number,
): number {
  const clamped = Math.max(0, Math.min(1, alpha));
  const normK = ((thetaK % 360) + 360) % 360;
  const normNext = ((thetaKNext % 360) + 360) % 360;
  const deltaTheta = ((((normNext - normK + 540) % 360) + 360) % 360) - 180;
  const theta = (((normK + clamped * deltaTheta) % 360) + 360) % 360;
  return cleanZero(theta);
}

export const lerpAngleDegrees = slerpYaw;

export function normalizePlayerState(p: any): {
  id: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  hp: number;
  armor: number;
  hasHelmet: boolean;
  isAlive: boolean;
  isDefusing: boolean;
  isPlanting: boolean;
  activeWeapon: string;
  activeWeaponId: number;
  hasC4: boolean;
  hasDefuser: boolean;
  money: number;
  flashDuration: number;
} {
  if (Array.isArray(p)) {
    if (p.length >= 17) {
      return {
        id: Number(p[0] ?? 0),
        x: Number(p[1] ?? 0),
        y: Number(p[2] ?? 0),
        z: Number(p[3] ?? 0),
        yaw: Number(p[4] ?? 0),
        pitch: Number(p[5] ?? 0),
        hp: Number(p[6] ?? 100),
        armor: Number(p[7] ?? 100),
        hasHelmet: Boolean(p[8]),
        isAlive: Boolean(p[9]),
        isDefusing: Boolean(p[11]),
        isPlanting: Boolean(p[12]),
        activeWeapon: String(p[13] || 'weapon_ak47'),
        activeWeaponId: 7,
        hasC4: Boolean(p[14]),
        hasDefuser: Boolean(p[15]),
        money: Number(p[16] ?? 800),
        flashDuration: p[10] ? 2.0 : 0,
      };
    }
    // Tupla de 14 itens: [0:id, 1:x, 2:y, 3:z, 4:yaw, 5:hp, 6:armor, 7:helmet, 8:alive, 9:defusing, 10:planting, 11:weaponId, 12:flash, 13:ping]
    return {
      id: Number(p[0] || 0),
      x: Number(p[1] ?? 0),
      y: Number(p[2] ?? 0),
      z: Number(p[3] ?? 0),
      yaw: Number(p[4] ?? 0),
      pitch: 0,
      hp: Number(p[5] ?? 100),
      armor: Number(p[6] ?? 100),
      hasHelmet: Boolean(p[7]),
      isAlive: Boolean(p[8]),
      isDefusing: Boolean(p[9]),
      isPlanting: Boolean(p[10]),
      activeWeapon: `weapon_${p[11] || 7}`,
      activeWeaponId: Number(p[11] || 7),
      hasC4: Boolean(p[10]),
      hasDefuser: Number(p[0]) <= 5,
      money: 800,
      flashDuration: Number(p[12] || 0),
    };
  }

  // Objeto estruturado
  const id = Number(p.id ?? p.playerId ?? 0);
  const hp = Number(p.hp ?? p.health ?? (p.isAlive === false || p.is_alive === false ? 0 : 100));
  const isAlive =
    p.isAlive !== undefined
      ? Boolean(p.isAlive)
      : p.is_alive !== undefined
      ? Boolean(p.is_alive)
      : hp > 0;

  return {
    id,
    x: Number(p.x ?? p.X ?? 0),
    y: Number(p.y ?? p.Y ?? 0),
    z: Number(p.z ?? p.Z ?? -200),
    yaw: Number(p.yaw ?? p.ang_yaw ?? 0),
    pitch: Number(p.pitch ?? p.ang_pitch ?? 0),
    hp,
    armor: Number(p.armor ?? p.armor_value ?? 100),
    hasHelmet: Boolean(p.hasHelmet ?? p.has_helmet),
    isAlive,
    isDefusing: Boolean(p.isDefusing ?? p.is_defusing),
    isPlanting: Boolean(p.isPlanting ?? p.is_planting),
    activeWeapon: String(p.activeWeapon ?? p.active_weapon_name ?? 'weapon_ak47'),
    activeWeaponId: Number(p.activeWeaponId ?? p.weaponId ?? 7),
    hasC4: Boolean(p.hasC4 ?? p.isPlanting),
    hasDefuser: Boolean(p.hasDefuser ?? (id <= 5)),
    money: Number(p.money ?? 800),
    flashDuration: Number(p.flashDuration ?? p.flash_duration ?? 0),
  };
}

export function interpolateTacticalPlayer(
  prevRaw: any,
  nextRaw: any,
  alpha: number,
  mapName: string = 'de_inferno',
): TacticalInterpolatedPlayer {
  const pA = normalizePlayerState(prevRaw);
  const pB = normalizePlayerState(nextRaw);
  const t = Math.max(0, Math.min(1, alpha));

  const x = lerp(pA.x, pB.x, t);
  const y = lerp(pA.y, pB.y, t);
  const z = lerp(pA.z, pB.z, t);
  const yaw = slerpYaw(pA.yaw, pB.yaw, t);
  const pitch = lerp(pA.pitch, pB.pitch, t);

  const { u, v } = worldToRadarUV(x, y, mapName);
  const percentX = cleanZero((u / RADAR_SIZE) * 100);
  const percentY = cleanZero((v / RADAR_SIZE) * 100);
  const currentFloor = resolveFloorLayer(z, mapName);

  const current = t < 0.5 ? pA : pB;

  return {
    id: current.id,
    playerId: current.id,
    x,
    y,
    z,
    xWorld: x,
    yWorld: y,
    zWorld: z,
    worldZ: z,
    u,
    v,
    percentX,
    percentY,
    yaw,
    pitch,
    hp: current.hp,
    armor: current.armor,
    hasHelmet: current.hasHelmet,
    isAlive: current.isAlive,
    isDefusing: current.isDefusing,
    isPlanting: current.isPlanting,
    activeWeapon: current.activeWeapon,
    activeWeaponId: current.activeWeaponId,
    hasC4: current.hasC4,
    hasDefuser: current.hasDefuser,
    money: current.money,
    flashDuration: lerp(pA.flashDuration, pB.flashDuration, t),
    isFlashed: current.flashDuration > 0.1,
    currentFloor,
    ping: 15,
  };
}

export function interpolatePlayerFrames(
  prevPlayer: RawPlayerFrame | Record<string, any>,
  nextPlayer: RawPlayerFrame | Record<string, any>,
  t: number,
  map: CS2Map | string = 'de_mirage',
): TacticalInterpolatedPlayer {
  return interpolateTacticalPlayer(prevPlayer, nextPlayer, t, String(map));
}

export function interpolateSnapshotFrames(
  frames: ReadonlyArray<RawFrame | TacticalSnapshotFrame> | undefined | null,
  currentTick: number,
  mapName: CS2Map | string,
): TacticalInterpolatedPlayer[] {
  if (!frames || frames.length === 0) return [];

  const getTick = (f: any): number => Number(Array.isArray(f) ? f[0] : f.tick ?? 0);
  const getPlayers = (f: any): any[] =>
    Array.isArray(f) ? (Array.isArray(f[1]) ? f[1] : []) : f.players || [];

  const firstTick = getTick(frames[0]);
  if (frames.length === 1 || currentTick <= firstTick) {
    return getPlayers(frames[0]).map((p) =>
      interpolateTacticalPlayer(p, p, 0, String(mapName)),
    );
  }

  const lastIdx = frames.length - 1;
  const lastTick = getTick(frames[lastIdx]);
  if (currentTick >= lastTick) {
    return getPlayers(frames[lastIdx]).map((p) =>
      interpolateTacticalPlayer(p, p, 1, String(mapName)),
    );
  }

  let low = 0;
  let high = lastIdx - 1;
  let kIdx = 0;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const tMid = getTick(frames[mid]);
    const tNext = getTick(frames[mid + 1]);

    if (currentTick >= tMid && currentTick <= tNext) {
      kIdx = mid;
      break;
    } else if (currentTick < tMid) {
      high = mid - 1;
    } else {
      kIdx = mid;
      low = mid + 1;
    }
  }

  const frameK = frames[kIdx];
  const frameNext = frames[Math.min(lastIdx, kIdx + 1)];
  const alpha = computeInterpolationAlpha(currentTick, getTick(frameK), getTick(frameNext));

  const nextPlayers = getPlayers(frameNext);
  const nextById = new Map<number, any>();
  for (const np of nextPlayers) {
    const pid = Number(Array.isArray(np) ? np[0] : np.id ?? np.playerId ?? 0);
    if (pid > 0) nextById.set(pid, np);
  }

  return getPlayers(frameK).map((prevP) => {
    const pid = Number(Array.isArray(prevP) ? prevP[0] : prevP.id ?? prevP.playerId ?? 0);
    const nextP = nextById.get(pid) ?? prevP;
    return interpolateTacticalPlayer(prevP, nextP, alpha, String(mapName));
  });
}