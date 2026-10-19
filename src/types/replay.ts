export type CS2Map =
  | 'de_mirage'
  | 'de_inferno'
  | 'de_dust2'
  | 'de_nuke'
  | 'de_ancient'
  | 'de_anubis'
  | 'de_cache';

export type BinaryFlag = 0 | 1;

export type TeamSide = 'CT' | 'T';

export type RawPlayerFrame = [
  playerId: number,
  worldX: number,
  worldY: number,
  worldZ: number,
  yaw: number,
  hp: number,
  armor: number,
  hasHelmet: 0 | 1,
  isAlive: 0 | 1,
  isDefusing: 0 | 1,
  isPlanting: 0 | 1,
  activeWeaponId: number,
  flashDuration: number,
  ping: number,
];

export type RawFrame = [tick: number, players: RawPlayerFrame[]];

export interface PlayerManifestEntry {
  id: number;
  steamId: string;
  name: string;
  initialTeam: 'CT' | 'T';
}

export interface WeaponManifestEntry {
  id: number;
  name: string;
}

export type DamageEventTuple = [
  tick: number,
  attacker: number,
  victim: number,
  damage: number,
  hitgroup: string,
  weaponId: number,
];

export type KillEventTuple = [
  tick: number,
  killer: number,
  victim: number,
  weaponId: number,
  headshot: boolean,
  penetrated: boolean,
];

export type UtilityEventTuple = [
  tick: number,
  type: string,
  x: number,
  y: number,
  z: number,
  startTick: number,
  endTick: number,
];

export type BombEventTuple = [
  tick: number,
  event: string,
  player: number,
  x: number,
  y: number,
];

export interface ReplayEvents {
  damages: Array<[tick: number, attacker: number, victim: number, damage: number, hitgroup: string, weaponId: number]>;
  kills: Array<[tick: number, killer: number, victim: number, weaponId: number, headshot: boolean, penetrated: boolean]>;
  utility: Array<[tick: number, type: string, x: number, y: number, z: number, startTick: number, endTick: number]>;
  bomb: Array<[tick: number, event: string, player: number, x: number, y: number]>;
}

export interface CombatLineEvent {
  tick: number;
  attackerSteamId?: string;
  attackerId?: number;
  victimSteamId?: string;
  victimId?: number;
  attackerX: number;
  attackerY: number;
  victimX: number;
  victimY: number;
  weapon?: string;
  damage?: number;
  isKill?: boolean;
}

export interface ReplayRound {
  roundNumber: number;
  startTick: number;
  endTick: number;
  winnerSide: 'CT' | 'T';
  winReason: string;
  events: ReplayEvents;
  frames: RawFrame[];
  tacticalFrames?: any[];
  playerExtrasByTick?: Record<string, any>;
  combatLines?: CombatLineEvent[];
}

export interface ReplayDataPackage {
  formatVersion: string | number;
  tickrate: number;
  samplingRate: number;
  map: CS2Map;
  playersManifest: PlayerManifestEntry[];
  weaponsManifest: WeaponManifestEntry[];
  rounds: ReplayRound[];
}

/* ============================================================================
 * ESPECIFICAÇÃO COMPLETA DO MOTOR TÁTICO 2D (FASE 1)
 * ============================================================================ */

export type BombLifecycleState =
  | 'carried'
  | 'dropped'
  | 'planting'
  | 'planted'
  | 'defusing'
  | 'defused'
  | 'exploded';

export type GrenadeEntityType =
  | 'smoke'
  | 'molotov'
  | 'incendiary'
  | 'flashbang'
  | 'he'
  | 'decoy';

export type RoundWinnerLabel = 'CT' | 'TERRORIST';

export type RoundEndReason = 'elimination' | 'defuse' | 'explosion' | 'time';

export interface ReplayRosterAthlete {
  id?: number;
  steamId: string;
  nickname: string;
  teamSide: 'CT' | 'TERRORIST' | 'T';
  initialClan: string;
}

export interface ReplayHeader {
  mapName: string;
  tickrate: number;
  snapshotRate: number;
  teams: {
    team1: { name: string; score: number };
    team2: { name: string; score: number };
  };
  roster: ReplayRosterAthlete[];
}

/**
 * Tupla compactada de 17 posições para cada jogador vivo/morto no frame:
 * [playerId, x, y, z, yaw, pitch, hp, armor, helmet, isAlive, isFlashed, isDefusing, isPlanting, activeWeapon, hasC4, hasDefuser, money]
 */
export type CompactPlayerTuple = [
  playerId: number | string,
  x: number,
  y: number,
  z: number,
  yaw: number,
  pitch: number,
  hp: number,
  armor: number,
  helmet: number | boolean,
  isAlive: number | boolean,
  isFlashed: number | boolean,
  isDefusing: number | boolean,
  isPlanting: number | boolean,
  activeWeapon: string | number,
  hasC4: number | boolean,
  hasDefuser: number | boolean,
  money: number,
];

/**
 * Estado contínuo da C4 no frame:
 * [x, y, z, state, carrierId, defuserId, timerSecondsRemaining]
 */
export type ContinuousBombTuple = [
  x: number,
  y: number,
  z: number,
  state: BombLifecycleState,
  carrierId: number | string | null,
  defuserId: number | string | null,
  timerSecondsRemaining: number,
];

/**
 * Entidade de granada ativa no frame:
 * [entityId, throwerId, type, x, y, z, vx, vy, vz, isActive, areaRadius, stage]
 */
export type ActiveGrenadeTuple = [
  entityId: number | string,
  throwerId: number | string,
  type: GrenadeEntityType,
  x: number,
  y: number,
  z: number,
  vx: number,
  vy: number,
  vz: number,
  isActive: number | boolean,
  areaRadius: number,
  stage: number | string,
];

export interface TacticalSnapshotFrame {
  tick: number;
  players: CompactPlayerTuple[];
  bomb: ContinuousBombTuple;
  grenades: ActiveGrenadeTuple[];
}

/**
 * Abates (kills):
 * [tick, attackerSteamId, victimSteamId, assisterSteamId, weapon, isHeadshot, isWallbang, isThroughSmoke, isAttackerBlind]
 */
export type DiscreteKillTuple = [
  tick: number,
  attackerSteamId: string,
  victimSteamId: string,
  assisterSteamId: string | null,
  weapon: string,
  isHeadshot: boolean,
  isWallbang: boolean,
  isThroughSmoke: boolean,
  isAttackerBlind: boolean,
];

/**
 * Danos (damages):
 * [tick, attackerSteamId, victimSteamId, weapon, healthDamage, armorDamage]
 */
export type DiscreteDamageTuple = [
  tick: number,
  attackerSteamId: string,
  victimSteamId: string,
  weapon: string,
  healthDamage: number,
  armorDamage: number,
];

/**
 * Disparos (shots):
 * [tick, shooterSteamId, weapon, originX, originY, originZ]
 */
export type DiscreteShotTuple = [
  tick: number,
  shooterSteamId: string,
  weapon: string,
  originX: number,
  originY: number,
  originZ: number,
];

export type GrenadeThrownEventTuple = [
  tick: number,
  throwerSteamId: string,
  type: GrenadeEntityType,
  trajectoryPoints: Array<[number, number, number]>,
];

export type GrenadeDetonateEventTuple = [
  tick: number,
  type: GrenadeEntityType,
  x: number,
  y: number,
  z: number,
];

export type SmokeStartEventTuple = [
  tick: number,
  x: number,
  y: number,
  z: number,
  durationTicks: number,
];

export type SmokeEndEventTuple = [tick: number];

export type InfernoStartEventTuple = [
  tick: number,
  polygonHull: Array<[number, number]>,
  durationTicks: number,
];

export interface DiscreteUtilityEvents {
  grenade_thrown: GrenadeThrownEventTuple[];
  grenade_detonate: GrenadeDetonateEventTuple[];
  smoke_start: SmokeStartEventTuple[];
  smoke_end: SmokeEndEventTuple[];
  inferno_start: InfernoStartEventTuple[];
}

export interface DiscreteEventsTable {
  kills: DiscreteKillTuple[];
  damages: DiscreteDamageTuple[];
  shots: DiscreteShotTuple[];
  utilityEvents: DiscreteUtilityEvents;
}

export interface TacticalRound {
  roundNum: number;
  roundNumber: number;
  startTick: number;
  freezeEndTick: number;
  endTick: number;
  winner: RoundWinnerLabel;
  winnerSide: TeamSide;
  reason: RoundEndReason;
  winReason: string;
  frames: RawFrame[];
  tacticalFrames: TacticalSnapshotFrame[];
  events: ReplayEvents;
  discreteEvents: DiscreteEventsTable;
}

export interface TacticalReplayPayload extends ReplayHeader {
  formatVersion: string | number;
  samplingRate: number;
  map: CS2Map;
  playersManifest: PlayerManifestEntry[];
  weaponsManifest: WeaponManifestEntry[];
  rounds: TacticalRound[];
}
