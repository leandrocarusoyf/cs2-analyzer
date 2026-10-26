export interface MatchPlayerStats {
  id: string;
  name: string;
  fullName?: string;
  difference?: number | null;
  ratingVersion?: '2.0' | '3.0' | null;
  kills: number | null;
  deaths: number | null;
  adr: number | null;
  kast: number | null;
  rating: number | null;
}
export interface MatchRound {
  number: number;
  half: number;
  winner: 'team1' | 'team2';
  side: 'TR' | 'CT';
  reason: 'elimination' | 'bomb';
}
export interface MatchMapDetails {
  number: number;
  name: string;
  status: 'finished' | 'live' | 'upcoming';
  score: string | null;
  team1: MatchPlayerStats[];
  team2: MatchPlayerStats[];
  rounds: MatchRound[];
}
export interface MatchMvp extends MatchPlayerStats {
  fullName: string;
  mapNumber: number;
  mapName: string;
  ratingVersion: '2.0' | '3.0' | null;
  teamName?: string;
}
export interface MatchDetails {
  team1Stats: MatchPlayerStats[];
  team2Stats: MatchPlayerStats[];
  maps: MatchMapDetails[];
  mvp: MatchMvp | null;
}
