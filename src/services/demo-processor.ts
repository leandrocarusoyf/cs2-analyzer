import { MAP_CONFIGS } from '../constants/maps.ts';
import type {
  BombEventTuple,
  CS2Map,
  DamageEventTuple,
  KillEventTuple,
  PlayerManifestEntry,
  RawFrame,
  RawPlayerFrame,
  ReplayDataPackage,
  ReplayRound,
  TeamSide,
  UtilityEventTuple,
  WeaponManifestEntry,
} from '../types/replay.ts';
import {
  calculateTimeToDamage,
  DEFAULT_TRADE_WINDOW_MS,
} from '../utils/aim-math.ts';

export const REPLAY_FORMAT_VERSION = '1.0';
export const DEFAULT_TICKRATE = 64;
export const DEFAULT_SAMPLING_RATE = 4;
export const MAX_ROUNDS_PER_MATCH = 60;
export const MR12_HALFTIME_ROUND = 13;

/**
 * Registo pronto para inserção em public.matches (colunas em snake_case).
 */
export interface InsertMatchRecord {
  demo_hash: string;
  map_name: CS2Map;
  played_at: string;
  team_ct_name: string;
  team_t_name: string;
  score_ct: number;
  score_t: number;
  rounds_count: number;
  replay_storage_path: string;
  global_avg_ttd_ms: number | null;
  global_avg_ttk_ms: number | null;
  is_public: boolean;
  uploader_id: string | null;
}

/**
 * Formato bruto esperado na entrada (saída do parser de demos, identificando
 * jogadores por steamId). Todos os campos opcionais recebem fallback seguro.
 */
export interface RawDemoPlayerTick {
  steamId: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  armor?: number;
  hasHelmet?: boolean | number;
  isAlive?: boolean | number;
  isDefusing?: boolean | number;
  isPlanting?: boolean | number;
  weaponId?: number;
  flashDuration?: number;
  ping?: number;
}

export interface RawDemoDuel {
  attackerSteamId: string;
  victimSteamId: string;
  firstSightTick: number;
  firstDamageTick: number | null;
  killTick: number | null;
  isFirstShotHit: boolean;
}

export interface RawDemoRound {
  roundNumber: number;
  startTick: number;
  endTick: number;
  winnerSide: TeamSide;
  winReason: string;
  ticks?: Array<{ tick: number; players: RawDemoPlayerTick[] }>;
  damages?: Array<{
    tick: number;
    attackerSteamId: string;
    victimSteamId: string;
    damage: number;
    hitgroup: string;
    weaponId: number;
  }>;
  kills?: Array<{
    tick: number;
    killerSteamId: string;
    victimSteamId: string;
    weaponId: number;
    headshot?: boolean;
    penetrated?: boolean;
  }>;
  utility?: Array<{
    tick: number;
    type: string;
    x: number;
    y: number;
    z: number;
    startTick: number;
    endTick: number;
  }>;
  bomb?: Array<{
    tick: number;
    event: string;
    playerSteamId: string;
    x: number;
    y: number;
  }>;
  duels?: RawDemoDuel[];
}

export interface RawDemoData {
  demoHash: string;
  map: string;
  tickrate?: number;
  samplingRate?: number;
  playedAt?: string;
  teamCtName?: string;
  teamTName?: string;
  isPublic?: boolean;
  uploaderId?: string | null;
  players: Array<{ steamId: string; name: string; team: TeamSide }>;
  weapons?: Array<{ id: number; name: string }>;
  rounds: RawDemoRound[];
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toFlag(value: unknown): 0 | 1 {
  return value === true || value === 1 ? 1 : 0;
}

function normalizeYaw(yaw: number): number {
  const normalized = ((yaw % 360) + 360) % 360;
  return normalized === 0 ? 0 : normalized;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function isCS2Map(value: string): value is CS2Map {
  return Object.hasOwn(MAP_CONFIGS, value);
}

export function buildReplayStoragePath(demoHash: string): string {
  return `${demoHash}.json`;
}

export interface GlobalAimAggregates {
  avgTtdMs: number | null;
  avgTtkMs: number | null;
  discardedDuels: number;
}

/**
 * Agrega TTD e TTK globais a partir dos duelos.
 * Anomalias temporais (ticks não finitos, negativos ou fora de ordem
 * sight <= damage <= kill) descartam o duelo inteiro.
 */
export function aggregateAimMetrics(
  duels: ReadonlyArray<RawDemoDuel>,
  tickrate: number,
): GlobalAimAggregates {
  const ttdSamples: number[] = [];
  const ttkSamples: number[] = [];
  let discardedDuels = 0;

  for (const duel of duels) {
    const { firstSightTick, firstDamageTick, killTick } = duel;

    const ticksOk =
      Number.isFinite(firstSightTick) &&
      firstSightTick >= 0 &&
      (firstDamageTick === null ||
        (Number.isFinite(firstDamageTick) && firstDamageTick >= firstSightTick)) &&
      (killTick === null ||
        (Number.isFinite(killTick) &&
          killTick >= (firstDamageTick ?? firstSightTick)));

    if (!ticksOk) {
      discardedDuels++;
      continue;
    }

    if (firstDamageTick !== null) {
      ttdSamples.push(calculateTimeToDamage(firstSightTick, firstDamageTick, tickrate));
      if (killTick !== null) {
        // TTK = (killTick - firstDamageTick) * (1000 / tickrate)
        ttkSamples.push(calculateTimeToDamage(firstDamageTick, killTick, tickrate));
      }
    }
  }

  const avgTtd = average(ttdSamples);
  const avgTtk = average(ttkSamples);

  return {
    avgTtdMs: avgTtd === null ? null : Math.round(avgTtd),
    avgTtkMs: avgTtk === null ? null : Math.round(avgTtk),
    discardedDuels,
  };
}

/**
 * Converte dados brutos de uma demo no pacote compacto de replay (RawPlayerFrame
 * de 14 posições) e no registo relacional da tabela matches.
 */
export function processDemoTelemetry(rawDemoData: any): {
  packageData: ReplayDataPackage;
  matchRecord: InsertMatchRecord;
} {
  const raw = rawDemoData as RawDemoData;

  if (!raw || typeof raw.demoHash !== 'string' || raw.demoHash.trim() === '') {
    throw new Error('Demo inválida: demoHash ausente.');
  }
  if (typeof raw.map !== 'string' || !isCS2Map(raw.map)) {
    throw new Error(`Demo inválida: mapa fora da rotação competitiva ("${String(raw?.map)}").`);
  }
  if (!Array.isArray(raw.rounds) || raw.rounds.length < 1 || raw.rounds.length > MAX_ROUNDS_PER_MATCH) {
    throw new Error(`Demo inválida: rounds_count deve estar entre 1 e ${MAX_ROUNDS_PER_MATCH}.`);
  }
  if (!Array.isArray(raw.players) || raw.players.length === 0) {
    throw new Error('Demo inválida: lista de jogadores vazia.');
  }

  const demoHash = raw.demoHash.trim();
  const mapName: CS2Map = raw.map;
  const tickrate = finiteOr(raw.tickrate, DEFAULT_TICKRATE) > 0
    ? finiteOr(raw.tickrate, DEFAULT_TICKRATE)
    : DEFAULT_TICKRATE;
  const samplingRate = Math.max(1, Math.round(finiteOr(raw.samplingRate, DEFAULT_SAMPLING_RATE)));

  const playersManifest: PlayerManifestEntry[] = raw.players.map((p, index) => ({
    id: index + 1,
    steamId: p.steamId,
    name: p.name,
    initialTeam: p.team,
  }));
  const idBySteamId = new Map<string, number>();
  for (const p of playersManifest) idBySteamId.set(p.steamId, p.id);

  const weaponsManifest: WeaponManifestEntry[] = (raw.weapons ?? []).map((w) => ({
    id: w.id,
    name: w.name,
  }));

  const rounds: ReplayRound[] = [];
  const allDuels: RawDemoDuel[] = [];

  for (const rawRound of raw.rounds) {
    const frames: RawFrame[] = [];
    for (const entry of rawRound.ticks ?? []) {
      if (!Number.isFinite(entry.tick) || entry.tick < rawRound.startTick || entry.tick > rawRound.endTick) {
        continue; // anomalia: tick fora da janela do round
      }
      if ((entry.tick - rawRound.startTick) % samplingRate !== 0) continue;

      const players: RawPlayerFrame[] = [];
      for (const p of entry.players) {
        const id = idBySteamId.get(p.steamId);
        if (id === undefined) continue;
        players.push([
          id,
          finiteOr(p.x, 0),
          finiteOr(p.y, 0),
          finiteOr(p.z, 0),
          normalizeYaw(finiteOr(p.yaw, 0)),
          clampInt(finiteOr(p.hp, 0), 0, 100),
          clampInt(finiteOr(p.armor, 0), 0, 100),
          toFlag(p.hasHelmet),
          toFlag(p.isAlive),
          toFlag(p.isDefusing),
          toFlag(p.isPlanting),
          Math.max(0, Math.round(finiteOr(p.weaponId, 0))),
          Math.max(0, finiteOr(p.flashDuration, 0)),
          Math.max(0, Math.round(finiteOr(p.ping, 0))),
        ]);
      }
      if (players.length > 0) frames.push([Math.round(entry.tick), players]);
    }

    const damages: DamageEventTuple[] = [];
    for (const d of rawRound.damages ?? []) {
      const a = idBySteamId.get(d.attackerSteamId);
      const v = idBySteamId.get(d.victimSteamId);
      if (a === undefined || v === undefined) continue;
      damages.push([d.tick, a, v, Math.max(0, d.damage), d.hitgroup || 'generic', d.weaponId]);
    }

    const kills: KillEventTuple[] = [];
    for (const k of rawRound.kills ?? []) {
      const killer = idBySteamId.get(k.killerSteamId);
      const victim = idBySteamId.get(k.victimSteamId);
      if (killer === undefined || victim === undefined) continue;
      kills.push([k.tick, killer, victim, k.weaponId, !!k.headshot, !!k.penetrated]);
    }

    const utility: UtilityEventTuple[] = (rawRound.utility ?? []).map((u) => [
      u.tick,
      u.type,
      u.x,
      u.y,
      u.z,
      u.startTick,
      u.endTick,
    ]);

    const bomb: BombEventTuple[] = [];
    for (const b of rawRound.bomb ?? []) {
      const player = idBySteamId.get(b.playerSteamId);
      if (player === undefined) continue;
      bomb.push([b.tick, b.event, player, b.x, b.y]);
    }

    allDuels.push(...(rawRound.duels ?? []));

    rounds.push({
      roundNumber: rawRound.roundNumber,
      startTick: rawRound.startTick,
      endTick: rawRound.endTick,
      winnerSide: rawRound.winnerSide,
      winReason: rawRound.winReason,
      events: { damages, kills, utility, bomb },
      frames,
    });
  }

  // Placar por equipe: "CT" = equipe que iniciou como CT; lados invertem a partir do round 13 (MR12).
  let scoreCt = 0;
  let scoreT = 0;
  for (const round of rounds) {
    const startingCtSide: TeamSide = round.roundNumber >= MR12_HALFTIME_ROUND ? 'T' : 'CT';
    if (round.winnerSide === startingCtSide) scoreCt++;
    else scoreT++;
  }

  const aggregates = aggregateAimMetrics(allDuels, tickrate);

  const packageData: ReplayDataPackage = {
    formatVersion: REPLAY_FORMAT_VERSION,
    tickrate,
    samplingRate,
    map: mapName,
    playersManifest,
    weaponsManifest,
    rounds,
  };

  const matchRecord: InsertMatchRecord = {
    demo_hash: demoHash,
    map_name: mapName,
    played_at: raw.playedAt ?? new Date().toISOString(),
    team_ct_name: raw.teamCtName ?? 'Counter-Terrorists',
    team_t_name: raw.teamTName ?? 'Terrorists',
    score_ct: scoreCt,
    score_t: scoreT,
    rounds_count: rounds.length,
    replay_storage_path: buildReplayStoragePath(demoHash),
    global_avg_ttd_ms: aggregates.avgTtdMs,
    global_avg_ttk_ms: aggregates.avgTtkMs,
    is_public: raw.isPublic ?? false,
    uploader_id: raw.uploaderId ?? null,
  };

  return { packageData, matchRecord };
}

export { DEFAULT_TRADE_WINDOW_MS };

