export type Team = 'CT' | 'T';
export type TeamSide = 'CT' | 'T';

export type TacticalRoundType = 'eco' | 'semi-eco' | 'semi-buy' | 'full-buy';

export type BombLifecycleState =
  | 'carried'
  | 'dropped'
  | 'planting'
  | 'planted'
  | 'defusing'
  | 'defused'
  | 'exploded';

export interface PlayerVelocity {
  x: number;
  y: number;
  z: number;
  speed2D: number;
}

export interface PlayerState {
  id: string | number;
  name: string;
  team: Team;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  velocity: PlayerVelocity;
  hp: number;
  armor: number;
  hasHelmet: boolean;
  hasDefuser?: boolean;
  isAlive: boolean;
  activeWeapon: string;
  money: number;
  isDefusing?: boolean;
  isScoped: boolean;
  isCrouching: boolean;
  isAirborne: boolean;
  flashDuration: number;
  playerId?: string | number;
  u?: number;
  v?: number;
  percentX?: number;
  percentY?: number;
  worldZ?: number;
  currentFloor?: 'upper' | 'lower' | 'default';
  activeWeaponId?: number;
  isPlanting?: boolean;
  ping?: number;
  kills?: number;
  deaths?: number;
  assists?: number;
  adr?: number;
  color?: string;
}

/**
 * Contrato Canônico de Tupla estendida com suporte a float (1 casa decimal)
 * e novas flags de estado físico e tático:
 * [0: id, 1: x, 2: y, 3: z, 4: yaw, 5: pitch, 6: vx, 7: vy, 8: vz,
 *  9: hp, 10: armor, 11: hasHelmet, 12: isAlive, 13: activeWeapon, 14: money,
 *  15: team, 16: isDefusing, 17: hasDefuser, 18: isScoped, 19: isCrouching,
 *  20: isAirborne, 21: flashDuration]
 */
export type RawPlayerTuple = [
  id: string | number,
  x: number,
  y: number,
  z: number,
  yaw: number,
  pitch: number,
  vx: number,
  vy: number,
  vz: number,
  hp: number,
  armor: number,
  hasHelmet: number | boolean,
  isAlive: number | boolean,
  activeWeapon: string,
  money: number,
  team: number | string,
  isDefusing: number | boolean,
  hasDefuser: number | boolean,
  isScoped: number | boolean,
  isCrouching: number | boolean,
  isAirborne: number | boolean,
  flashDuration: number
];

/**
 * Compatibilidade legada para tupla compactada
 */
export type CompressedPlayerTuple =
  | RawPlayerTuple
  | [
      id: string | number,
      x: number,
      y: number,
      z: number,
      yaw: number,
      hp: number,
      armor: number,
      hasHelmet: number | boolean,
      isAlive: number | boolean,
      activeWeapon?: string,
      money?: number,
      team?: number | string
    ];

export type CompressedFrame = [number, (RawPlayerTuple | CompressedPlayerTuple)[]];

export interface Frame {
  tick: number;
  players: PlayerState[];
}

export interface GrenadeTrajectoryPoint {
  x: number;
  y: number;
  z: number;
  tick: number;
}

export interface GrenadeTrajectory {
  id: string;
  throwerId: string;
  weapon: string;
  points: GrenadeTrajectoryPoint[];
}

export interface GrenadeEffectEvent {
  id: string;
  type: 'smoke' | 'molotov' | 'flash' | 'he';
  x: number;
  y: number;
  z: number;
  startTick: number;
  endTick: number;
  radius: number;
}

export interface WeaponFireEvent {
  tick: number;
  playerId: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  weapon: string;
}

export interface PlayerHurtEvent {
  tick: number;
  attackerId: string;
  victimId: string;
  damage: number;
  hitgroup: number;
  remainingHp: number;
  remainingArmor: number;
}

export interface KillFeedEvent {
  tick: number;
  round?: number;
  attackerId: string | number;
  victimId: string | number;
  assisterId?: string | number | null;
  weapon: string;
  headshot: boolean;
  penetrated?: boolean;
  noscope?: boolean;
  smokeshot?: boolean;
  attackerName?: string;
  victimName?: string;
  attackerTeam?: Team;
  victimTeam?: Team;
  killerId?: string | number;
  killerName?: string;
  killerTeam?: Team;
  assisterName?: string | null;
  isHeadshot?: boolean;
  isWallbang?: boolean;
  isThroughSmoke?: boolean;
  isNoScope?: boolean;
  isAttackerBlind: boolean;
  distance: number;
}

export interface KillEvent extends KillFeedEvent {
  round: number;
}

export interface BombEvent {
  tick: number;
  round?: number;
  type:
    | 'planted'
    | 'defused'
    | 'exploded'
    | 'dropped'
    | 'pickup'
    | 'begin_defuse'
    | 'abort_defuse'
    | 'plant_start'
    | 'plant'
    | 'defuse_start'
    | 'defuse'
    | 'explode';
  site?: 'A' | 'B';
  playerId?: string | number;
  x?: number;
  y?: number;
  z?: number;
  hasKit?: boolean;
}

export interface ActiveGrenade {
  id: string | number;
  type: 'smoke' | 'molotov' | 'incendiary' | 'flash' | 'he' | 'decoy';
  throwerId?: string | number;
  throwerTeam?: Team;
  x: number;
  y: number;
  z: number;
  startTick: number;
  endTick?: number;
  radius?: number;
}

export type WinReason =
  | 'terrorists_eliminated'
  | 'cts_eliminated'
  | 'target_bombed'
  | 'bomb_defused'
  | 'time_ran_out'
  | 'ct_win_elimination'
  | 't_win_elimination'
  | string;

export interface RoundData {
  roundNumber: number;
  startTick: number;
  endTick: number;
  freezeTimeEndTick?: number;
  winner?: Team | null;
  winReason?: WinReason | null;
  scoreCT: number;
  scoreT: number;
  ctScore?: number;
  tScore?: number;
  ctRoundType?: TacticalRoundType;
  tRoundType?: TacticalRoundType;
  frames: (CompressedFrame | Frame | [number, RawPlayerTuple[]])[];
  kills: (KillEvent | KillFeedEvent)[];
  bombEvents: BombEvent[];
  grenades?: (GrenadeEffectEvent | ActiveGrenade)[];
  trajectories?: GrenadeTrajectory[];
  shots?: WeaponFireEvent[];
  damages?: PlayerHurtEvent[];
}

export interface MatchMetadata {
  mapName: string;
  duration?: number;
  tickRate: number;
  serverName?: string;
  teamCTName?: string;
  teamTName?: string;
  finalScoreCT: number;
  finalScoreT: number;
  totalRounds: number;
}

export interface PlayerMetadata {
  id: string | number;
  name: string;
  team: Team;
  steamId?: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  adr?: number;
  hsPercentage?: number;
}

export interface MatchData {
  metadata: MatchMetadata;
  players: Record<string, PlayerMetadata> | PlayerMetadata[];
  rounds: RoundData[];
}

export interface MapMetadata {
  mapName: string;
  displayName: string;
  pos_x: number;
  pos_y: number;
  scale: number;
  radarWidth: number;
  radarHeight: number;
}

/* ============================================================================
 * CONTRATOS LEGADOS E TIPOS DE PARIDADE ARQUITETURAL
 * ============================================================================ */

export type CS2Map =
  | 'de_mirage'
  | 'de_inferno'
  | 'de_dust2'
  | 'de_nuke'
  | 'de_ancient'
  | 'de_anubis'
  | 'de_cache';

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
  ping: number
];

export type RawFrame = [number, RawPlayerFrame[]];

export interface PlayerManifestEntry {
  id: number;
  steamId: string;
  name: string;
  initialTeam: TeamSide;
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
  weaponId: number
];

export type KillEventTuple = [
  tick: number,
  killer: number,
  victim: number,
  weaponId: number,
  headshot: boolean,
  penetrated: boolean
];

export type UtilityEventTuple = [
  tick: number,
  type: string,
  x: number,
  y: number,
  z: number,
  startTick: number,
  endTick: number
];

export type BombEventTuple = [
  tick: number,
  event: string,
  player: number,
  x: number,
  y: number
];

export type DiscreteKillTuple = [
  tick: number,
  attackerSteamId: string,
  victimSteamId: string,
  assisterSteamId: string | null,
  weapon: string,
  isHeadshot: boolean,
  isWallbang: boolean,
  isThroughSmoke: boolean,
  isAttackerBlind: boolean
];

export interface ReplayEvents {
  damages: DamageEventTuple[];
  kills: KillEventTuple[];
  utility: UtilityEventTuple[];
  bomb: BombEventTuple[];
}

export interface ReplayRound {
  roundNumber: number;
  startTick: number;
  endTick: number;
  winnerSide: TeamSide;
  winReason: string;
  events: ReplayEvents;
  frames: RawFrame[];
  tacticalFrames?: any[];
  playerExtrasByTick?: Record<string, any>;
  combatLines?: any[];
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

export type BinaryFlag = 0 | 1;
export type RoundWinnerLabel = 'CT' | 'TERRORIST';
export type RoundEndReason = 'elimination' | 'defuse' | 'explosion' | 'time' | string;
export type GrenadeEntityType = 'smoke' | 'molotov' | 'incendiary' | 'flashbang' | 'he' | 'decoy';

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

export type ContinuousBombTuple = [
  x: number,
  y: number,
  z: number,
  state: BombLifecycleState,
  carrierId: number | string | null,
  defuserId: number | string | null,
  timerSecondsRemaining: number,
];

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

export type DiscreteDamageTuple = [
  tick: number,
  attackerSteamId: string,
  victimSteamId: string,
  weapon: string,
  healthDamage: number,
  armorDamage: number,
];

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
  buyTypeCT?: string;
  buyTypeT?: string;
  equipValueCT?: number;
  equipValueT?: number;
  playerExtrasByTick?: any;
  combatLines?: any[];
  frames: RawFrame[];
  tacticalFrames: TacticalSnapshotFrame[];
  kills?: KillEventTuple[];
  damages?: DamageEventTuple[];
  utility?: UtilityEventTuple[];
  bomb?: BombEventTuple[];
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
