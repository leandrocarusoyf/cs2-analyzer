export type PlaybackSpeed = 0.25 | 0.5 | 1 | 2 | 4;

export type NukeLayer = 'upper' | 'lower';
export type PlayerFloor = 'upper' | 'lower' | 'default';

export interface InterpolatedPlayerState {
  playerId: number;
  percentX: number;
  percentY: number;
  worldZ: number;
  currentFloor: PlayerFloor;
  yaw: number;
  hp: number;
  armor: number;
  hasHelmet: boolean;
  isAlive: boolean;
  activeWeaponId: number;
  isDefusing: boolean;
  isPlanting: boolean;
  flashDuration: number;
  ping: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTick: number;
  currentRoundIndex: number;
  playbackSpeed: PlaybackSpeed;
  totalRounds: number;
  activeNukeLayer?: NukeLayer;
}

export interface PlaybackControls {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seekToTick: (tick: number) => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  setRound: (roundIndex: number) => void;
  setActiveNukeLayer?: (layer: NukeLayer) => void;
}
