import { z } from 'zod';
import type { ReplayDataPackage as ReplayDataPackageInterface } from '../types/replay.ts';

export const cs2MapSchema = z.enum([
  'de_mirage',
  'de_inferno',
  'de_dust2',
  'de_nuke',
  'de_ancient',
  'de_anubis',
  'de_cache',
]);

export const teamSideSchema = z.enum(['CT', 'T']);

export const binaryFlagSchema = z.union([z.literal(0), z.literal(1)]);

/**
 * Tupla estrita de 14 elementos para o estado do jogador em cada frame:
 * [
 *   0: playerId,
 *   1: worldX,
 *   2: worldY,
 *   3: worldZ,
 *   4: yaw (0..360),
 *   5: hp (0..100),
 *   6: armor (0..100),
 *   7: hasHelmet (0 | 1),
 *   8: isAlive (0 | 1),
 *   9: isDefusing (0 | 1),
 *  10: isPlanting (0 | 1),
 *  11: activeWeaponId,
 *  12: flashDuration (>= 0),
 *  13: ping (>= 0)
 * ]
 */
export const rawPlayerFrameSchema = z.tuple([
  z.number().int().nonnegative(), // playerId
  z.number().finite(), // worldX
  z.number().finite(), // worldY
  z.number().finite(), // worldZ
  z.number().min(0).max(360), // yaw
  z.number().int().min(0).max(100), // hp
  z.number().int().min(0).max(100), // armor
  binaryFlagSchema, // hasHelmet
  binaryFlagSchema, // isAlive
  binaryFlagSchema, // isDefusing
  binaryFlagSchema, // isPlanting
  z.number().int().nonnegative(), // activeWeaponId
  z.number().min(0), // flashDuration
  z.number().int().min(0), // ping
]);

export const rawFrameSchema = z.tuple([
  z.number().int().nonnegative(), // tick
  z.array(rawPlayerFrameSchema), // players
]);

export const playerManifestEntrySchema = z.object({
  id: z.number().int().nonnegative(),
  steamId: z.string().min(1),
  name: z.string().min(1),
  initialTeam: teamSideSchema,
});

export const weaponManifestEntrySchema = z.object({
  id: z.number().int().nonnegative(),
  name: z.string().min(1),
});

export const damageEventSchema = z.tuple([
  z.number().int().nonnegative(), // tick
  z.number().int().nonnegative(), // attacker
  z.number().int().nonnegative(), // victim
  z.number().nonnegative(), // damage
  z.string().min(1), // hitgroup
  z.number().int().nonnegative(), // weaponId
]);

export const killEventSchema = z.tuple([
  z.number().int().nonnegative(), // tick
  z.number().int().nonnegative(), // killer
  z.number().int().nonnegative(), // victim
  z.number().int().nonnegative(), // weaponId
  z.boolean(), // headshot
  z.boolean(), // penetrated
]);

export const utilityEventSchema = z.tuple([
  z.number().int().nonnegative(), // tick
  z.string().min(1), // type
  z.number().finite(), // x
  z.number().finite(), // y
  z.number().finite(), // z
  z.number().int().nonnegative(), // startTick
  z.number().int().nonnegative(), // endTick
]);

export const bombEventSchema = z.tuple([
  z.number().int().nonnegative(), // tick
  z.string().min(1), // event
  z.number().int().nonnegative(), // player
  z.number().finite(), // x
  z.number().finite(), // y
]);

export const replayEventsSchema = z.object({
  damages: z.array(damageEventSchema),
  kills: z.array(killEventSchema),
  utility: z.array(utilityEventSchema),
  bomb: z.array(bombEventSchema),
});

export const replayRoundSchema = z.object({
  roundNumber: z.number().int().positive(),
  startTick: z.number().int().nonnegative(),
  endTick: z.number().int().nonnegative(),
  winnerSide: teamSideSchema,
  winReason: z.string().min(1),
  events: replayEventsSchema,
  frames: z.array(rawFrameSchema),
  ctScore: z.number().optional(),
  tScore: z.number().optional(),
  ctRoundType: z.string().optional(),
  tRoundType: z.string().optional(),
  freezeTimeEndTick: z.number().optional(),
  grenades: z.array(z.any()).optional(),
  trajectories: z.array(z.any()).optional(),
  shots: z.array(z.any()).optional(),
  damages: z.array(z.any()).optional(),
}).passthrough();

export const replayDataPackageSchema = z.object({
  formatVersion: z.union([z.string().min(1), z.number().int().positive()]),
  tickrate: z.number().positive(),
  samplingRate: z.number().int().positive(),
  map: cs2MapSchema,
  playersManifest: z.array(playerManifestEntrySchema),
  weaponsManifest: z.array(weaponManifestEntrySchema),
  rounds: z.array(replayRoundSchema),
}).passthrough();

export type ReplayDataPackage = z.infer<typeof replayDataPackageSchema>;
export type ValidatedReplayDataPackage = ReplayDataPackage;
export type RawPlayerFrame = z.infer<typeof rawPlayerFrameSchema>;
export type RawFrame = z.infer<typeof rawFrameSchema>;
export type ReplayRound = z.infer<typeof replayRoundSchema>;
export type ReplayEvents = z.infer<typeof replayEventsSchema>;

/**
 * Esquema Zod para a tupla canônica estendida V2 (22 posições)
 */
export const rawPlayerTupleSchema = z.tuple([
  z.union([z.string(), z.number()]), // 0: id
  z.number(), // 1: x
  z.number(), // 2: y
  z.number(), // 3: z
  z.number(), // 4: yaw
  z.number(), // 5: pitch
  z.number(), // 6: vx
  z.number(), // 7: vy
  z.number(), // 8: vz
  z.number(), // 9: hp
  z.number(), // 10: armor
  z.union([z.boolean(), z.number()]), // 11: hasHelmet
  z.union([z.boolean(), z.number()]), // 12: isAlive
  z.union([z.string(), z.number()]), // 13: activeWeapon
  z.number(), // 14: money
  z.union([z.string(), z.number()]), // 15: team
  z.union([z.boolean(), z.number()]), // 16: isDefusing
  z.union([z.boolean(), z.number()]), // 17: hasDefuser
  z.union([z.boolean(), z.number()]), // 18: isScoped
  z.union([z.boolean(), z.number()]), // 19: isCrouching
  z.union([z.boolean(), z.number()]), // 20: isAirborne
  z.number(), // 21: flashDuration
]);

export const grenadeTrajectoryPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  tick: z.number(),
});

export const grenadeTrajectorySchema = z.object({
  id: z.string(),
  throwerId: z.string(),
  weapon: z.string(),
  points: z.array(grenadeTrajectoryPointSchema),
});

export const grenadeEffectEventSchema = z.object({
  id: z.string(),
  type: z.enum(['smoke', 'molotov', 'flash', 'he']),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  startTick: z.number(),
  endTick: z.number(),
  radius: z.number(),
});

export const weaponFireEventSchema = z.object({
  tick: z.number(),
  playerId: z.string(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  yaw: z.number(),
  pitch: z.number(),
  weapon: z.string(),
});

export const playerHurtEventSchema = z.object({
  tick: z.number(),
  attackerId: z.string(),
  victimId: z.string(),
  damage: z.number(),
  hitgroup: z.number(),
  remainingHp: z.number(),
  remainingArmor: z.number(),
});

export const bombLifecycleEventSchema = z.object({
  tick: z.number(),
  round: z.number().optional(),
  type: z.enum([
    'planted',
    'defused',
    'exploded',
    'dropped',
    'pickup',
    'begin_defuse',
    'abort_defuse',
    'plant_start',
    'plant',
    'defuse_start',
    'defuse',
    'explode',
  ]),
  site: z.enum(['A', 'B']).optional(),
  playerId: z.union([z.string(), z.number()]).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  z: z.number().optional(),
  hasKit: z.boolean().optional(),
});

// Garantia em tempo de compilação de compatibilidade estrutural
type AssertAssignable<T, U extends T> = true;
export type _SchemaParityCheck = AssertAssignable<
  ReplayDataPackageInterface,
  ReplayDataPackage
>;


