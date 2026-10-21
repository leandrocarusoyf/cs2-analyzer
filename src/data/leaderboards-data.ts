export interface PlayerMapStats {
  hltv: number;
  adr: number;
  kd: number;
  kpr: number;
  dpr: number;
  kast: number;
  udr: number;
  far: number;
  rounds: number;
}

export interface LeaderboardPlayer {
  id: string;
  name: string;
  team: string;
  tRole: string;
  ctRole: string;
  roleCategory: 'AWP' | 'Entry' | 'Rifler' | 'Anchor' | 'Support' | 'Lurk';
  overall: PlayerMapStats;
  mapStats: Record<string, PlayerMapStats>;
}

