import type { MatchItem } from '../types/home-data';

export interface MatchScores {
  seriesScore: string;
  mapScore: string;
}

export function getMatchScores(match: MatchItem): MatchScores {
  const left = (match.team1?.mapScore !== undefined && match.team1?.mapScore !== null && match.team1.mapScore !== 0)
    ? match.team1.mapScore
    : (match.current_map?.team1_rounds ?? match.team1_score ?? match.team1?.mapScore ?? 0);

  const right = (match.team2?.mapScore !== undefined && match.team2?.mapScore !== null && match.team2.mapScore !== 0)
    ? match.team2.mapScore
    : (match.current_map?.team2_rounds ?? match.team2_score ?? match.team2?.mapScore ?? 0);

  const seriesLeft = match.team1?.seriesScore ?? 0;
  const seriesRight = match.team2?.seriesScore ?? 0;

  return {
    seriesScore: `(${seriesLeft}) - (${seriesRight})`,
    mapScore: `${left} - ${right}`,
  };
}

/** Missing scores are displayed as zero only in the Home scoreboard. */
export function formatMatchScore(match: MatchItem): string {
  const { mapScore, seriesScore } = getMatchScores(match);
  return `${mapScore} ${seriesScore}`;
}
