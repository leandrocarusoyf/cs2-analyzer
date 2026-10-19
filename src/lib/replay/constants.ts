export const RADAR_SIZE = 1024 as const;

export const PLAYER_RADIUS_PX = 12 as const;
export const FOV_CONE_ANGLE_DEG = 90 as const;
export const FOV_CONE_REACH_PX = 25 as const;

export const TEAM_CANONICAL_COLORS = Object.freeze({
  CT: '#2563EB',
  TERRORIST: '#EA580C',
  T: '#EA580C',
} as const);

export const TELESTRATOR_COLORS = Object.freeze({
  CT_BLUE: '#2563EB',
  TR_ORANGE: '#EA580C',
  WARNING_YELLOW: '#FACC15',
  WHITE: '#FFFFFF',
} as const);

export const SMOKE_WORLD_RADIUS = 144 as const; // ~29.4px on de_inferno (scale 4.9)
export const SMOKE_DURATION_SECONDS = 20.0 as const;
export const SMOKE_HE_GAP_DURATION_SECONDS = 3.0 as const;

export const MOLOTOV_WORLD_RADIUS = 130 as const;
export const MOLOTOV_DURATION_SECONDS = 7.0 as const;

export const FLASHBANG_DISSIPATION_MS = 150 as const;
export const HE_SHOCKWAVE_DURATION_MS = 450 as const;

export const C4_PLANT_DURATION_SECONDS = 3.2 as const;
export const C4_TIMER_DURATION_SECONDS = 40.0 as const;
export const C4_DEFUSE_WITH_KIT_SECONDS = 5.0 as const;
export const C4_DEFUSE_WITHOUT_KIT_SECONDS = 10.0 as const;

export const DEATH_MARKER_FADE_SECONDS = 3.0 as const;
export const KILLFEED_DISPLAY_SECONDS = 5.0 as const;
export const TELESTRATOR_AUTO_FADE_SECONDS = 5.0 as const;

export const ROUND_REGULATION_TIME_SECONDS = 115 as const; // 1:55
export const ROUND_FREEZETIME_SECONDS = 15 as const;

export const PLAYBACK_SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4] as const;
export type TacticalPlaybackSpeed = (typeof PLAYBACK_SPEED_OPTIONS)[number];

