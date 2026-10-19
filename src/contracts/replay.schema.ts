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
});

export const replayDataPackageSchema = z.object({
  formatVersion: z.union([z.string().min(1), z.number().int().positive()]),
  tickrate: z.number().positive(),
  samplingRate: z.number().int().positive(),
  map: cs2MapSchema,
  playersManifest: z.array(playerManifestEntrySchema),
  weaponsManifest: z.array(weaponManifestEntrySchema),
  rounds: z.array(replayRoundSchema),
});

export type ReplayDataPackage = z.infer<typeof replayDataPackageSchema>;
export type ValidatedReplayDataPackage = ReplayDataPackage;
export type RawPlayerFrame = z.infer<typeof rawPlayerFrameSchema>;
export type RawFrame = z.infer<typeof rawFrameSchema>;
export type ReplayRound = z.infer<typeof replayRoundSchema>;
export type ReplayEvents = z.infer<typeof replayEventsSchema>;

// Garantia em tempo de compilação de paridade estrutural entre a interface e o schema Zod
type AssertTypeEquality<T extends U, U = T> = T;
export type _SchemaParityCheck = AssertTypeEquality<
  ReplayDataPackage,
  ReplayDataPackageInterface
>;

