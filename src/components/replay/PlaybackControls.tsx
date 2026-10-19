'use client';

import React, { useEffect } from 'react';
import {
  PLAYBACK_SPEED_OPTIONS,
  type TacticalPlaybackSpeed,
} from '../../lib/replay/constants.ts';

export interface PlaybackControlsProps {
  isPlaying: boolean;
  playbackSpeed: number;
  currentRoundIndex: number;
  totalRounds: number;
  currentTick: number;
  startTick: number;
  endTick: number;
  tickrate?: number;
  onTogglePlay: () => void;
  onSelectSpeed: (speed: TacticalPlaybackSpeed | any) => void;
  onSeekToTick: (tick: number) => void;
  onSelectRound: (roundIndex: number) => void;
}

export function PlaybackControls({
  isPlaying,
  playbackSpeed,
  currentRoundIndex,
  totalRounds,
  currentTick,
  startTick,
  endTick,
  tickrate = 64,
  onTogglePlay,
  onSelectSpeed,
  onSeekToTick,
  onSelectRound,
}: PlaybackControlsProps) {
  const step5SecondsTicks = Math.round(5 * tickrate);

  const handleStepBack5s = () => {
    onSeekToTick(Math.max(startTick, currentTick - step5SecondsTicks));
  };

  const handleStepForward5s = () => {
    onSeekToTick(Math.min(endTick, currentTick + step5SecondsTicks));
  };

  const handlePrevRound = () => {
    if (currentRoundIndex > 0) {
      onSelectRound(currentRoundIndex - 1);
    }
  };

  const handleNextRound = () => {
    if (currentRoundIndex < totalRounds - 1) {
      onSelectRound(currentRoundIndex + 1);
    }
  };

  // Atalhos globais de teclado (Espaço, Setas Esq/Dir, PageUp/PageDown)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        onSeekToTick(Math.max(startTick, currentTick - step5SecondsTicks));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        onSeekToTick(Math.min(endTick, currentTick + step5SecondsTicks));
      } else if (e.code === 'PageUp') {
        e.preventDefault();
        if (currentRoundIndex < totalRounds - 1) {
          onSelectRound(currentRoundIndex + 1);
        }
      } else if (e.code === 'PageDown') {
        e.preventDefault();
        if (currentRoundIndex > 0) {
          onSelectRound(currentRoundIndex - 1);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    currentTick,
    startTick,
    endTick,
    step5SecondsTicks,
    currentRoundIndex,
    totalRounds,
    onTogglePlay,
    onSeekToTick,
    onSelectRound,
  ]);

  return (
    <div
      data-testid="playback-controls"
      className="flex items-center gap-1.5 shrink-0"
    >
      <button
        type="button"
        aria-label="Round Anterior (PageDown)"
        title="Round Anterior (PageDown)"
        data-testid="btn-prev-round"
        disabled={currentRoundIndex <= 0}
        onClick={handlePrevRound}
        className="h-7 w-7 rounded-[2px] border border-[#1F2629] bg-[#0B0E0F] text-xs font-mono font-semibold text-white hover:border-[#6B7A82] transition-colors disabled:opacity-30 flex items-center justify-center shrink-0"
      >
        ⏮
      </button>

      <button
        type="button"
        aria-label="Retroceder 5 segundos (Seta Esquerda)"
        title="Retroceder 5s (←)"
        data-testid="btn-step-back-5s"
        onClick={handleStepBack5s}
        className="h-7 px-1.5 rounded-[2px] border border-[#1F2629] bg-[#0B0E0F] text-[10px] font-mono font-bold text-[#94A3B8] hover:text-white hover:border-[#6B7A82] transition-colors shrink-0"
      >
        -5s
      </button>

      <button
        type="button"
        aria-label={isPlaying ? 'Pausar Replay' : 'Iniciar Replay'}
        title="Play / Pause (Espaço)"
        data-testid="btn-toggle-play"
        onClick={onTogglePlay}
        className="h-7 px-2.5 rounded-[2px] border border-[#00FFA3] bg-[#00FFA3] text-xs font-mono font-bold text-[#0B0E0F] hover:bg-[#00FFA3]/90 transition-colors uppercase shrink-0 flex items-center gap-1"
      >
        {isPlaying ? '⏸ Pause' : '▶ Play'}
      </button>

      <button
        type="button"
        aria-label="Avançar 5 segundos (Seta Direita)"
        title="Avançar 5s (→)"
        data-testid="btn-step-forward-5s"
        onClick={handleStepForward5s}
        className="h-7 px-1.5 rounded-[2px] border border-[#1F2629] bg-[#0B0E0F] text-[10px] font-mono font-bold text-[#94A3B8] hover:text-white hover:border-[#6B7A82] transition-colors shrink-0"
      >
        +5s
      </button>

      <button
        type="button"
        aria-label="Próximo Round (PageUp)"
        title="Próximo Round (PageUp)"
        data-testid="btn-next-round"
        disabled={currentRoundIndex >= totalRounds - 1}
        onClick={handleNextRound}
        className="h-7 w-7 rounded-[2px] border border-[#1F2629] bg-[#0B0E0F] text-xs font-mono font-semibold text-white hover:border-[#6B7A82] transition-colors disabled:opacity-30 flex items-center justify-center shrink-0"
      >
        ⏭
      </button>

      {/* Seletor imediato de velocidade: 0.25x, 0.5x, 1.0x, 2.0x, 4.0x */}
      <div
        role="group"
        aria-label="Seletor de Velocidade"
        className="flex items-center gap-0.5 rounded-[2px] border border-[#1F2629] bg-[#0B0E0F] p-0.5 shrink-0"
      >
        {PLAYBACK_SPEED_OPTIONS.map((speed) => {
          const active = playbackSpeed === speed;
          return (
            <button
              key={speed}
              type="button"
              data-testid={`speed-btn-${speed}`}
              onClick={() => onSelectSpeed(speed)}
              className={`h-5 px-1.5 rounded-[1px] text-[9px] font-mono font-bold transition-colors uppercase ${
                active
                  ? 'bg-[#00FFA3] text-[#0B0E0F]'
                  : 'text-[#6B7A82] hover:text-white'
              }`}
            >
              {speed}x
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PlaybackControls;

