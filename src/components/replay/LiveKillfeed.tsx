'use client';

import React, { useMemo } from 'react';
import type {
  DiscreteKillTuple,
  KillEventTuple,
  PlayerManifestEntry,
  TeamSide,
  WeaponManifestEntry,
} from '../../types/replay.ts';
import { TEAM_CANONICAL_COLORS } from '../../lib/replay/constants.ts';
import {
  getEventIconPath,
  getWeaponIconPath,
} from '../../utils/icon-mapper.ts';

export interface EnrichedKillFeedItem {
  tick: number;
  killerId: number;
  victimId: number;
  assisterName?: string | null;
  weaponIdOrName: number | string;
  headshot: boolean;
  wallbang: boolean;
  throughSmoke: boolean;
  attackerBlind: boolean;
  killerSteamId?: string;
  victimSteamId?: string;
}

export interface LiveKillfeedProps {
  kills: ReadonlyArray<KillEventTuple | DiscreteKillTuple | Record<string, any>>;
  currentTick: number;
  tickrate?: number;
  roundNumber?: number;
  playersManifest: ReadonlyArray<PlayerManifestEntry>;
  weaponsManifest?: ReadonlyArray<WeaponManifestEntry>;
  onlyRecentWindow?: boolean;
}

function resolveSideForRound(initialTeam: TeamSide, roundNumber: number): TeamSide {
  if (roundNumber >= 13) {
    return initialTeam === 'CT' ? 'T' : 'CT';
  }
  return initialTeam;
}

export function LiveKillfeed({
  kills,
  currentTick,
  tickrate = 64,
  roundNumber = 1,
  playersManifest,
  weaponsManifest = [],
  onlyRecentWindow = false,
}: LiveKillfeedProps) {
  const playerById = useMemo(() => {
    const map = new Map<number, PlayerManifestEntry>();
    for (const p of playersManifest) map.set(p.id, p);
    return map;
  }, [playersManifest]);

  const playerBySteam = useMemo(() => {
    const map = new Map<string, PlayerManifestEntry>();
    for (const p of playersManifest) map.set(String(p.steamId), p);
    return map;
  }, [playersManifest]);

  const weaponMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const w of weaponsManifest) {
      map.set(w.id, w.name.replace(/^weapon_/, '').toUpperCase());
    }
    return map;
  }, [weaponsManifest]);

  const parsedKills = useMemo<EnrichedKillFeedItem[]>(() => {
    if (!Array.isArray(kills)) return [];

    const resolveId = (v: unknown): number => {
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      const s = String(v ?? '');
      const bySteam = playerBySteam.get(s);
      if (bySteam) return bySteam.id;
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? n : 0;
    };

    return kills
      .map((k): EnrichedKillFeedItem | null => {
        if (!k) return null;
        if (Array.isArray(k)) {
          // 9-item DiscreteKillTuple:
          // [tick, attackerSteamId, victimSteamId, assisterSteamId, weapon, isHeadshot, isWallbang, isThroughSmoke, isAttackerBlind]
          if (k.length >= 9) {
            const assisterEntry = k[3] ? playerBySteam.get(String(k[3])) : undefined;
            return {
              tick: Number(k[0] ?? 0),
              killerId: resolveId(k[1]),
              victimId: resolveId(k[2]),
              assisterName: assisterEntry?.name ?? (k[3] ? String(k[3]) : null),
              weaponIdOrName: String(k[4] ?? 'weapon_ak47'),
              headshot: Boolean(k[5]),
              wallbang: Boolean(k[6]),
              throughSmoke: Boolean(k[7]),
              attackerBlind: Boolean(k[8]),
              killerSteamId: String(k[1]),
              victimSteamId: String(k[2]),
            };
          }
          // 6-item KillEventTuple: [tick, killer, victim, weaponId, headshot, penetrated]
          return {
            tick: Number(k[0] ?? 0),
            killerId: resolveId(k[1]),
            victimId: resolveId(k[2]),
            assisterName: null,
            weaponIdOrName: Number(k[3] ?? 7),
            headshot: Boolean(k[4]),
            wallbang: Boolean(k[5]),
            throughSmoke: false,
            attackerBlind: false,
          };
        }

        if (typeof k === 'object') {
          const obj = k as Record<string, any>;
          const rawKiller =
            obj.killerId ?? obj.killer ?? obj.killerSteamId ?? obj.attackerSteamId ?? 0;
          const rawVictim =
            obj.victimId ?? obj.victim ?? obj.victimSteamId ?? 0;
          return {
            tick: Number(obj.tick ?? 0),
            killerId: resolveId(rawKiller),
            victimId: resolveId(rawVictim),
            assisterName: obj.assisterName ?? obj.assisterSteamId ?? null,
            weaponIdOrName: obj.weapon ?? obj.weaponId ?? 7,
            headshot: Boolean(obj.headshot ?? obj.isHeadshot),
            wallbang: Boolean(obj.penetrated ?? obj.wallbang ?? obj.isWallbang),
            throughSmoke: Boolean(obj.throughSmoke ?? obj.isThroughSmoke),
            attackerBlind: Boolean(obj.attackerBlind ?? obj.isAttackerBlind),
            killerSteamId: String(rawKiller),
            victimSteamId: String(rawVictim),
          };
        }
        return null;
      })
      .filter((item): item is EnrichedKillFeedItem => item !== null);
  }, [kills, playerBySteam]);

  const maxAgeTicks = 5 * tickrate;
  const visibleKills = parsedKills.filter((k) => {
    if (k.tick > currentTick) return false;
    if (onlyRecentWindow && currentTick - k.tick > maxAgeTicks) return false;
    return true;
  });

  return (
    <div
      aria-label="Kill Feed do Round"
      data-testid="kill-feed"
      className="pointer-events-none absolute top-3 right-3 z-20 flex max-w-xs flex-col items-end gap-1.5"
    >
      {visibleKills.length === 0 ? (
        <div className="rounded-[2px] border border-[#1F2629] bg-[#0B0E0F]/90 px-2.5 py-1 text-[10px] font-mono text-[#6B7A82] backdrop-blur-sm">
          Nenhuma eliminação até o tick {Math.floor(currentTick)}
        </div>
      ) : (
        visibleKills.slice(-6).map((kill, idx) => {
          const killer =
            playerById.get(kill.killerId) ??
            (kill.killerSteamId ? playerBySteam.get(kill.killerSteamId) : undefined);
          const victim =
            playerById.get(kill.victimId) ??
            (kill.victimSteamId ? playerBySteam.get(kill.victimSteamId) : undefined);

          const killerSide = killer
            ? resolveSideForRound(killer.initialTeam, roundNumber)
            : 'T';
          const victimSide = victim
            ? resolveSideForRound(victim.initialTeam, roundNumber)
            : 'CT';

          const killerColor =
            killerSide === 'CT'
              ? TEAM_CANONICAL_COLORS.CT
              : TEAM_CANONICAL_COLORS.TERRORIST;
          const victimColor =
            victimSide === 'CT'
              ? TEAM_CANONICAL_COLORS.CT
              : TEAM_CANONICAL_COLORS.TERRORIST;

          const weaponLabel =
            typeof kill.weaponIdOrName === 'number'
              ? weaponMap.get(kill.weaponIdOrName) ?? `WPN #${kill.weaponIdOrName}`
              : String(kill.weaponIdOrName).replace(/^weapon_/, '').toUpperCase();
          const weaponIcon = getWeaponIconPath(kill.weaponIdOrName);
          const headshotIcon = getEventIconPath('headshot');

          const ageSeconds = Math.max(0, (currentTick - kill.tick) / tickrate);
          const isRecentSlide = ageSeconds < 0.5;

          return (
            <div
              key={`${kill.tick}-${kill.killerId}-${kill.victimId}-${idx}`}
              data-testid="kill-feed-entry"
              className={`flex items-center gap-1.5 rounded-[2px] border border-[#1F2629] bg-[#0B0E0F]/95 px-2.5 py-1 text-xs font-mono shadow-md backdrop-blur-sm transition-all duration-200 ${
                isRecentSlide ? 'translate-x-0 ring-1 ring-white/25' : ''
              }`}
            >
              {/* Atacante (+ Assister) */}
              <span
                style={{ color: killerColor }}
                className="font-bold tracking-tight truncate max-w-[95px] uppercase"
              >
                {killer?.name ?? `#${kill.killerId}`}
                {kill.assisterName && (
                  <span className="text-[9px] text-[#94A3B8] font-normal ml-1">
                    +{kill.assisterName}
                  </span>
                )}
              </span>

              {/* Badges de Arma / HS / Wallbang / Smoke / Blind */}
              <div className="flex items-center gap-1 rounded-[2px] bg-[#111618] px-1.5 py-0.5 border border-[#1F2629]">
                {kill.attackerBlind && (
                  <span
                    title="Atacante Cego"
                    className="text-[9px] font-bold text-[#FACC15]"
                  >
                    [FLASH]
                  </span>
                )}
                <img
                  src={weaponIcon}
                  alt={weaponLabel}
                  title={weaponLabel}
                  className="h-3.5 max-w-[36px] object-contain brightness-0 invert opacity-95"
                />
                {kill.wallbang && (
                  <span
                    title="Wallbang (Varado)"
                    className="text-[9px] font-bold text-[#94A3B8]"
                  >
                    [WB]
                  </span>
                )}
                {kill.throughSmoke && (
                  <span
                    title="Através da Smoke"
                    className="text-[9px] font-bold text-[#CBD5E1]"
                  >
                    [SMK]
                  </span>
                )}
                {kill.headshot && (
                  <img
                    src={headshotIcon}
                    alt="Headshot"
                    title="Headshot"
                    className="h-3.5 w-3.5 object-contain brightness-0 invert"
                  />
                )}
              </div>

              {/* Vítima */}
              <span
                style={{ color: victimColor }}
                className="font-bold tracking-tight truncate max-w-[95px] uppercase"
              >
                {victim?.name ?? `#${kill.victimId}`}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

export default LiveKillfeed;

