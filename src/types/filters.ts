import type { CS2Map } from './replay.ts';

export type { CS2Map };

export type TacticalSide = 'both' | 'ct' | 't';

export type TimeWindow = 'last_5' | 'last_10' | 'last_20' | 'all';

export interface GlobalFilterState {
  targetPlayerId: string | null;
  selectedMap: CS2Map | 'all';
  tacticalSide: TacticalSide;
  timeWindow: TimeWindow;
}

export interface GlobalFilterActions {
  setTargetPlayerId: (id: string | null) => void;
  setSelectedMap: (map: CS2Map | 'all') => void;
  setTacticalSide: (side: TacticalSide) => void;
  setTimeWindow: (window: TimeWindow) => void;
  resetFilters: () => void;
}

export type GlobalFilterStore = GlobalFilterState & GlobalFilterActions;

