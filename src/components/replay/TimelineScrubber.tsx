'use client';

import React from 'react';
import type {
  BombEventTuple,
  DamageEventTuple,
  KillEventTuple,
  PlayerManifestEntry,
  TeamSide,
} from '../../types/replay.ts';
import { TEAM_CANONICAL_COLORS } from '../../lib/replay/constants.ts';

export interface TimelineScrubberProps {
  roundNumber: number;
  currentTick: number;
  startTick: number;
  endTick: number;
  tickrate?: number;
  kills?: ReadonlyArray<KillEventTuple>;
  bombEvents?: ReadonlyArray<BombEventTuple>;
  damages?: ReadonlyArray<DamageEventTuple>;
  playersManifest?: ReadonlyArray<PlayerManifestEntry>;
  onSeekToTick: (tick: number) => void;
}

function computePercent(tick: number, startTick: number, endTick: number): number {
  const span = Math.max(1, endTick - startTick);
  return Math.max(0, Math.min(100, ((tick - startTick) / span) * 100));
}

function formatScrubberTime(currentTick: number, startTick: number, tickrate: number): string {
  const elapsedSec = Math.max(0, Math.floor((currentTick - startTick) / Math.max(1, tickrate)));
  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function TimelineScrubber({
  roundNumber,
  currentTick,
  startTick,
  endTick,
  tickrate = 64,
  kills = [],
  bombEvents = [],
  damages = [],
  playersManifest = [],
  onSeekToTick,
}: TimelineScrubberProps) {
  const clampedTick = Math.max(startTick, Math.min(endTick, currentTick));
  const isPostHalftime = roundNumber >= 13;

  const sideByPlayerId = new Map<number, TeamSide>();
  for (const p of playersManifest) {
    const side: TeamSide = isPostHalftime
      ? p.initialTeam === 'CT'
        ? 'T'
        : 'CT'
      : p.initialTeam;
    sideByPlayerId.set(p.id, side);
  }

  const killMarkers = kills.map(([tick, killerId], idx) => {
    const killerSide = sideByPlayerId.get(killerId) ?? 'T';
    const color =
      killerSide === 'CT'
        ? TEAM_CANONICAL_COLORS.CT
        : TEAM_CANONICAL_COLORS.TERRORIST;
    return {
      id: `kill-${tick}-${idx}`,
      tick,
      side: killerSide,
      percent: computePercent(tick, startTick, endTick),
      color,
    };
  });

  const bombPlantMarkers = bombEvents
    .filter(([, ev]) => String(ev).toLowerCase().includes('plant'))
    .map(([tick], idx) => ({
      id: `bomb-${tick}-${idx}`,
      tick,
      percent: computePercent(tick, startTick, endTick),
    }));

  const firstEngagementTick =
    damages.length > 0
      ? damages[0][0]
      : kills.length > 0
      ? kills[0][0]
      : null;

  const roundTimeDisplay = formatScrubberTime(clampedTick, startTick, tickrate);

  return (
    <div
      data-testid="timeline-scrubber"
      className="flex-1 min-w-[200px] flex flex-col justify-center gap-0.5"
    >
      <div className="flex items-center justify-between text-[9px] font-mono text-[#6B7A82] uppercase leading-none px-0.5">
        <div className="flex items-center gap-2">
          <span>
            Tempo: <strong className="text-[#00FFA3] font-bold tabular-nums">{roundTimeDisplay}</strong>
          </span>
          <span className="text-[#1F2629]">|</span>
          <span>
            Tick: <strong className="text-white tabular-nums">{Math.floor(clampedTick)}</strong>
          </span>
        </div>
        <span>
          R#{roundNumber} [{startTick}..{endTick}]
        </span>
      </div>

      <div className="relative flex h-4 items-center">
        <input
          type="range"
          aria-label="Progresso de Tick do Round"
          data-testid="timeline-scrub-slider"
          min={startTick}
          max={endTick}
          step={1}
          value={Math.floor(clampedTick)}
          onChange={(e) => onSeekToTick(Number(e.target.value))}
          className="z-10 h-1.5 w-full cursor-pointer appearance-none rounded-[1px] bg-[#0B0E0F] border border-[#1F2629] accent-[#00FFA3]"
        />

        {/* Marcador de Abertura / Primeiro Duelo Crítico */}
        {firstEngagementTick !== null && (
          <span
            title={`Duelo de Abertura @ Tick ${firstEngagementTick}`}
            data-testid="timeline-opening-marker"
            style={{
              left: `${computePercent(firstEngagementTick, startTick, endTick)}%`,
            }}
            className="pointer-events-none absolute top-0.5 h-3 w-0.5 -translate-x-1/2 bg-[#FACC15] z-20"
          />
        )}

        {/* Marcadores de Abate (Diamantes / Triângulos estilizados nas cores dos times CT e TR) */}
        {killMarkers.map((m) => (
          <span
            key={m.id}
            title={`Abate (${m.side}) @ Tick ${m.tick}`}
            data-testid="timeline-kill-marker"
            data-killer-side={m.side}
            style={{
              left: `${m.percent}%`,
              backgroundColor: m.color,
            }}
            className="pointer-events-none absolute top-1 h-2 w-2 -translate-x-1/2 rotate-45 ring-1 ring-[#0B0E0F] z-20 shadow-sm"
          />
        ))}

        {/* Marcador de Plant da C4 */}
        {bombPlantMarkers.map((m) => (
          <span
            key={m.id}
            title={`C4 Plantada @ Tick ${m.tick}`}
            data-testid="timeline-bomb-marker"
            style={{ left: `${m.percent}%` }}
            className="pointer-events-none absolute top-0.5 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-[#EF4444] ring-1 ring-white z-20"
          />
        ))}
      </div>
    </div>
  );
}

export default TimelineScrubber;

