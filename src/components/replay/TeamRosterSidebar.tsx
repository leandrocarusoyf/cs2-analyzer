import React from 'react';
import type {
  PlayerManifestEntry,
  TeamSide,
  WeaponManifestEntry,
} from '../../types/replay.ts';
import type { InterpolatedPlayerState } from '../../types/replayer-engine.ts';
import { FALLBACK_WEAPONS_MANIFEST } from '../../lib/replay/decompress.ts';
import { TEAM_CANONICAL_COLORS } from '../../lib/replay/constants.ts';
import {
  getEventIconPath,
  getWeaponIconPath,
} from '../../utils/icon-mapper.ts';

export interface RosterPlayerRowData {
  playerNumber: number;
  playerId: number;
  name: string;
  side: TeamSide;
  money: number;
  hp: number;
  armor: number;
  hasHelmet: boolean;
  hasDefuser?: boolean;
  isAlive: boolean;
  weaponName: string;
  activeWeaponId: number;
}

export interface TeamBlockDescriptor {
  side: TeamSide;
  label: string;
  accentColor: string;
  players: RosterPlayerRowData[];
  score: number;
}

export function buildMR12TeamBlocks(
  roundNumber: number,
  playersManifest: ReadonlyArray<PlayerManifestEntry>,
  playerStates: ReadonlyArray<InterpolatedPlayerState>,
  weaponsManifest: ReadonlyArray<WeaponManifestEntry> = [],
  playerMoneyById: Readonly<Record<number, number>> = {},
  playerDefusersById: Readonly<Record<number, boolean>> = {},
  teamScoreCt?: number,
  teamScoreT?: number,
): [TeamBlockDescriptor, TeamBlockDescriptor] {
  const isPostHalftime = roundNumber <= 24 ? roundNumber >= 13 : Math.floor((roundNumber - 25) / 3) % 2 === 1;

  const stateById = new Map<number, any>();
  for (const state of playerStates) {
    const pid = Number((state as any).id ?? (state as any).playerId);
    if (pid > 0) stateById.set(pid, state);
  }

  const weaponNameById = new Map<number, string>();
  for (const weapon of FALLBACK_WEAPONS_MANIFEST) {
    weaponNameById.set(weapon.id, weapon.name.replace(/^weapon_/, '').toUpperCase());
  }
  for (const weapon of weaponsManifest) {
    weaponNameById.set(weapon.id, weapon.name.replace(/^weapon_/, '').toUpperCase());
  }

  const ctPlayers: RosterPlayerRowData[] = [];
  const tPlayers: RosterPlayerRowData[] = [];

  playersManifest.forEach((manifest) => {
    const currentSide: TeamSide = isPostHalftime
      ? manifest.initialTeam === 'CT'
        ? 'T'
        : 'CT'
      : manifest.initialTeam;

    const liveState = stateById.get(manifest.id);
    const isAlive = liveState ? Boolean(liveState.isAlive) : true;
    const hp = liveState ? (isAlive ? Number(liveState.hp ?? 100) : 0) : 100;
    const armor = liveState ? Number(liveState.armor ?? 100) : 100;
    const hasHelmet = liveState ? Boolean(liveState.hasHelmet) : false;
    const activeWeaponId = liveState ? Number(liveState.activeWeaponId ?? 0) : 0;
    const rawWeapon = liveState?.activeWeapon;

    let weaponName = 'KNIFE';
    if (rawWeapon && typeof rawWeapon === 'string' && rawWeapon !== '0' && rawWeapon !== '7') {
      weaponName = rawWeapon.replace(/^weapon_/, '').toUpperCase();
    } else if (activeWeaponId > 0 && weaponNameById.has(activeWeaponId)) {
      weaponName = weaponNameById.get(activeWeaponId)!;
    } else if (activeWeaponId === 7 || rawWeapon === '7') {
      weaponName = 'AK47';
    }

    const defaultFallbackMoney = 0;
    const money = playerMoneyById[manifest.id] ?? liveState?.money ?? defaultFallbackMoney;
    const hasDefuser =
      currentSide === 'CT'
        ? (playerDefusersById[manifest.id] ?? liveState?.hasDefuser ?? false)
        : false;

    const row: RosterPlayerRowData = {
      playerNumber: 0,
      playerId: manifest.id,
      name: manifest.name,
      side: currentSide,
      money,
      hp,
      armor,
      hasHelmet,
      hasDefuser,
      isAlive,
      weaponName,
      activeWeaponId,
    };

    if (currentSide === 'CT') {
      ctPlayers.push(row);
    } else {
      tPlayers.push(row);
    }
  });

  ctPlayers.forEach((p, idx) => {
    p.playerNumber = idx + 1;
  });
  tPlayers.forEach((p, idx) => {
    p.playerNumber = idx + 6;
  });

  const ctScore = teamScoreCt ?? 0;
  const tScore = teamScoreT ?? 0;

  const ctBlock: TeamBlockDescriptor = {
    side: 'CT',
    label: 'Equipe CT',
    accentColor: TEAM_CANONICAL_COLORS.CT,
    players: ctPlayers,
    score: ctScore,
  };

  const tBlock: TeamBlockDescriptor = {
    side: 'T',
    label: 'Equipe T',
    accentColor: TEAM_CANONICAL_COLORS.TERRORIST,
    players: tPlayers,
    score: tScore,
  };

  return isPostHalftime ? [tBlock, ctBlock] : [ctBlock, tBlock];
}

export interface UtilitySlotItem {
  type: 'smoke' | 'flashbang' | 'he' | 'molotov';
  icon: string;
  label: string;
  spent: boolean;
}

export interface TeamRosterSidebarProps {
  roundNumber: number;
  playersManifest: ReadonlyArray<PlayerManifestEntry>;
  playerStates: ReadonlyArray<InterpolatedPlayerState>;
  weaponsManifest?: ReadonlyArray<WeaponManifestEntry>;
  playerMoneyById?: Readonly<Record<number, number>>;
  playerDefusersById?: Readonly<Record<number, boolean>>;
  playerHasC4ById?: Readonly<Record<number, boolean>>;
  playerCalloutsById?: Readonly<Record<number, string>>;
  playerInventoryById?: Readonly<Record<number, number[]>>;
  spentUtilityCountByPlayerId?: Readonly<Record<number, number>>;
  teamScoreCt?: number;
  teamScoreT?: number;
  filterSide?: TeamSide;
  testIdBlockOverride?: 'top' | 'bottom';
}

const DEFAULT_BELT_SLOTS: ReadonlyArray<{
  type: 'smoke' | 'flashbang' | 'he' | 'molotov';
  weaponIds: number[];
  icon: string;
  label: string;
}> = [
  { type: 'smoke', weaponIds: [45], icon: '/icons/icon-smokegrenade.svg', label: 'Smoke' },
  { type: 'flashbang', weaponIds: [43], icon: '/icons/icon-flashbang.svg', label: 'Flashbang' },
  { type: 'he', weaponIds: [44], icon: '/icons/icon-hegrenade.svg', label: 'HE Grenade' },
  { type: 'molotov', weaponIds: [46, 48], icon: '/icons/icon-molotov.svg', label: 'Molotov / Incendiária' },
];

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}

function getHpBarColor(hp: number): string {
  if (hp > 50) return '#00FFA3';
  if (hp > 20) return '#F59E0B';
  return '#FF4757';
}

export function TeamRosterSidebar({
  roundNumber,
  playersManifest,
  playerStates,
  weaponsManifest = [],
  playerMoneyById = {},
  playerDefusersById = {},
  playerHasC4ById = {},
  playerCalloutsById = {},
  playerInventoryById = {},
  spentUtilityCountByPlayerId = {},
  teamScoreCt,
  teamScoreT,
  filterSide,
  testIdBlockOverride,
}: TeamRosterSidebarProps) {
  const [topBlock, bottomBlock] = buildMR12TeamBlocks(
    roundNumber,
    playersManifest,
    playerStates,
    weaponsManifest,
    playerMoneyById,
    playerDefusersById,
    teamScoreCt,
    teamScoreT,
  );

  const renderTeamBlock = (
    block: TeamBlockDescriptor,
    position: 'top' | 'bottom',
  ) => {
    const canonicalColor = block.side === 'CT' ? '#2563EB' : '#EAB308';

    return (
      <div
        key={`${position}-${block.side}`}
        data-testid={`roster-block-${position}`}
        data-team-side={block.side}
        style={{ borderColor: canonicalColor }}
        className="bg-[#111618] border rounded-[2px] flex flex-col overflow-hidden"
      >
        <div className="h-8 px-2.5 py-1 flex items-center justify-between border-b border-[#1F2629] bg-[#0B0E0F]/90 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              style={{ backgroundColor: canonicalColor }}
              className="inline-block h-2.5 w-2.5 rounded-[1px] shrink-0"
            />
            <span className="text-xs font-mono font-bold tracking-wide text-white truncate">
              {block.label}
            </span>
          </div>
          <span
            style={{ color: canonicalColor }}
            className="text-sm font-mono font-black tabular-nums"
          >
            {block.score}
          </span>
        </div>

        <div className="flex flex-col divide-y divide-[#1F2629]/50">
          {block.players.map((player) => {
            const spentCount = spentUtilityCountByPlayerId[player.playerId] ?? 0;
            const callout = playerCalloutsById[player.playerId];
            const invIds = playerInventoryById[player.playerId];
            const hasC4 = playerHasC4ById[player.playerId] ?? (invIds ? invIds.includes(49) : false);

            return (
              <div
                key={player.playerId}
                data-testid={`roster-player-${player.playerId}`}
                data-alive={player.isAlive ? 'true' : 'false'}
                style={{ opacity: player.isAlive ? 1 : 0.38 }}
                className="relative flex flex-col justify-center px-2 py-1.5 bg-[#111618] hover:bg-[#1F2629]/35 transition-colors gap-1"
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      style={{ backgroundColor: canonicalColor }}
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] text-[10px] font-mono font-black text-white"
                    >
                      {player.playerNumber}
                    </span>
                    <span className="text-[11px] font-semibold truncate max-w-[78px] text-white">
                      {player.name}
                    </span>
                    {player.isAlive && callout && (
                      <span
                        data-testid={`roster-callout-${player.playerId}`}
                        className="px-1 py-0.2 rounded-[1px] bg-[#0B0E0F] border border-[#1F2629] text-[10px] font-mono text-[#94A3B8] truncate max-w-[58px]"
                        title={`Setor: ${callout}`}
                      >
                        {callout}
                      </span>
                    )}
                    <span
                      data-testid={`roster-hp-${player.playerId}`}
                      className="text-[10px] font-mono tabular-nums font-bold text-white/90"
                    >
                      {player.isAlive ? `${player.hp} HP` : 'DEAD'}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono font-semibold tabular-nums text-[#00FFA3] shrink-0">
                    {formatMoney(player.money)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-1.5 w-full">
                  <div className="flex items-center gap-1">
                    {player.armor > 0 && (
                      <img
                        src={getEventIconPath(player.hasHelmet ? 'helmet' : 'armor')}
                        alt={player.hasHelmet ? 'Colete + Capacete' : 'Colete'}
                        title={player.hasHelmet ? 'Colete + Capacete' : 'Colete'}
                        className="h-3 w-3 object-contain brightness-0 invert opacity-80 shrink-0"
                        data-testid="armor-icon"
                      />
                    )}
                    {player.side === 'CT' && player.hasDefuser && (
                      <img
                        src={getEventIconPath('defuser')}
                        alt="Defuse Kit"
                        title="Defuse Kit"
                        className="h-3 w-3 object-contain brightness-0 invert opacity-80 shrink-0"
                        data-testid="defuser-icon"
                      />
                    )}
                    {player.side === 'T' && hasC4 && (
                      <span
                        className="px-1 rounded-[1px] bg-[#FACC15]/20 border border-[#FACC15] text-[10px] font-mono font-black text-[#FACC15] leading-tight"
                        title="Portador da C4"
                      >
                        C4
                      </span>
                    )}

                    <div
                      data-testid={`utility-belt-${player.playerId}`}
                      className="flex items-center gap-1 ml-1"
                    >
                      {invIds && invIds.length > 0 ? (
                        DEFAULT_BELT_SLOTS.filter((slot) =>
                          player.isAlive && slot.weaponIds.some((wid) => invIds.includes(wid))
                        ).map((slot) => (
                          <img
                            key={slot.type}
                            src={slot.icon}
                            alt={slot.label}
                            title={`${slot.label} (No Inventário)`}
                            className="h-3 w-3 object-contain brightness-0 invert opacity-90 shrink-0"
                          />
                        ))
                      ) : (
                        DEFAULT_BELT_SLOTS.map((slot, slotIdx) => {
                          const isSpent = !player.isAlive || slotIdx < spentCount;
                          if (isSpent) return null;
                          return (
                            <img
                              key={slot.type}
                              src={slot.icon}
                              alt={slot.label}
                              title={`${slot.label} (No Inventário)`}
                              className="h-3 w-3 object-contain brightness-0 invert opacity-90 shrink-0"
                            />
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <img
                      src={getWeaponIconPath(
                        player.activeWeaponId || player.weaponName,
                      )}
                      alt={player.weaponName}
                      title={player.weaponName}
                      className="h-3.5 max-w-[32px] object-contain brightness-0 invert opacity-95 shrink-0"
                      data-testid="weapon-icon"
                    />
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-[2px] w-full bg-[#1F2629] overflow-hidden">
                  <div
                    style={{
                      width: `${Math.max(0, Math.min(100, player.hp))}%`,
                      backgroundColor: getHpBarColor(player.hp),
                    }}
                    className="h-full transition-all duration-100"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (filterSide) {
    const targetBlock = topBlock.side === filterSide ? topBlock : bottomBlock;
    const pos =
      testIdBlockOverride ?? (topBlock.side === filterSide ? 'top' : 'bottom');
    return (
      <aside
        aria-label={`Roster Lateral ${filterSide}`}
        className="w-[220px] lg:w-[245px] shrink-0 flex flex-col justify-center select-none"
      >
        {renderTeamBlock(targetBlock, pos)}
      </aside>
    );
  }

  return (
    <aside
      aria-label="Painel Lateral de Equipes"
      className="w-full lg:w-[265px] shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-col gap-2.5 justify-start select-none lg:overflow-y-auto"
    >
      {renderTeamBlock(topBlock, 'top')}
      {renderTeamBlock(bottomBlock, 'bottom')}
    </aside>
  );
}

export default TeamRosterSidebar;