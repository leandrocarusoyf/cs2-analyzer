'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type {
  BombLifecycleState,
  CombatLineEvent,
  CS2Map,
  PlayerManifestEntry,
  ReplayRound,
  TacticalReplayPayload,
  TeamSide,
  WeaponManifestEntry,
} from '../../types/replay.ts';
import type { MatchWithDetails } from '../../types/stats.ts';
import type { NukeLayer } from '../../types/replayer-engine.ts';
import {
  C4_PLANT_DURATION_SECONDS,
  C4_TIMER_DURATION_SECONDS,
  SMOKE_DURATION_SECONDS,
} from '../../lib/replay/constants.ts';
import {
  FALLBACK_PLAYERS_MANIFEST,
  FALLBACK_WEAPONS_MANIFEST,
  fetchAndDecompressReplay,
} from '../../lib/replay/decompress.ts';
import { interpolateSnapshotFrames } from '../../lib/replay/interpolation.ts';
import { useReplayPlayback } from '../../hooks/useReplayPlayback.ts';
import { MatchHeaderHUD } from './MatchHeaderHUD.tsx';
import {
  ViewportCanvas,
  type ActiveShotEffect,
  type ActiveUtilityVisual,
  type BombVisualState,
  type RecentDeathMarker,
} from './ViewportCanvas.tsx';
import { TelestratorLayer } from './TelestratorLayer.tsx';
import { LiveKillfeed } from './LiveKillfeed.tsx';
import { TeamRosterSidebar } from './TeamRosterSidebar.tsx';
import { PlaybackControls } from './PlaybackControls.tsx';
import { TimelineScrubber } from './TimelineScrubber.tsx';
import { RoundCarousel } from './RoundCarousel.tsx';
import { ReplayHUD } from './ReplayHUD.tsx';

export interface ReplayEngineProps {
  matchId: string;
  initialMatch?: MatchWithDetails | null;
}

export function ReplayEngine({ matchId, initialMatch = null }: ReplayEngineProps) {
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(matchId));
  const [matchData, setMatchData] = useState<MatchWithDetails | null>(initialMatch);
  const [replayPayload, setReplayPayload] =
    useState<TacticalReplayPayload | null>(null);
  const [activeNukeLayer, setActiveNukeLayer] = useState<NukeLayer>('upper');

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    if (matchId) {
      setIsLoading(true);

      const signal =
        typeof AbortSignal !== 'undefined' && controller.signal instanceof AbortSignal
          ? controller.signal
          : undefined;

      const matchPromise = fetch(`/api/matches/${encodeURIComponent(matchId)}`, signal ? { signal } : undefined)
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (isMounted && json?.match) {
            setMatchData(json.match);
          }
        })
        .catch((err) => {
          if (err?.name !== 'AbortError') {
            console.warn('[ReplayEngine] Aviso ao carregar metadados:', err);
          }
        });

      const replayPromise = fetchAndDecompressReplay(matchId, signal)
        .then((payload) => {
          if (isMounted && payload.rounds.length > 0) {
            setReplayPayload(payload);
          }
        })
        .catch((err) => {
          if (err?.name !== 'AbortError') {
            console.error('[ReplayEngine] Erro ao carregar telemetria:', err);
          }
        });

      Promise.allSettled([matchPromise, replayPromise]).finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [matchId]);

  const mapName: CS2Map =
    (replayPayload?.map as CS2Map) ??
    (matchData?.map_name as CS2Map) ??
    'de_inferno';

  const team1Name =
    matchData?.team1 ??
    replayPayload?.teams?.team1?.name ??
    'FURIA';
  const team2Name =
    matchData?.team2 ??
    replayPayload?.teams?.team2?.name ??
    'Aurora';

  const playersManifest: readonly PlayerManifestEntry[] = useMemo(() => {
    if (replayPayload?.playersManifest && replayPayload.playersManifest.length > 0) {
      return replayPayload.playersManifest;
    }
    if (matchData?.players && matchData.players.length > 0) {
      return matchData.players.map((p, idx) => ({
        id: idx + 1,
        steamId: p.player_steamid,
        name: p.nickname,
        initialTeam: (p.team === 'CT' || p.team === matchData.team1 ? 'CT' : 'T') as TeamSide,
      }));
    }
    return FALLBACK_PLAYERS_MANIFEST;
  }, [replayPayload?.playersManifest, matchData]);

  const weaponsManifest: readonly WeaponManifestEntry[] =
    replayPayload?.weaponsManifest ?? FALLBACK_WEAPONS_MANIFEST;
  const tickrate = replayPayload?.tickrate || 64;

  const rounds: readonly ReplayRound[] = useMemo(() => {
    if (replayPayload?.rounds && replayPayload.rounds.length > 0) {
      return replayPayload.rounds;
    }
    return [];
  }, [replayPayload]);

  const playback = useReplayPlayback({
    tickrate,
    samplingRate: replayPayload?.samplingRate || 4,
    rounds,
    initialRoundIndex: 0,
    initialSpeed: 1,
  });

  const activeRound = rounds[playback.currentRoundIndex] ?? rounds[0];
  const roundNumber = activeRound?.roundNumber ?? 1;
  const startTick = activeRound?.startTick ?? 0;
  const endTick = activeRound?.endTick ?? 1000;

  const team1Score =
    (activeRound as any)?.tScore ??
    matchData?.score_t1 ??
    replayPayload?.teams?.team1?.score ??
    13;
  const team2Score =
    (activeRound as any)?.ctScore ??
    matchData?.score_t2 ??
    replayPayload?.teams?.team2?.score ??
    10;

  // Interpolação precisa alimentada diretamente pelos snapshots do round
  const interpolatedPlayers = useMemo(() => {
    const framesToUse =
      activeRound?.tacticalFrames && activeRound.tacticalFrames.length > 0
        ? activeRound.tacticalFrames
        : activeRound?.frames;

    if (!framesToUse || framesToUse.length === 0) return [];
    const tickToUse =
      playback.currentTick === 0 && activeRound?.startTick
        ? activeRound.startTick
        : playback.currentTick;
    return interpolateSnapshotFrames(
      framesToUse,
      tickToUse,
      mapName,
    );
  }, [activeRound?.tacticalFrames, activeRound?.frames, activeRound?.startTick, playback.currentTick, mapName]);

  const {
    playerMoneyById,
    playerDefusersById,
    playerHasC4ById,
    playerCalloutsById,
    playerInventoryById,
  } = useMemo(() => {
    const money: Record<number, number> = {};
    const defusers: Record<number, boolean> = {};
    const hasC4: Record<number, boolean> = {};
    const callouts: Record<number, string> = {};
    const inventory: Record<number, number[]> = {};

    const extrasMap = activeRound?.playerExtrasByTick;
    if (!extrasMap) {
      return {
        playerMoneyById: undefined,
        playerDefusersById: undefined,
        playerHasC4ById: undefined,
        playerCalloutsById: undefined,
        playerInventoryById: undefined,
      };
    }

    const ticks = Object.keys(extrasMap)
      .map(Number)
      .filter((t) => Number.isFinite(t))
      .sort((a, b) => a - b);

    if (ticks.length === 0) {
      return {
        playerMoneyById: undefined,
        playerDefusersById: undefined,
        playerHasC4ById: undefined,
        playerCalloutsById: undefined,
        playerInventoryById: undefined,
      };
    }

    let chosenTick = ticks[0];
    for (const t of ticks) {
      if (t <= playback.currentTick) {
        chosenTick = t;
      } else {
        break;
      }
    }

    const tickExtras = extrasMap[chosenTick];
    if (tickExtras) {
      if (Array.isArray(tickExtras)) {
        for (const item of tickExtras) {
          if (Array.isArray(item)) {
            const pid = Number(item[0]);
            money[pid] = Number(item[1] ?? 0);
            defusers[pid] = Boolean(item[3]);
            hasC4[pid] = Boolean(item[4]);
            if (item[5]) callouts[pid] = String(item[5]);
            if (Array.isArray(item[6])) inventory[pid] = item[6];
          } else if (item && typeof item === 'object') {
            const pid = Number((item as any).playerId ?? (item as any).id);
            if (pid) {
              if ((item as any).money !== undefined) money[pid] = Number((item as any).money);
              if ((item as any).hasDefuser !== undefined) defusers[pid] = Boolean((item as any).hasDefuser);
              if ((item as any).hasC4 !== undefined) hasC4[pid] = Boolean((item as any).hasC4);
              if ((item as any).callout) callouts[pid] = String((item as any).callout);
              if (Array.isArray((item as any).inventory)) inventory[pid] = (item as any).inventory;
            }
          }
        }
      } else if (typeof tickExtras === 'object') {
        for (const [pidStr, ext] of Object.entries(tickExtras)) {
          const pid = Number(pidStr);
          if (Array.isArray(ext)) {
            money[pid] = Number(ext[1] ?? 0);
            defusers[pid] = Boolean(ext[3]);
            hasC4[pid] = Boolean(ext[4]);
            if (ext[5]) callouts[pid] = String(ext[5]);
            if (Array.isArray(ext[6])) inventory[pid] = ext[6];
          } else if (ext && typeof ext === 'object') {
            money[pid] = Number((ext as any).money ?? 0);
            defusers[pid] = Boolean((ext as any).hasDefuser);
            hasC4[pid] = Boolean((ext as any).hasC4);
            if ((ext as any).callout) callouts[pid] = String((ext as any).callout);
            if (Array.isArray((ext as any).inventory)) inventory[pid] = (ext as any).inventory;
          }
        }
      }
    }

    return {
      playerMoneyById: money,
      playerDefusersById: defusers,
      playerHasC4ById: hasC4,
      playerCalloutsById: callouts,
      playerInventoryById: inventory,
    };
  }, [activeRound?.playerExtrasByTick, playback.currentTick]);

  const activeUtilities = useMemo<ActiveUtilityVisual[]>(() => {
    const rawUtility =
      activeRound?.events?.utility ??
      (Array.isArray((activeRound as any)?.utility)
        ? (activeRound as any).utility
        : []);
    if (!Array.isArray(rawUtility)) return [];

    return rawUtility
      .map((u: any, idx: number): ActiveUtilityVisual | null => {
        const rawType = String(Array.isArray(u) ? u[1] : u?.type ?? 'SMOKE').toLowerCase();
        const type: ActiveUtilityVisual['type'] = rawType.includes('smoke')
          ? 'smoke'
          : rawType.includes('inc')
          ? 'incendiary'
          : rawType.includes('molo') || rawType.includes('inferno')
          ? 'molotov'
          : rawType.includes('flash')
          ? 'flashbang'
          : rawType.includes('he') || rawType.includes('frag')
          ? 'he'
          : 'smoke';

        const tick = Number(Array.isArray(u) ? u[0] : u?.tick ?? 0);
        const x = Number(Array.isArray(u) ? u[2] : u?.x ?? 0);
        const y = Number(Array.isArray(u) ? u[3] : u?.y ?? 0);
        const z = Number(Array.isArray(u) ? u[4] : u?.z ?? 0);
        const sTick = Number(Array.isArray(u) ? u[5] ?? tick : u?.startTick ?? tick);
        const defaultDurationTicks =
          type === 'smoke' ? Math.round(SMOKE_DURATION_SECONDS * tickrate) : Math.round(7 * tickrate);
        const eTick = Number(
          Array.isArray(u)
            ? u[6] || sTick + defaultDurationTicks
            : u?.endTick || sTick + defaultDurationTicks,
        );

        return {
          id: `util-${idx}-${sTick}`,
          type,
          x,
          y,
          z,
          throwTick: tick,
          startTick: sTick,
          endTick: Math.max(sTick + 12, eTick),
        };
      })
      .filter((u): u is ActiveUtilityVisual => u !== null)
      .filter((u) => playback.currentTick >= u.startTick && playback.currentTick <= u.endTick);
  }, [activeRound, playback.currentTick, tickrate]);

  const { activeBomb, bombPlantTick } = useMemo<{
    activeBomb: BombVisualState | null;
    bombPlantTick: number | null;
  }>(() => {
    const rawBomb =
      activeRound?.events?.bomb ??
      (Array.isArray((activeRound as any)?.bomb)
        ? (activeRound as any).bomb
        : []);
    if (!Array.isArray(rawBomb) || rawBomb.length === 0) {
      return { activeBomb: null, bombPlantTick: null };
    }

    const parsed = rawBomb.map((b: any) => {
      if (Array.isArray(b)) {
        return {
          tick: Number(b[0] || 0),
          event: String(b[1] || 'bomb_planted').toLowerCase(),
          playerId: Number(b[2] || 0),
          x: Number(b[3] || 0),
          y: Number(b[4] || 0),
          z: Number(b[5] || 0),
          hasKit: Boolean(b[6] ?? b[5]),
        };
      }
      return {
        tick: Number(b.tick || 0),
        event: String(b.event || 'bomb_planted').toLowerCase(),
        playerId: Number(b.player ?? b.playerId ?? 0),
        x: Number(b.x || 0),
        y: Number(b.y || 0),
        z: Number(b.z || 0),
        hasKit: Boolean(b.hasKit),
      };
    });

    const plantEv = parsed.find((b) => b.event === 'bomb_planted');
    const plantWindowTicks = Math.round(C4_PLANT_DURATION_SECONDS * tickrate);

    if (
      plantEv &&
      playback.currentTick >= plantEv.tick - plantWindowTicks &&
      playback.currentTick < plantEv.tick
    ) {
      return {
        bombPlantTick: null,
        activeBomb: {
          x: plantEv.x,
          y: plantEv.y,
          state: 'planting',
          carrierId: plantEv.playerId,
          plantStartTick: plantEv.tick - plantWindowTicks,
          timerRemaining: C4_TIMER_DURATION_SECONDS,
        },
      };
    }

    const pastEvents = parsed.filter((b) => b.tick <= playback.currentTick);
    const latest = pastEvents[pastEvents.length - 1];
    if (!latest) {
      return { activeBomb: null, bombPlantTick: null };
    }

    let state: BombLifecycleState = 'planted';
    if (latest.event.includes('defused')) state = 'defused';
    else if (latest.event.includes('begindefuse') || latest.event === 'bomb_defusing')
      state = 'defusing';
    else if (latest.event.includes('explod')) state = 'exploded';
    else if (latest.event.includes('drop')) state = 'dropped';
    else if (latest.event.includes('pickup')) state = 'carried';
    else if (latest.event.includes('beginplant')) state = 'planting';

    const pTick = plantEv?.tick ?? latest.tick;
    const elapsedSec = Math.max(0, (playback.currentTick - pTick) / tickrate);
    const timerRemaining = Math.max(0, C4_TIMER_DURATION_SECONDS - elapsedSec);

    return {
      bombPlantTick: plantEv && playback.currentTick >= plantEv.tick ? plantEv.tick : null,
      activeBomb: {
        x: latest.x || plantEv?.x || 512,
        y: latest.y || plantEv?.y || 512,
        state,
        carrierId: state === 'planting' || state === 'carried' ? latest.playerId : null,
        defuserId: state === 'defusing' ? latest.playerId : null,
        plantStartTick: state === 'planting' ? latest.tick : null,
        defuseStartTick: state === 'defusing' ? latest.tick : null,
        hasKit: latest.hasKit,
        timerRemaining,
      },
    };
  }, [activeRound, playback.currentTick, tickrate]);

  const activeKills = useMemo(() => {
    const rawKills =
      activeRound?.events?.kills ??
      (Array.isArray((activeRound as any)?.kills)
        ? (activeRound as any).kills
        : []);
    return Array.isArray(rawKills) ? rawKills : [];
  }, [activeRound]);

  const activeDamages = useMemo(() => {
    const rawDamages =
      activeRound?.events?.damages ??
      (Array.isArray((activeRound as any)?.damages)
        ? (activeRound as any).damages
        : []);
    return Array.isArray(rawDamages) ? rawDamages : [];
  }, [activeRound]);

  const recentDeaths = useMemo<RecentDeathMarker[]>(() => {
    return activeKills
      .filter((k) => k[0] <= playback.currentTick)
      .map((k) => {
        const victimPlayer = interpolatedPlayers.find(
          (p) => p.playerId === k[2] || p.id === k[2],
        );
        return {
          victimId: k[2],
          u: victimPlayer?.u ?? 512,
          v: victimPlayer?.v ?? 512,
          team: 'CT' as TeamSide,
          killTick: k[0],
        };
      });
  }, [activeKills, playback.currentTick, interpolatedPlayers]);

  const activeShots = useMemo<ActiveShotEffect[]>(() => {
    return activeDamages
      .filter((d) => Math.abs(playback.currentTick - d[0]) <= 8)
      .map((d) => ({
        shooterId: d[1],
        tick: d[0],
      }));
  }, [activeDamages, playback.currentTick]);

  const activeCombatLines = useMemo<CombatLineEvent[]>(() => {
    const lines = activeRound?.combatLines;
    if (!Array.isArray(lines) || lines.length === 0) return [];
    return lines.filter(
      (line) =>
        playback.currentTick >= line.tick &&
        playback.currentTick <= line.tick + 20,
    );
  }, [activeRound?.combatLines, playback.currentTick]);

  return (
    <section
      aria-labelledby="replayer-heading"
      className="h-screen max-h-screen overflow-hidden flex flex-col p-2 sm:p-2.5 bg-[#0B0E0F] select-none gap-2"
    >
      <MatchHeaderHUD
        matchId={matchId}
        mapName={mapName}
        team1Name={team1Name}
        team1Score={team1Score}
        team2Name={team2Name}
        team2Score={team2Score}
        currentRoundNumber={roundNumber}
        totalRounds={rounds.length}
        currentTick={playback.currentTick}
        startTick={startTick}
        tickrate={tickrate}
        bombState={(activeBomb?.state as BombLifecycleState) ?? null}
        bombPlantTick={bombPlantTick}
        activeNukeLayer={activeNukeLayer}
        onChangeNukeLayer={setActiveNukeLayer}
      />

      {isLoading ? (
        <div
          data-testid="replayer-loading-indicator"
          className="flex-1 min-h-0 flex flex-col items-center justify-center border border-[#1F2629] bg-[#0E1315]/80 backdrop-blur-sm gap-3 rounded-[2px]"
        >
          <div className="flex items-center gap-2 text-[#00FFA3] font-mono text-xs tracking-wider animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#00FFA3]" />
            CARREGANDO TELEMETRIA DA PARTIDA...
          </div>
          <div className="text-[11px] font-mono text-[#6B7A82]">
            Descompactando .bin.gz e interpolando vetores de movimento 2D
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 flex gap-2 sm:gap-2.5 overflow-hidden">
            {/* Viewport Tático Central */}
            <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center relative overflow-hidden rounded-[2px] border border-[#1F2629] bg-[#0B0E0F] p-1">
              <div className="relative h-full max-h-full max-w-full aspect-square flex items-center justify-center">
                {/* Camada Z-20: Killfeed */}
                <LiveKillfeed
                  kills={activeKills}
                  currentTick={playback.currentTick}
                  tickrate={tickrate}
                  roundNumber={roundNumber}
                  playersManifest={playersManifest}
                  weaponsManifest={weaponsManifest}
                />

                {/* Camadas Z-0 e Z-10: Radar e Entidades Dinâmicas */}
                <ViewportCanvas
                  mapName={mapName}
                  currentTick={playback.currentTick}
                  tickrate={tickrate}
                  isPlaying={playback.isPlaying}
                  players={interpolatedPlayers}
                  playersManifest={playersManifest}
                  roundNumber={roundNumber}
                  utilities={activeUtilities}
                  bomb={activeBomb}
                  recentDeaths={recentDeaths}
                  activeShots={activeShots}
                  combatLines={activeCombatLines}
                  playerCalloutsById={playerCalloutsById}
                  playerHasC4ById={playerHasC4ById}
                  playerDefusersById={playerDefusersById}
                  activeNukeLayer={activeNukeLayer}
                />

                {/* HUD Tático V2 (Cards, Buy Badges, Defuse Timer) */}
                <div className="absolute inset-x-0 bottom-0 pointer-events-auto z-20 max-h-[30%] overflow-y-auto">
                  <ReplayHUD
                    players={interpolatedPlayers}
                    currentTick={playback.currentTick}
                    tickRate={tickrate}
                    ctRoundType={(activeRound as any)?.ctRoundType}
                    tRoundType={(activeRound as any)?.tRoundType}
                    bombEvents={(activeRound as any)?.bombEvents || []}
                  />
                </div>

                {/* Camada Z-30: Telestrator */}
                <TelestratorLayer isPlaying={playback.isPlaying} />
              </div>
            </div>

            {/* Painel Lateral */}
            <TeamRosterSidebar
              roundNumber={roundNumber}
              playersManifest={playersManifest}
              playerStates={interpolatedPlayers as any}
              weaponsManifest={weaponsManifest}
              playerMoneyById={playerMoneyById}
              playerDefusersById={playerDefusersById}
              playerHasC4ById={playerHasC4ById}
              playerCalloutsById={playerCalloutsById}
              playerInventoryById={playerInventoryById}
            />
          </div>

          <div
            aria-label="Controles de Timeline e Rounds"
            data-testid="timeline-controls"
            className="h-12 sm:h-14 max-h-14 px-3 py-1 bg-[#111618] border border-[#1F2629] rounded-[2px] flex items-center justify-between gap-3 text-white select-none shrink-0"
          >
            <PlaybackControls
              isPlaying={playback.isPlaying}
              playbackSpeed={playback.playbackSpeed}
              currentRoundIndex={playback.currentRoundIndex}
              totalRounds={rounds.length}
              currentTick={playback.currentTick}
              startTick={startTick}
              endTick={endTick}
              tickrate={tickrate}
              onTogglePlay={playback.togglePlay}
              onSelectSpeed={playback.setSpeed}
              onSeekToTick={playback.seekToTick}
              onSelectRound={playback.setRound}
            />

            <TimelineScrubber
              roundNumber={roundNumber}
              currentTick={playback.currentTick}
              startTick={startTick}
              endTick={endTick}
              tickrate={tickrate}
              kills={activeKills}
              bombEvents={activeRound?.events?.bomb ?? []}
              damages={activeDamages}
              playersManifest={playersManifest}
              onSeekToTick={playback.seekToTick}
            />

            <RoundCarousel
              rounds={rounds}
              currentRoundIndex={playback.currentRoundIndex}
              onSelectRound={playback.setRound}
            />
          </div>
        </>
      )}
    </section>
  );
}

export default ReplayEngine;