'use client';

import React from 'react';
import Link from 'next/link';
import type { BombLifecycleState, CS2Map } from '../../types/replay.ts';
import type { NukeLayer } from '../../types/replayer-engine.ts';
import {
  C4_TIMER_DURATION_SECONDS,
  ROUND_REGULATION_TIME_SECONDS,
} from '../../lib/replay/constants.ts';

export interface MatchHeaderHUDProps {
  matchId: string;
  mapName: CS2Map | string;
  team1Name?: string;
  team1Score?: number;
  team2Name?: string;
  team2Score?: number;
  currentRoundNumber: number;
  totalRounds: number;
  currentTick: number;
  startTick: number;
  freezeEndTick?: number;
  tickrate?: number;
  bombState?: BombLifecycleState | null;
  bombPlantTick?: number | null;
  activeNukeLayer?: NukeLayer;
  onChangeNukeLayer?: (layer: NukeLayer) => void;
}

function formatClockMMSS(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function MatchHeaderHUD({
  matchId,
  mapName,
  team1Name = 'FURIA',
  team1Score = 13,
  team2Name = 'Aurora',
  team2Score = 10,
  currentRoundNumber,
  totalRounds,
  currentTick,
  startTick,
  freezeEndTick,
  tickrate = 64,
  bombState = null,
  bombPlantTick = null,
  activeNukeLayer = 'upper',
  onChangeNukeLayer,
}: MatchHeaderHUDProps) {
  const effectiveFreezeEnd = freezeEndTick ?? startTick + 128;
  const isFreezeTime = currentTick < effectiveFreezeEnd;

  const isBombPlantedActive =
    bombState === 'planted' || bombState === 'defusing';

  let clockDisplay = '1:55';
  let clockBadgeLabel = 'EM JOGO';
  let clockColorClass = 'text-white border-[#1F2629] bg-[#111618]';

  if (isBombPlantedActive && bombPlantTick !== null) {
    const elapsedSincePlant = Math.max(0, (currentTick - bombPlantTick) / tickrate);
    const remainingBombSec = Math.max(
      0,
      C4_TIMER_DURATION_SECONDS - elapsedSincePlant,
    );
    clockDisplay = `${remainingBombSec.toFixed(1)}s`;
    clockBadgeLabel = bombState === 'defusing' ? 'C4 DESARMANDO' : 'C4 PLANTADA';
    clockColorClass =
      bombState === 'defusing'
        ? 'text-[#38BDF8] border-[#38BDF8]/50 bg-[#38BDF8]/10 animate-pulse'
        : 'text-[#EF4444] border-[#EF4444]/60 bg-[#EF4444]/15 animate-pulse';
  } else if (bombState === 'defused') {
    clockDisplay = '00.0s';
    clockBadgeLabel = 'C4 DESARMADA';
    clockColorClass = 'text-[#00FFA3] border-[#00FFA3]/40 bg-[#00FFA3]/10';
  } else if (bombState === 'exploded') {
    clockDisplay = '00.0s';
    clockBadgeLabel = 'C4 DETONADA';
    clockColorClass = 'text-[#F97316] border-[#F97316]/40 bg-[#F97316]/10';
  } else if (isFreezeTime) {
    const remFreeze = Math.max(0, (effectiveFreezeEnd - currentTick) / tickrate);
    clockDisplay = formatClockMMSS(Math.ceil(remFreeze));
    clockBadgeLabel = 'FREEZETIME';
    clockColorClass = 'text-[#FACC15] border-[#FACC15]/40 bg-[#FACC15]/10';
  } else {
    const elapsedRoundSec = Math.max(
      0,
      (currentTick - effectiveFreezeEnd) / tickrate,
    );
    const remRoundSec = Math.max(
      0,
      ROUND_REGULATION_TIME_SECONDS - elapsedRoundSec,
    );
    clockDisplay = formatClockMMSS(remRoundSec);
  }

  return (
    <header
      data-testid="match-header-hud"
      className="h-11 min-h-[42px] max-h-[44px] flex items-center justify-between border-b border-[#1F2629] px-2.5 bg-[#0B0E0F] shrink-0 gap-2"
    >
      {/* Esquerda: Identificação da Partida e Mapa */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[#00FFA3] font-mono font-bold text-xs">/</span>
        <span className="text-[11px] font-mono font-bold tracking-wider text-[#6B7A82] uppercase hidden sm:inline">
          2D Tactical Replayer
        </span>
        <span className="text-[#1F2629] hidden sm:inline">•</span>
        <h1
          id="replayer-heading"
          className="text-[12px] sm:text-[13px] font-mono font-bold text-white uppercase truncate"
        >
          Partida #{matchId} ({mapName})
        </h1>
        <span className="rounded-[2px] border border-[#00FFA3]/30 bg-[#00FFA3]/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#00FFA3] shrink-0">
          HUD TÁTICO
        </span>
      </div>

      {/* Centro: Placar Global Consolidado + Relógio Regressivo + Status C4 + Round Atual */}
      <div
        data-testid="match-scoreboard-center"
        className="flex items-center gap-2 sm:gap-3 shrink-0"
      >
        <div className="flex items-center gap-1.5 rounded-[2px] border border-[#1F2629] bg-[#111618] px-2.5 py-1 font-mono text-xs">
          <span className="font-bold text-[#EA580C] uppercase">{team1Name}</span>
          <span className="font-black text-white tabular-nums">{team1Score}</span>
          <span className="text-[#6B7A82] text-[10px]">x</span>
          <span className="font-black text-white tabular-nums">{team2Score}</span>
          <span className="font-bold text-[#2563EB] uppercase">{team2Name}</span>
        </div>

        <div
          data-testid="match-round-indicator"
          className="rounded-[2px] border border-[#1F2629] bg-[#111618] px-2 py-1 font-mono text-[11px] text-[#E2E8F0] tabular-nums"
        >
          Round <strong className="text-white">{currentRoundNumber}</strong> /{' '}
          {Math.max(1, totalRounds)}
        </div>

        <div
          data-testid="match-round-clock"
          className={`flex items-center gap-1.5 rounded-[2px] border px-2.5 py-1 font-mono text-xs font-bold tabular-nums ${clockColorClass}`}
        >
          <span className="text-[9px] uppercase tracking-wider opacity-85">
            {clockBadgeLabel}
          </span>
          <span>{clockDisplay}</span>
        </div>
      </div>

      {/* Direita: Seletor de Piso (Nuke/Vertigo) + Voltar */}
      <div className="flex items-center gap-2 shrink-0">
        {(mapName === 'de_nuke' || mapName === 'de_vertigo') &&
          onChangeNukeLayer && (
            <div
              data-testid="nuke-layer-toggle"
              className="flex items-center gap-0.5 rounded-[2px] border border-[#1F2629] bg-[#111618] p-0.5 font-mono text-[10px]"
            >
              <button
                type="button"
                data-testid="nuke-btn-upper"
                onClick={() => onChangeNukeLayer('upper')}
                className={`h-6 px-2 rounded-[2px] font-bold uppercase transition-colors ${
                  activeNukeLayer === 'upper'
                    ? 'bg-[#00FFA3] text-[#0B0E0F]'
                    : 'text-[#6B7A82] hover:text-white'
                }`}
              >
                Upper (A)
              </button>
              <button
                type="button"
                data-testid="nuke-btn-lower"
                onClick={() => onChangeNukeLayer('lower')}
                className={`h-6 px-2 rounded-[2px] font-bold uppercase transition-colors ${
                  activeNukeLayer === 'lower'
                    ? 'bg-[#00FFA3] text-[#0B0E0F]'
                    : 'text-[#6B7A82] hover:text-white'
                }`}
              >
                Lower (B)
              </button>
            </div>
          )}

        <Link
          href={`/matches/${matchId}`}
          className="h-7 px-2.5 rounded-[2px] border border-[#1F2629] bg-[#111618] hover:border-[#6B7A82] text-xs font-mono font-semibold text-white flex items-center transition-colors shrink-0"
        >
          ← Voltar para Match Overview
        </Link>
      </div>
    </header>
  );
}

export default MatchHeaderHUD;

