import * as pako from 'pako';
import type {
  ActiveGrenadeTuple,
  BombEventTuple,
  BombLifecycleState,
  CS2Map,
  CompactPlayerTuple,
  ContinuousBombTuple,
  DamageEventTuple,
  DiscreteDamageTuple,
  DiscreteEventsTable,
  DiscreteKillTuple,
  DiscreteShotTuple,
  GrenadeEntityType,
  KillEventTuple,
  PlayerManifestEntry,
  RawFrame,
  RawPlayerFrame,
  ReplayRosterAthlete,
  RoundEndReason,
  RoundWinnerLabel,
  TacticalReplayPayload,
  TacticalRound,
  TacticalSnapshotFrame,
  TeamSide,
  UtilityEventTuple,
  WeaponManifestEntry,
  CompressedFrame,
  CompressedPlayerTuple,
  Frame,
  PlayerMetadata,
  PlayerState,
  RawPlayerTuple,
  RoundData,
  Team,
} from '../../types/replay.ts';

const GZIP_MAGIC_BYTE_0 = 0x1f;
const GZIP_MAGIC_BYTE_1 = 0x8b;
const CHUNK_YIELD_BYTE_THRESHOLD = 256 * 1024;

export const FALLBACK_PLAYERS_MANIFEST: readonly PlayerManifestEntry[] = [
  { id: 1, steamId: '76561198044118796', name: 'XANTARES', initialTeam: 'CT' },
  { id: 2, steamId: '76561197960690195', name: 'FalleN', initialTeam: 'T' },
  { id: 3, steamId: '76561198164970560', name: 'yuurih', initialTeam: 'T' },
  { id: 4, steamId: '76561198058500492', name: 'KSCERATO', initialTeam: 'T' },
  { id: 5, steamId: '76561198134401925', name: 'YEKINDAR', initialTeam: 'T' },
  { id: 6, steamId: '76561198057282432', name: 'kyxsan', initialTeam: 'CT' },
  { id: 7, steamId: '76561198855375325', name: 'Jimpphat', initialTeam: 'CT' },
  { id: 8, steamId: '76561198200982290', name: 'molodoy', initialTeam: 'T' },
  { id: 9, steamId: '76561198083485506', name: 'woxic', initialTeam: 'CT' },
  { id: 10, steamId: '76561198812513923', name: 'Wicadia', initialTeam: 'CT' },
];

export const FALLBACK_WEAPONS_MANIFEST: readonly WeaponManifestEntry[] = [
  { id: 1, name: 'weapon_deagle' },
  { id: 2, name: 'weapon_elite' },
  { id: 3, name: 'weapon_fiveseven' },
  { id: 4, name: 'weapon_glock' },
  { id: 7, name: 'weapon_ak47' },
  { id: 8, name: 'weapon_aug' },
  { id: 9, name: 'weapon_awp' },
  { id: 10, name: 'weapon_famas' },
  { id: 13, name: 'weapon_galilar' },
  { id: 16, name: 'weapon_m4a1' },
  { id: 17, name: 'weapon_mac10' },
  { id: 19, name: 'weapon_p90' },
  { id: 23, name: 'weapon_mp5sd' },
  { id: 24, name: 'weapon_ump45' },
  { id: 25, name: 'weapon_xm1014' },
  { id: 27, name: 'weapon_mag7' },
  { id: 30, name: 'weapon_tec9' },
  { id: 32, name: 'weapon_hkp2000' },
  { id: 33, name: 'weapon_mp7' },
  { id: 34, name: 'weapon_mp9' },
  { id: 35, name: 'weapon_nova' },
  { id: 36, name: 'weapon_p250' },
  { id: 39, name: 'weapon_sg556' },
  { id: 40, name: 'weapon_ssg08' },
  { id: 42, name: 'weapon_knife' },
  { id: 43, name: 'weapon_flashbang' },
  { id: 44, name: 'weapon_hegrenade' },
  { id: 45, name: 'weapon_smokegrenade' },
  { id: 46, name: 'weapon_molotov' },
  { id: 47, name: 'weapon_decoy' },
  { id: 48, name: 'weapon_incgrenade' },
  { id: 49, name: 'weapon_c4' },
  { id: 60, name: 'weapon_m4a1_silencer' },
  { id: 61, name: 'weapon_usp_silencer' },
  { id: 63, name: 'weapon_cz75a' },
  { id: 64, name: 'weapon_revolver' },
];

function isGzipBuffer(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 2 &&
    bytes[0] === GZIP_MAGIC_BYTE_0 &&
    bytes[1] === GZIP_MAGIC_BYTE_1
  );
}

export async function decompressGzipChunksToText(
  input: ReadableStream<Uint8Array> | Uint8Array | ArrayBuffer,
): Promise<string> {
  let rawBytes: Uint8Array;

  if (input instanceof ArrayBuffer) {
    rawBytes = new Uint8Array(input);
  } else if (input instanceof Uint8Array) {
    rawBytes = input;
  } else {
    const reader = input.getReader();
    const chunks: Uint8Array[] = [];
    let totalLength = 0;
    let bytesSinceYield = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.byteLength > 0) {
        chunks.push(value);
        totalLength += value.byteLength;
        bytesSinceYield += value.byteLength;
        if (bytesSinceYield >= CHUNK_YIELD_BYTE_THRESHOLD) {
          bytesSinceYield = 0;
          await new Promise<void>((r) => setTimeout(r, 0));
        }
      }
    }

    rawBytes = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      rawBytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
  }

  if (!isGzipBuffer(rawBytes)) {
    try {
      return new TextDecoder('utf-8').decode(rawBytes);
    } catch {
      return '';
    }
  }

  if (typeof DecompressionStream !== 'undefined') {
    try {
      const ds = new DecompressionStream('gzip');
      const sourceStream = new ReadableStream<Uint8Array>({
        start(controller) {
          const sliceSize = 64 * 1024;
          for (let i = 0; i < rawBytes.byteLength; i += sliceSize) {
            controller.enqueue(rawBytes.subarray(i, Math.min(i + sliceSize, rawBytes.byteLength)));
          }
          controller.close();
        },
      });

      const decompressedStream = sourceStream.pipeThrough(
        ds as unknown as ReadableWritablePair<Uint8Array, Uint8Array>,
      );
      const reader = decompressedStream.getReader();
      const decoder = new TextDecoder('utf-8');
      const textParts: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          textParts.push(decoder.decode(value, { stream: true }));
        }
      }
      textParts.push(decoder.decode());
      return textParts.join('');
    } catch {
      // Fallback para pako
    }
  }

  try {
    const inflator = new pako.Inflate();
    const chunkSize = 64 * 1024;
    for (let offset = 0; offset < rawBytes.byteLength; offset += chunkSize) {
      const end = Math.min(offset + chunkSize, rawBytes.byteLength);
      const isLast = end >= rawBytes.byteLength;
      inflator.push(rawBytes.subarray(offset, end), isLast);
    }

    if (inflator.err || !inflator.result) {
      const fallbackBytes = pako.inflate(rawBytes);
      return new TextDecoder('utf-8').decode(fallbackBytes);
    }

    return typeof inflator.result === 'string'
      ? inflator.result
      : new TextDecoder('utf-8').decode(inflator.result as Uint8Array);
  } catch {
    return new TextDecoder('utf-8').decode(rawBytes);
  }
}

function normalizeWinReason(rawReason: string, winner: RoundWinnerLabel): RoundEndReason {
  const lower = String(rawReason || '').toLowerCase();
  if (lower.includes('defus') || lower === '7') return 'defuse';
  if (lower.includes('bomb') || lower.includes('explod') || lower.includes('target_bombed') || lower === '1') {
    return 'explosion';
  }
  if (lower.includes('time') || lower.includes('saved') || lower === '12') return 'time';
  return 'elimination';
}

function normalizeGrenadeType(rawType: string): GrenadeEntityType {
  const lower = String(rawType || '').toLowerCase();
  if (lower.includes('smoke')) return 'smoke';
  if (lower.includes('inc')) return 'incendiary';
  if (lower.includes('molo') || lower.includes('inferno')) return 'molotov';
  if (lower.includes('flash')) return 'flashbang';
  if (lower.includes('he') || lower.includes('frag')) return 'he';
  if (lower.includes('decoy')) return 'decoy';
  return 'smoke';
}

export function normalizeReplayPayload(
  rawJson: Record<string, any>,
  fallbackMatchId: string = 'demo-match',
): TacticalReplayPayload {
  const mapNameRaw =
    rawJson.mapName ||
    rawJson.map ||
    (fallbackMatchId.includes('nuke') ? 'de_nuke' : 'de_inferno');
  const map = mapNameRaw as CS2Map;
  const tickrate = Number(rawJson.tickrate || 64);
  const samplingRate = Number(rawJson.samplingRate || 4);
  const snapshotRate = Number(rawJson.snapshotRate || Math.round(tickrate / samplingRate) || 16);

  const manifest: PlayerManifestEntry[] =
    Array.isArray(rawJson.playersManifest) && rawJson.playersManifest.length > 0
      ? rawJson.playersManifest.map((p: any, idx: number) => ({
          id: Number(p.id ?? idx + 1),
          steamId: String(p.steamId ?? p.steamid ?? `7656119800000000${idx + 1}`),
          name: String(p.name ?? p.nickname ?? `Player ${idx + 1}`),
          initialTeam: String(p.initialTeam || p.teamSide || p.team || '').toUpperCase().includes('CT') ? 'CT' : 'T',
        }))
      : Array.isArray(rawJson.roster) && rawJson.roster.length > 0
      ? rawJson.roster.map((r: any, idx: number) => ({
          id: Number(r.id ?? idx + 1),
          steamId: String(r.steamId ?? r.steamid ?? `7656119800000000${idx + 1}`),
          name: String(r.nickname ?? r.name ?? `Player ${idx + 1}`),
          initialTeam: String(r.teamSide || r.initialTeam || r.team || '').toUpperCase().includes('CT') ? 'CT' : 'T',
        }))
      : [...FALLBACK_PLAYERS_MANIFEST];

  const steamToId = new Map<string, number>();
  const idToSteam = new Map<number, string>();
  for (const pl of manifest) {
    const sId = String(pl.steamId).trim();
    steamToId.set(sId, pl.id);
    steamToId.set(String(pl.id), pl.id);
    idToSteam.set(pl.id, sId);
  }

  const resolvePlayerId = (v: unknown): number => {
    if (v === null || v === undefined) return 0;
    const s = String(v).trim();
    if (!s || s === '0') return 0;
    if (steamToId.has(s)) return steamToId.get(s)!;
    const n = Number(s);
    if (Number.isFinite(n) && n >= 1 && n <= manifest.length && idToSteam.has(n)) {
      return n;
    }
    return 0;
  };

  const resolveSteamId = (v: unknown): string => {
    const id = resolvePlayerId(v);
    if (idToSteam.has(id)) return idToSteam.get(id)!;
    return String(v ?? '');
  };

  const weaponsManifest: WeaponManifestEntry[] =
    Array.isArray(rawJson.weaponsManifest) && rawJson.weaponsManifest.length > 0
      ? rawJson.weaponsManifest
      : [...FALLBACK_WEAPONS_MANIFEST];

  const weaponNameById = new Map<number, string>();
  const weaponNameToId = new Map<string, number>();

  for (const w of FALLBACK_WEAPONS_MANIFEST) {
    weaponNameById.set(w.id, w.name);
    weaponNameToId.set(w.name.toLowerCase(), w.id);
    weaponNameToId.set(w.name.replace(/^weapon_/, '').toLowerCase(), w.id);
  }
  for (const w of weaponsManifest) {
    weaponNameById.set(w.id, w.name);
    weaponNameToId.set(w.name.toLowerCase(), w.id);
    weaponNameToId.set(w.name.replace(/^weapon_/, '').toLowerCase(), w.id);
  }

  const resolveWeaponId = (w: unknown): number => {
    if (typeof w === 'number' && w > 0) return w;
    const s = String(w || '').toLowerCase();
    return weaponNameToId.get(s) || weaponNameToId.get(`weapon_${s}`) || 7;
  };

  const roster: ReplayRosterAthlete[] = manifest.map((p) => ({
    id: p.id,
    steamId: p.steamId,
    nickname: p.name,
    teamSide: p.initialTeam === 'CT' ? 'CT' : 'TERRORIST',
    initialClan: p.initialTeam === 'CT' ? (rawJson.teams?.team2?.name ?? 'Aurora') : (rawJson.teams?.team1?.name ?? 'FURIA'),
  }));

  const rawRounds = Array.isArray(rawJson.rounds) ? rawJson.rounds : [];

  const normalizedRounds: TacticalRound[] = rawRounds.map((r: any, rIdx: number) => {
    const rawFramesList = Array.isArray(r.frames) ? r.frames : [];

    const firstFrameTick = rawFramesList.length > 0
      ? Number(Array.isArray(rawFramesList[0]) ? rawFramesList[0][0] : rawFramesList[0].tick ?? 0)
      : rIdx * 2000;
    const lastFrameTick = rawFramesList.length > 0
      ? Number(
          Array.isArray(rawFramesList[rawFramesList.length - 1])
            ? rawFramesList[rawFramesList.length - 1][0]
            : rawFramesList[rawFramesList.length - 1].tick ?? 0,
        )
      : firstFrameTick + 1500;

    const roundNum = Number(r.roundNum ?? r.roundNumber ?? rIdx + 1);
    const startTick = Number(r.startTick !== undefined && r.startTick !== 0 ? r.startTick : firstFrameTick);
    const endTick = Number(r.endTick !== undefined && r.endTick !== 0 ? r.endTick : lastFrameTick);
    const freezeEndTick = Number(r.freezeEndTick ?? startTick);

    const sideHint = String(r.winnerSide ?? r.winner ?? 'CT').toUpperCase().trim();
    const isCtWin = sideHint === 'CT' || (sideHint.includes('CT') && !sideHint.includes('T_WIN'));
    const winner: RoundWinnerLabel = isCtWin ? 'CT' : 'TERRORIST';
    const winnerSide: TeamSide = isCtWin ? 'CT' : 'T';
    const winReason = String(r.winReason ?? r.reason ?? (isCtWin ? 'ct_win_elimination' : 't_win_elimination'));
    const reason = normalizeWinReason(winReason, winner);

    const rawKills = Array.isArray(r.kills)
      ? r.kills
      : Array.isArray(r.events?.kills)
      ? r.events.kills
      : [];

    const killsTuples: KillEventTuple[] = rawKills.map((k: any) => {
      if (Array.isArray(k)) {
        return [
          Number(k[0] || 0),
          resolvePlayerId(k[1]),
          resolvePlayerId(k[2]),
          resolveWeaponId(k[3]),
          Boolean(k[4]),
          Boolean(k[5]),
        ];
      }
      return [
        Number(k.tick || 0),
        resolvePlayerId(k.killerId ?? k.killer ?? k.killerSteamId ?? k.attackerSteamId),
        resolvePlayerId(k.victimId ?? k.victim ?? k.victimSteamId),
        resolveWeaponId(k.weaponId ?? k.weapon),
        Boolean(k.headshot ?? k.isHeadshot),
        Boolean(k.penetrated ?? k.wallbang ?? k.isWallbang),
      ];
    });

    const discreteKills: DiscreteKillTuple[] = killsTuples.map((k, kIdx) => {
      const orig = rawKills[kIdx];
      const wpnName = weaponNameById.get(k[3]) ?? `weapon_${k[3]}`;
      return [
        k[0],
        resolveSteamId(k[1]),
        resolveSteamId(k[2]),
        orig?.assisterSteamId ? String(orig.assisterSteamId) : null,
        wpnName,
        k[4],
        k[5],
        Boolean(orig?.throughSmoke ?? orig?.isThroughSmoke),
        Boolean(orig?.attackerBlind ?? orig?.isAttackerBlind),
      ];
    });

    const rawDamages = Array.isArray(r.damages)
      ? r.damages
      : Array.isArray(r.events?.damages)
      ? r.events.damages
      : [];

    const damagesTuples: DamageEventTuple[] = rawDamages.map((d: any) => {
      if (Array.isArray(d)) {
        return [
          Number(d[0] || 0),
          resolvePlayerId(d[1]),
          resolvePlayerId(d[2]),
          Number(d[3] || 0),
          String(d[4] || 'generic'),
          resolveWeaponId(d[5]),
        ];
      }
      return [
        Number(d.tick || 0),
        resolvePlayerId(d.attacker ?? d.attackerSteamId ?? d.attackerId),
        resolvePlayerId(d.victim ?? d.victimSteamId ?? d.victimId),
        Number(d.damage ?? d.healthDamage ?? 0),
        String(d.hitgroup || 'generic'),
        resolveWeaponId(d.weaponId ?? d.weapon),
      ];
    });

    const discreteDamages: DiscreteDamageTuple[] = damagesTuples.map((d) => [
      d[0],
      resolveSteamId(d[1]),
      resolveSteamId(d[2]),
      weaponNameById.get(d[5]) ?? `weapon_${d[5]}`,
      d[3],
      0,
    ]);

    const rawUtility = Array.isArray(r.utility)
      ? r.utility
      : Array.isArray(r.events?.utility)
      ? r.events.utility
      : [];

    const utilityTuples: UtilityEventTuple[] = rawUtility.map((u: any) => {
      if (Array.isArray(u)) {
        return [
          Number(u[0] || 0),
          String(u[1] || 'SMOKE'),
          Number(u[2] || 0),
          Number(u[3] || 0),
          Number(u[4] || 0),
          Number(u[5] || u[0] || 0),
          Number(u[6] || u[0] || 0),
        ];
      }
      return [
        Number(u.tick || 0),
        String(u.type || 'SMOKE'),
        Number(u.x || 0),
        Number(u.y || 0),
        Number(u.z || 0),
        Number(u.startTick ?? u.tick ?? 0),
        Number(u.endTick ?? u.tick ?? 0),
      ];
    });

    const rawBomb = Array.isArray(r.bomb)
      ? r.bomb
      : Array.isArray(r.events?.bomb)
      ? r.events.bomb
      : [];

    const bombTuples: BombEventTuple[] = rawBomb.map((b: any) => {
      if (Array.isArray(b)) {
        return [
          Number(b[0] || 0),
          String(b[1] || 'bomb_planted'),
          resolvePlayerId(b[2]),
          Number(b[3] || 0),
          Number(b[4] || 0),
        ];
      }
      return [
        Number(b.tick || 0),
        String(b.event || 'bomb_planted'),
        resolvePlayerId(b.player ?? b.playerId ?? b.playerSteamId),
        Number(b.x || 0),
        Number(b.y || 0),
      ];
    });

    const normalizePlayerTuple14 = (p: any, pIdx: number): RawPlayerFrame => {
      if (Array.isArray(p)) {
        if (p.length >= 21) {
          return [
            resolvePlayerId(p[0]) || pIdx + 1,
            Number(p[1] ?? 0),
            Number(p[2] ?? 0),
            Number(p[3] ?? -200),
            Number(p[4] ?? 0),
            Number(p[9] ?? 100),
            Number(p[10] ?? 100),
            p[11] ? 1 : 0,
            p[12] ? 1 : 0,
            p[16] ? 1 : 0,
            0,
            resolveWeaponId(p[13]),
            Number(p[21] ?? 0),
            15,
          ];
        }
        if (p.length >= 17) {
          return [
            resolvePlayerId(p[0]) || pIdx + 1,
            Number(p[1] ?? 0),
            Number(p[2] ?? 0),
            Number(p[3] ?? -200),
            Number(p[4] ?? 0),
            Number(p[6] ?? 100),
            Number(p[7] ?? 100),
            p[8] ? 1 : 0,
            p[9] ? 1 : 0,
            p[11] ? 1 : 0,
            p[12] ? 1 : 0,
            resolveWeaponId(p[13]),
            p[10] ? 2.0 : 0,
            15,
          ];
        }
        return [
          resolvePlayerId(p[0]) || pIdx + 1,
          Number(p[1] ?? 0),
          Number(p[2] ?? 0),
          Number(p[3] ?? -200),
          Number(p[4] ?? 0),
          Number(p[5] ?? 100),
          Number(p[6] ?? 100),
          p[7] === 1 || p[7] === true ? 1 : 0,
          p[8] === 1 || p[8] === true ? 1 : 0,
          p[9] === 1 || p[9] === true ? 1 : 0,
          p[10] === 1 || p[10] === true ? 1 : 0,
          resolveWeaponId(p[11]),
          Number(p[12] ?? 0),
          Number(p[13] ?? 15),
        ];
      }
      if (typeof p === 'object' && p !== null) {
        const hp = Number(p.hp ?? p.health ?? (p.isAlive === false || p.is_alive === false ? 0 : 100));
        const isAlive =
          p.isAlive !== undefined
            ? (p.isAlive ? 1 : 0)
            : p.is_alive !== undefined
            ? (p.is_alive ? 1 : 0)
            : hp > 0
            ? 1
            : 0;

        return [
          resolvePlayerId(p.id ?? p.playerId ?? p.steamId ?? p.steamid ?? p.player_steamid ?? p.user_id) || pIdx + 1,
          Number(p.x ?? p.X ?? p.percentX ?? 0),
          Number(p.y ?? p.Y ?? p.percentY ?? 0),
          Number(p.z ?? p.Z ?? p.worldZ ?? -200),
          Number(p.yaw ?? p.ang_yaw ?? 0),
          hp,
          Number(p.armor ?? p.armor_value ?? 100),
          p.hasHelmet || p.has_helmet ? 1 : 0,
          isAlive,
          p.isDefusing || p.is_defusing ? 1 : 0,
          p.isPlanting || p.is_planting ? 1 : 0,
          resolveWeaponId(p.weaponId ?? p.weapon_id ?? p.activeWeaponId ?? p.activeWeapon ?? p.active_weapon_name ?? p.active_weapon),
          Number(p.flashDuration ?? p.flash_duration ?? 0),
          Number(p.ping ?? 15),
        ];
      }
      return [pIdx + 1, 0, 0, -200, 0, 100, 100, 1, 1, 0, 0, 7, 0, 15];
    };

    const frames: RawFrame[] = rawFramesList.map((f: any, fIdx: number) => {
      const tick = Number(Array.isArray(f) ? f[0] : f?.tick ?? startTick + fIdx * samplingRate);
      const players = Array.isArray(f)
        ? Array.isArray(f[1])
          ? f[1].map((p: any, idx: number) => normalizePlayerTuple14(p, idx))
          : []
        : Array.isArray(f.players)
        ? f.players.map((p: any, idx: number) => normalizePlayerTuple14(p, idx))
        : [];
      return [tick, players];
    });

    frames.sort((a, b) => a[0] - b[0]);

    const extrasByTick: Record<string, any[]> =
      r.playerExtrasByTick && typeof r.playerExtrasByTick === 'object'
        ? r.playerExtrasByTick
        : {};

    const plantEvent = bombTuples.find(([, ev]) => ev.toLowerCase().includes('plant'));
    const defuseEvent = bombTuples.find(([, ev]) => ev.toLowerCase().includes('defus'));
    const explodeEvent = bombTuples.find(([, ev]) => ev.toLowerCase().includes('explod'));
    const plantDurationTicks = Math.round(3.2 * tickrate);

    const tacticalFrames: TacticalSnapshotFrame[] = frames.map(([tick, plList]) => {
      let c4CarrierPlayer: RawPlayerFrame | undefined;
      let defusingPlayer: RawPlayerFrame | undefined;
      let plantingPlayer: RawPlayerFrame | undefined;

      const compactPlayers: CompactPlayerTuple[] = plList.map((p) => {
        const pId = p[0];
        const wpnName = weaponNameById.get(p[11]) ?? `weapon_${p[11]}`;
        const isAlive = p[8] === 1;
        const isDefusing = p[9] === 1;
        const isPlanting = p[10] === 1;
        const hasDefuser = pId <= 5 ? 1 : 0;
        const hasC4 = isPlanting ? 1 : 0;

        if (isAlive && hasC4) c4CarrierPlayer = p;
        if (isAlive && isDefusing) defusingPlayer = p;
        if (isAlive && isPlanting) plantingPlayer = p;

        return [
          pId,
          p[1],
          p[2],
          p[3],
          p[4],
          0,
          p[5],
          p[6],
          p[7],
          p[8],
          p[12] > 0.1 ? 1 : 0,
          p[9],
          p[10],
          wpnName,
          hasC4,
          hasDefuser,
          800,
        ];
      });

      let bombState: BombLifecycleState = 'carried';
      let bombX = c4CarrierPlayer?.[1] ?? plList[0]?.[1] ?? 0;
      let bombY = c4CarrierPlayer?.[2] ?? plList[0]?.[2] ?? 0;
      let bombZ = c4CarrierPlayer?.[3] ?? plList[0]?.[3] ?? 0;
      let carrierId: number | null = c4CarrierPlayer?.[0] ?? null;
      let defuserId: number | null = null;
      let timerRemaining = 40.0;

      if (plantEvent && tick >= plantEvent[0]) {
        bombState = 'planted';
        bombX = plantEvent[3];
        bombY = plantEvent[4];
        carrierId = null;
        const elapsedSec = Math.max(0, (tick - plantEvent[0]) / tickrate);
        timerRemaining = Math.max(0, 40.0 - elapsedSec);

        if (defuseEvent && tick >= defuseEvent[0]) {
          bombState = 'defused';
          defuserId = defuseEvent[2];
          timerRemaining = 0;
        } else if (explodeEvent && tick >= explodeEvent[0]) {
          bombState = 'exploded';
          timerRemaining = 0;
        } else if (defusingPlayer) {
          bombState = 'defusing';
          defuserId = defusingPlayer[0];
        }
      } else if (plantingPlayer) {
        bombState = 'planting';
        bombX = plantingPlayer[1];
        bombY = plantingPlayer[2];
        carrierId = plantingPlayer[0];
      }

      const bombTuple: ContinuousBombTuple = [
        bombX,
        bombY,
        bombZ,
        bombState,
        carrierId,
        defuserId,
        timerRemaining,
      ];

      const activeGrenades: ActiveGrenadeTuple[] = utilityTuples
        .filter((u) => tick >= u[5] && tick <= u[6])
        .map((u, uIdx) => [
          uIdx + 1,
          0,
          normalizeGrenadeType(u[1]),
          u[2],
          u[3],
          u[4],
          0,
          0,
          0,
          1,
          144,
          'detonated',
        ]);

      return {
        tick,
        players: compactPlayers,
        bomb: bombTuple,
        grenades: activeGrenades,
      };
    });

    const discreteShots: DiscreteShotTuple[] = damagesTuples.map((d) => [
      d[0],
      resolveSteamId(d[1]),
      weaponNameById.get(d[5]) ?? `weapon_${d[5]}`,
      0,
      0,
      0,
    ]);

    const discreteEvents: DiscreteEventsTable = {
      kills: discreteKills,
      damages: discreteDamages,
      shots: discreteShots,
      utilityEvents: {
        grenade_thrown: [],
        grenade_detonate: [],
        smoke_start: [],
        smoke_end: [],
        inferno_start: [],
      },
    };

    return {
      ...r,
      roundNum,
      roundNumber: roundNum,
      startTick,
      freezeEndTick,
      endTick,
      winner,
      winnerSide,
      reason,
      winReason,
      buyTypeCT: r.buyTypeCT ?? (roundNum === 1 || roundNum === 13 ? 'Pistol' : 'Full Buy'),
      buyTypeT: r.buyTypeT ?? (roundNum === 1 || roundNum === 13 ? 'Pistol' : 'Full Buy'),
      equipValueCT: Number(r.equipValueCT ?? 0),
      equipValueT: Number(r.equipValueT ?? 0),
      playerExtrasByTick: extrasByTick,
      combatLines: r.combatLines || [],
      frames,
      tacticalFrames,
      kills: killsTuples,
      damages: damagesTuples,
      utility: utilityTuples,
      bomb: bombTuples,
      events: {
        damages: damagesTuples,
        kills: killsTuples,
        utility: utilityTuples,
        bomb: bombTuples,
      },
      discreteEvents,
    };
  });

  let team1Score = 0;
  let team2Score = 0;
  for (const r of normalizedRounds) {
    if (r.winnerSide === 'CT') team2Score++;
    else team1Score++;
  }

  const teams = rawJson.teams ?? {
    team1: { name: rawJson.team1Name ?? 'FURIA', score: team1Score || 13 },
    team2: { name: rawJson.team2Name ?? 'Aurora', score: team2Score || 10 },
  };

  return {
    formatVersion: rawJson.formatVersion ?? '2.0',
    mapName: String(map),
    map,
    tickrate,
    samplingRate,
    snapshotRate,
    teams,
    roster,
    playersManifest: manifest,
    weaponsManifest,
    rounds: normalizedRounds,
  };
}

export async function fetchAndDecompressReplay(
  matchId: string,
  signal?: AbortSignal,
): Promise<TacticalReplayPayload> {
  const res = await fetch(`/api/replays/${encodeURIComponent(matchId)}`, { signal });

  if (!res.ok) {
    throw new Error(`Falha ao carregar telemetria (/api/replays/${matchId}): HTTP ${res.status}`);
  }

  let parsedJson: Record<string, any> | null = null;

  try {
    if (res.body && typeof res.body.getReader === 'function') {
      const text = await decompressGzipChunksToText(res.body);
      if (text) parsedJson = JSON.parse(text);
    } else if (typeof res.arrayBuffer === 'function') {
      const buf = await res.arrayBuffer();
      const text = await decompressGzipChunksToText(buf);
      if (text) parsedJson = JSON.parse(text);
    }
  } catch (err) {
    console.warn('[fetchAndDecompressReplay] Aviso na descompressão:', err);
  }

  if (!parsedJson && typeof res.json === 'function') {
    try {
      parsedJson = await res.json();
    } catch {}
  }

  if (!parsedJson) {
    throw new Error(`Payload vazio para partida ${matchId}`);
  }

  return normalizeReplayPayload(parsedJson, matchId);
}

export function normalizeTeam(val: unknown): Team {
  if (val === 'CT' || val === 3 || val === '3') return 'CT';
  if (val === 'T' || val === 'TERRORIST' || val === 2 || val === '2') return 'T';
  if (typeof val === 'string') {
    const s = val.toUpperCase();
    if (s.includes('CT')) return 'CT';
    if (s.includes('T') || s.includes('TERROR')) return 'T';
  }
  return 'CT';
}

export function normalizePlayerTuple(
  raw: RawPlayerTuple | Partial<PlayerState> | Record<string, any> | unknown[],
  meta?: { name?: string; team?: Team } | Record<string | number, { name?: string; team?: Team }>
): PlayerState {
  if (Array.isArray(raw)) {
    if (raw.length >= 21) {
      const id = raw[0] !== undefined && raw[0] !== null ? (typeof raw[0] === 'number' ? raw[0] : String(raw[0])) : 0;
      const x = Number(raw[1] ?? 0);
      const y = Number(raw[2] ?? 0);
      const z = Number(raw[3] ?? 0);
      const yaw = Number(raw[4] ?? 0);
      const pitch = Number(raw[5] ?? 0);
      const vx = Number(raw[6] ?? 0);
      const vy = Number(raw[7] ?? 0);
      const vz = Number(raw[8] ?? 0);
      const speed2D = Math.hypot(vx, vy);
      const hp = Number(raw[9] ?? 100);
      const armor = Number(raw[10] ?? 0);
      const hasHelmet = Boolean(raw[11]);
      const isAlive = raw[12] === undefined ? hp > 0 : Boolean(raw[12]);
      const activeWeapon = String(raw[13] ?? 'knife');
      const money = Number(raw[14] ?? 0);
      const team = normalizeTeam(raw[15]);
      const isDefusing = Boolean(raw[16]);
      const hasDefuser = Boolean(raw[17]);
      const isScoped = Boolean(raw[18]);
      const isCrouching = Boolean(raw[19]);
      const isAirborne = Boolean(raw[20]);
      const flashDuration = Number(raw[21] ?? 0);

      const resolvedMeta = meta && typeof meta === 'object' && ('name' in meta || 'team' in meta)
        ? (meta as { name?: string; team?: Team })
        : (meta as Record<string | number, { name?: string; team?: Team }>)?.[id];

      return {
        id,
        name: resolvedMeta?.name || `Player ${id}`,
        team: resolvedMeta?.team || team,
        x,
        y,
        z,
        yaw,
        pitch,
        velocity: { x: vx, y: vy, z: vz, speed2D },
        hp: isAlive ? hp : 0,
        armor: isAlive ? armor : 0,
        hasHelmet: isAlive ? hasHelmet : false,
        hasDefuser: isAlive ? hasDefuser : false,
        isAlive,
        activeWeapon,
        money,
        isDefusing: isAlive ? isDefusing : false,
        isScoped: isAlive ? isScoped : false,
        isCrouching: isAlive ? isCrouching : false,
        isAirborne: isAlive ? isAirborne : false,
        flashDuration: isAlive ? flashDuration : 0,
      };
    }

    if (raw.length === 17) {
      const id = raw[0] !== undefined && raw[0] !== null ? (typeof raw[0] === 'number' ? raw[0] : String(raw[0])) : 0;
      const x = Number(raw[1] ?? 0);
      const y = Number(raw[2] ?? 0);
      const z = Number(raw[3] ?? 0);
      const yaw = Number(raw[4] ?? 0);
      const pitch = Number(raw[5] ?? 0);
      const hp = Number(raw[6] ?? 100);
      const armor = Number(raw[7] ?? 0);
      const hasHelmet = Boolean(raw[8]);
      const isAlive = raw[9] === undefined ? hp > 0 : Boolean(raw[9]);
      const flashDuration = Number(raw[10] ?? 0);
      const isDefusing = Boolean(raw[11]);
      const isPlanting = Boolean(raw[12]);
      const rawWpn = raw[13];
      const activeWeapon = rawWpn !== undefined ? (typeof rawWpn === 'number' ? `weapon_${rawWpn}` : String(rawWpn)) : 'knife';
      const hasC4 = Boolean(raw[14]);
      const hasDefuser = Boolean(raw[15]);
      const money = Number(raw[16] ?? 800);

      const resolvedMeta = meta && typeof meta === 'object' && ('name' in meta || 'team' in meta)
        ? (meta as { name?: string; team?: Team })
        : (meta as Record<string | number, { name?: string; team?: Team }>)?.[id];

      return {
        id,
        name: resolvedMeta?.name || `Player ${id}`,
        team: resolvedMeta?.team || 'CT',
        x,
        y,
        z,
        yaw,
        pitch,
        velocity: { x: 0, y: 0, z: 0, speed2D: 0 },
        hp: isAlive ? hp : 0,
        armor: isAlive ? armor : 0,
        hasHelmet: isAlive ? hasHelmet : false,
        hasDefuser: isAlive ? hasDefuser : false,
        isAlive,
        activeWeapon,
        money,
        isDefusing: isAlive ? isDefusing : false,
        isPlanting: isAlive ? isPlanting : false,
        isScoped: false,
        isCrouching: false,
        isAirborne: false,
        flashDuration: isAlive ? flashDuration : 0,
      };
    }

    const id = raw[0] !== undefined && raw[0] !== null ? (typeof raw[0] === 'number' ? raw[0] : String(raw[0])) : 0;
    const x = Number(raw[1] ?? 0);
    const y = Number(raw[2] ?? 0);
    const z = Number(raw[3] ?? 0);
    const yaw = Number(raw[4] ?? 0);
    const hp = Number(raw[5] ?? 100);
    const armor = Number(raw[6] ?? 0);
    const hasHelmet = Boolean(raw[7]);
    const isAlive = raw[8] === undefined ? hp > 0 : Boolean(raw[8]);
    const isDefusing = Boolean(raw[9]);
    const isPlanting = Boolean(raw[10]);
    const wpn = raw[11] !== undefined ? (typeof raw[11] === 'number' ? `weapon_${raw[11]}` : String(raw[11])) : 'knife';
    const flashDuration = Number(raw[12] ?? 0);
    const ping = Number(raw[13] ?? 15);

    const resolvedMeta = meta && typeof meta === 'object' && ('name' in meta || 'team' in meta)
      ? (meta as { name?: string; team?: Team })
      : (meta as Record<string | number, { name?: string; team?: Team }>)?.[id];

    return {
      id,
      name: resolvedMeta?.name || `Player ${id}`,
      team: resolvedMeta?.team || 'CT',
      x,
      y,
      z,
      yaw,
      pitch: 0,
      velocity: { x: 0, y: 0, z: 0, speed2D: 0 },
      hp: isAlive ? hp : 0,
      armor: isAlive ? armor : 0,
      hasHelmet: isAlive ? hasHelmet : false,
      hasDefuser: false,
      isAlive,
      activeWeapon: wpn,
      money: 800,
      isDefusing: isAlive ? isDefusing : false,
      isPlanting: isAlive ? isPlanting : false,
      isScoped: false,
      isCrouching: false,
      isAirborne: false,
      flashDuration: isAlive ? flashDuration : 0,
      ping,
    };
  }

  const obj = (raw || {}) as Record<string, any>;
  const id = obj.id ?? obj.playerId ?? obj.steamId ?? obj.steamid ?? 0;
  const x = Number(obj.x ?? obj.worldX ?? obj.percentX ?? 0);
  const y = Number(obj.y ?? obj.worldY ?? obj.percentY ?? 0);
  const z = Number(obj.z ?? obj.worldZ ?? 0);
  const yaw = Number(obj.yaw ?? obj.ang_yaw ?? 0);
  const pitch = Number(obj.pitch ?? obj.ang_pitch ?? 0);
  const vx = Number(obj.vx ?? obj.velocity?.x ?? 0);
  const vy = Number(obj.vy ?? obj.velocity?.y ?? 0);
  const vz = Number(obj.vz ?? obj.velocity?.z ?? 0);
  const speed2D = obj.velocity?.speed2D !== undefined ? Number(obj.velocity.speed2D) : Math.hypot(vx, vy);
  const hp = Number(obj.hp ?? obj.health ?? (obj.isAlive === false || obj.is_alive === false ? 0 : 100));
  const armor = Number(obj.armor ?? obj.armor_value ?? 0);
  const hasHelmet = Boolean(obj.hasHelmet ?? obj.has_helmet);
  const isAlive = obj.isAlive !== undefined ? Boolean(obj.isAlive) : obj.is_alive !== undefined ? Boolean(obj.is_alive) : hp > 0;
  const activeWeapon = String(obj.activeWeapon ?? obj.weapon ?? obj.active_weapon_name ?? obj.weaponId ?? 'knife');
  const money = Number(obj.money ?? 0);
  const team = normalizeTeam(obj.team ?? obj.teamSide);
  const isDefusing = Boolean(obj.isDefusing ?? obj.is_defusing);
  const hasDefuser = Boolean(obj.hasDefuser ?? obj.has_defuser);
  const isScoped = Boolean(obj.isScoped ?? obj.is_scoped);
  const isCrouching = Boolean(obj.isCrouching ?? obj.is_crouching);
  const isAirborne = Boolean(obj.isAirborne ?? obj.is_airborne);
  const flashDuration = Number(obj.flashDuration ?? obj.flash_duration ?? 0);

  const resolvedMeta = meta && typeof meta === 'object' && ('name' in meta || 'team' in meta)
    ? (meta as { name?: string; team?: Team })
    : (meta as Record<string | number, { name?: string; team?: Team }>)?.[id];

  return {
    id,
    name: obj.name || resolvedMeta?.name || `Player ${id}`,
    team: resolvedMeta?.team || team,
    x,
    y,
    z,
    yaw,
    pitch,
    velocity: { x: vx, y: vy, z: vz, speed2D },
    hp,
    armor,
    hasHelmet,
    hasDefuser,
    isAlive,
    activeWeapon,
    money,
    isDefusing,
    isScoped,
    isCrouching,
    isAirborne,
    flashDuration,
    ping: obj.ping !== undefined ? Number(obj.ping) : undefined,
    kills: obj.kills !== undefined ? Number(obj.kills) : undefined,
    deaths: obj.deaths !== undefined ? Number(obj.deaths) : undefined,
    assists: obj.assists !== undefined ? Number(obj.assists) : undefined,
    adr: obj.adr !== undefined ? Number(obj.adr) : undefined,
    color: obj.color,
  };
}

export const parsePlayerTuple = normalizePlayerTuple;

export function decompressFrame(
  rawFrame: CompressedFrame | Frame | any,
  playerMetaMap?: Record<string | number, { name?: string; team?: Team }>
): Frame {
  if (!rawFrame) {
    return { tick: 0, players: [] };
  }

  if (rawFrame.players && Array.isArray(rawFrame.players) && typeof rawFrame.tick === 'number') {
    return {
      tick: rawFrame.tick,
      players: rawFrame.players.map((p: any) => normalizePlayerTuple(p, playerMetaMap)),
    };
  }

  if (Array.isArray(rawFrame)) {
    const tick = Number(rawFrame[0] || 0);
    const rawPlayers = Array.isArray(rawFrame[1]) ? rawFrame[1] : [];
    return {
      tick,
      players: rawPlayers.map((p: any) => normalizePlayerTuple(p, playerMetaMap)),
    };
  }

  return { tick: 0, players: [] };
}

export function decompressRound(round: RoundData | any): RoundData {
  if (!round) return round;
  const frames = Array.isArray(round.frames)
    ? round.frames.map((f: any) => decompressFrame(f))
    : [];

  return {
    ...round,
    frames,
  };
}