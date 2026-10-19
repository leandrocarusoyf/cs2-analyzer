'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RawFrame, ReplayRound } from '../types/replay.ts';
import type {
  PlaybackControls,
  PlaybackSpeed,
  PlaybackState,
} from '../types/replayer-engine.ts';

export type RoundBoundary = Pick<ReplayRound, 'startTick' | 'endTick'> & {
  frames?: RawFrame[];
};

export interface UseReplayPlaybackOptions {
  tickrate?: number;
  samplingRate?: number;
  rounds?: ReadonlyArray<RoundBoundary>;
  initialRoundIndex?: number;
  initialSpeed?: PlaybackSpeed;
}

export interface UseReplayPlaybackReturn
  extends PlaybackState,
    PlaybackControls {
  state: PlaybackState;
  sampledFrameRate: number;
}

const DEFAULT_TICKRATE = 64;
const DEFAULT_SAMPLING_RATE = 4;

export function useReplayPlayback(
  options: UseReplayPlaybackOptions = {},
): UseReplayPlaybackReturn {
  const {
    tickrate = DEFAULT_TICKRATE,
    samplingRate = DEFAULT_SAMPLING_RATE,
    rounds = [],
    initialRoundIndex = 0,
    initialSpeed = 1,
  } = options;

  const totalRounds = rounds.length;
  const safeInitialRound =
    totalRounds > 0
      ? Math.max(0, Math.min(totalRounds - 1, initialRoundIndex))
      : 0;
  const initialStartTick = rounds[safeInitialRound]?.startTick ?? 0;

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentRoundIndex, setCurrentRoundIndex] =
    useState<number>(safeInitialRound);
  const [currentTick, setCurrentTick] = useState<number>(initialStartTick);
  const [playbackSpeed, setPlaybackSpeed] =
    useState<PlaybackSpeed>(initialSpeed);

  const rafIdRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  const sampledFrameRate =
    samplingRate > 0 ? tickrate / samplingRate : tickrate;

  const activeRound = rounds[currentRoundIndex];
  const minTick = activeRound?.startTick ?? 0;
  const maxTick = activeRound?.endTick ?? Number.MAX_SAFE_INTEGER;

  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
    lastTimestampRef.current = null;
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (prev) {
        lastTimestampRef.current = null;
      }
      return !prev;
    });
  }, []);

  const seekToTick = useCallback(
    (tick: number) => {
      const clampedTick = Math.max(minTick, Math.min(maxTick, tick));
      setCurrentTick(clampedTick);
    },
    [minTick, maxTick],
  );

  const setSpeed = useCallback((speed: PlaybackSpeed) => {
    setPlaybackSpeed(speed);
  }, []);

  const setRound = useCallback(
    (roundIndex: number) => {
      if (totalRounds === 0) {
        setCurrentRoundIndex(0);
        setCurrentTick(0);
        return;
      }

      const clampedIndex = Math.max(0, Math.min(totalRounds - 1, roundIndex));
      const targetRound = rounds[clampedIndex];
      setCurrentRoundIndex(clampedIndex);
      setCurrentTick(targetRound ? targetRound.startTick : 0);
      lastTimestampRef.current = null;
    },
    [rounds, totalRounds],
  );

  // Sincroniza o round ativo e reseta o currentTick para o startTick do round correspondente
  // sempre que a lista de rounds for carregada ou atualizada (ex: carregamento da telemetria real do .bin.gz)
  useEffect(() => {
    if (rounds.length > 0) {
      const safeIdx = Math.max(0, Math.min(rounds.length - 1, currentRoundIndex));
      setCurrentRoundIndex(safeIdx);
      const r = rounds[safeIdx];
      if (r) {
        setCurrentTick(r.startTick);
      }
      lastTimestampRef.current = null;
    }
  }, [rounds]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      lastTimestampRef.current = null;
      return;
    }

    const step = (now: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = now;
      }

      const deltaSeconds = Math.max(0, (now - lastTimestampRef.current) / 1000);
      lastTimestampRef.current = now;

      // Avança os ticks respeitando a taxa de amostragem (sampledFrameRate * samplingRate = tickrate) e o playbackSpeed
      const deltaTicks =
        deltaSeconds * sampledFrameRate * samplingRate * playbackSpeed;

      setCurrentTick((prevTick) => {
        const nextTick = prevTick + deltaTicks;
        if (nextTick >= maxTick) {
          setIsPlaying(false);
          lastTimestampRef.current = null;
          return maxTick;
        }
        return nextTick;
      });

      rafIdRef.current = requestAnimationFrame(step);
    };

    rafIdRef.current = requestAnimationFrame(step);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      lastTimestampRef.current = null;
    };
  }, [isPlaying, maxTick, playbackSpeed, sampledFrameRate, samplingRate]);

  const state: PlaybackState = {
    isPlaying,
    currentTick,
    currentRoundIndex,
    playbackSpeed,
    totalRounds,
  };

  return {
    ...state,
    state,
    sampledFrameRate,
    play,
    pause,
    togglePlay,
    seekToTick,
    setSpeed,
    setRound,
  };
}

export default useReplayPlayback;

