import React from 'react';
import type { ReplayRound, TeamSide } from '../../types/replay.ts';
import { TEAM_CANONICAL_COLORS } from '../../lib/replay/constants.ts';

export type RoundSummaryItem = Pick<
  ReplayRound,
  'roundNumber' | 'startTick' | 'endTick' | 'winnerSide' | 'events'
> & {
  winner?: string;
};

export function getWinnerColor(winnerOrSide?: string, fallbackSide?: TeamSide): string {
  const normalizedWinner = String(winnerOrSide ?? '').toUpperCase().trim();
  const normalizedSide = String(fallbackSide ?? winnerOrSide ?? '').toUpperCase().trim();

  if (
    normalizedWinner === 'CT' ||
    normalizedSide === 'CT' ||
    normalizedWinner.includes('CT')
  ) {
    return TEAM_CANONICAL_COLORS.CT;
  }

  if (
    normalizedWinner === 'T' ||
    normalizedWinner === 'TR' ||
    normalizedSide === 'T' ||
    normalizedSide === 'TR' ||
    normalizedWinner.includes('TERROR')
  ) {
    return TEAM_CANONICAL_COLORS.TERRORIST;
  }

  return '#94A3B8';
}

export interface RoundCarouselItem extends RoundSummaryItem {
  winReason?: string;
  reason?: string;
  buyTypeCT?: string;
  buyTypeT?: string;
  equipValueCT?: number;
  equipValueT?: number;
}

export interface RoundCarouselProps {
  rounds: ReadonlyArray<RoundCarouselItem>;
  currentRoundIndex: number;
  onSelectRound: (roundIndex: number) => void;
  currentTick?: number;
  isPlaying?: boolean;
  playbackSpeed?: number;
  onTogglePlay?: () => void;
  onSeekToTick?: (tick: number) => void;
  onSelectSpeed?: (speed: any) => void;
}

function getWinReasonBadge(reason?: string): { symbol: string; shortLabel: string; title: string } {
  const lower = String(reason ?? '').toLowerCase();
  if (lower.includes('defus') || lower === '7') {
    return { symbol: '🔧', shortLabel: 'DEF', title: 'Desarme (Defuse)' };
  }
  if (lower.includes('bomb') || lower.includes('explod') || lower.includes('target_bombed') || lower === '1') {
    return { symbol: '💥', shortLabel: 'C4', title: 'Detonação da C4' };
  }
  if (lower.includes('time') || lower.includes('saved') || lower === '12') {
    return { symbol: '⏱', shortLabel: 'TIME', title: 'Tempo Esgotado' };
  }
  return { symbol: '💀', shortLabel: 'ELIM', title: 'Eliminação' };
}

function abbreviateBuy(buy?: string): string {
  const s = String(buy ?? 'Full Buy').toUpperCase();
  if (s.includes('PISTOL')) return 'PISTOL';
  if (s.includes('ECO')) return 'ECO';
  if (s.includes('FORCE')) return 'FORCE';
  return 'FULL';
}

export function RoundCarousel({
  rounds,
  currentRoundIndex,
  onSelectRound,
}: RoundCarouselProps) {
  const currentRound = rounds[currentRoundIndex];
  const currentReason = getWinReasonBadge(currentRound?.reason || currentRound?.winReason);
  const ctBuy = abbreviateBuy(currentRound?.buyTypeCT);
  const tBuy = abbreviateBuy(currentRound?.buyTypeT);

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Telemetria do Round Ativo: Tipo de Compra (CT/TR) + Condição de Vitória */}
      {currentRound && (
        <div
          data-testid="active-round-buy-summary"
          className="hidden 2xl:flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] border border-[#1F2629] bg-[#0B0E0F] text-[9px] font-mono shrink-0"
        >
          <span className="text-[#2563EB] font-bold" title={`Compra CT: ${currentRound.buyTypeCT || 'Full Buy'}`}>
            CT:{ctBuy}
          </span>
          <span className="text-[#6B7A82]">/</span>
          <span className="text-[#EA580C] font-bold" title={`Compra TR: ${currentRound.buyTypeT || 'Full Buy'}`}>
            TR:{tBuy}
          </span>
          <span className="text-[#1F2629]">|</span>
          <span className="text-[#94A3B8] font-bold" title={currentReason.title}>
            {currentReason.symbol} {currentReason.shortLabel}
          </span>
        </div>
      )}

      {/* Barra de 23 Rounds Compacta e Elegante com Divisória MR12 tracejada */}
      <div
        role="group"
        aria-label="Seletor de Rounds"
        data-testid="round-selector-list"
        className="flex items-center gap-0.5 sm:gap-1 shrink-0 py-0.5"
      >
        {rounds.map((round, index) => {
          const isCurrent = index === currentRoundIndex;
          const winnerProp = (round as any).winner || round.winnerSide;
          const winnerColor = getWinnerColor(
            winnerProp,
            round.winnerSide as TeamSide,
          );
          const reasonInfo = getWinReasonBadge(
            round.reason || round.winReason,
          );
          const rCtBuy = round.buyTypeCT || (round.roundNumber === 1 || round.roundNumber === 13 ? 'Pistol' : 'Full Buy');
          const rTBuy = round.buyTypeT || (round.roundNumber === 1 || round.roundNumber === 13 ? 'Pistol' : 'Full Buy');
          const isHalftimeBoundary = round.roundNumber === 12;

          return (
            <React.Fragment key={round.roundNumber}>
              <button
                type="button"
                aria-label={`Round ${round.roundNumber} (${reasonInfo.title} • CT: ${rCtBuy} | TR: ${rTBuy})`}
                title={`Round ${round.roundNumber} • ${reasonInfo.title} • CT: ${rCtBuy} | TR: ${rTBuy}`}
                aria-pressed={isCurrent}
                data-testid={`round-btn-${round.roundNumber}`}
                data-winner={winnerProp}
                data-winner-side={round.winnerSide}
                data-winner-color={winnerColor}
                data-buy-ct={rCtBuy}
                data-buy-t={rTBuy}
                data-win-reason={reasonInfo.shortLabel}
                data-active={isCurrent ? 'true' : 'false'}
                onClick={() => onSelectRound(index)}
                style={{
                  borderBottomColor: winnerColor,
                  borderBottomWidth: '2.5px',
                }}
                className={`flex flex-col h-7 w-[19px] sm:w-[22px] md:w-6 shrink-0 items-center justify-center rounded-[2px] border font-mono transition-all leading-none ${
                  isCurrent
                    ? 'bg-[#1F2629] border-white text-white shadow-md ring-1 ring-white/50 z-10'
                    : 'bg-[#0B0E0F] border-[#1F2629] text-[#94A3B8] hover:text-white hover:bg-[#161D20]'
                }`}
              >
                <span className={`text-[9.5px] font-bold ${isCurrent ? 'text-white' : ''}`}>
                  {round.roundNumber}
                </span>
                <span
                  style={{ color: winnerColor }}
                  className="text-[7px] font-black uppercase tracking-tighter"
                >
                  {reasonInfo.shortLabel}
                </span>
              </button>

              {/* Divisória Tracejada do MR12 (Halftime no Round 12) */}
              {isHalftimeBoundary && (
                <div
                  data-testid="halftime-mr12-divider"
                  title="Troca de Lados (Halftime MR12)"
                  className="h-6 w-0 border-r border-dashed border-[#6B7A82]/80 mx-0.5 sm:mx-1 shrink-0"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default RoundCarousel;

