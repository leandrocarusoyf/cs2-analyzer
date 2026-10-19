export interface MapConfig {
  readonly posX: number;
  readonly posY: number;
  readonly scale: number;
  readonly hasVerticalLayers?: boolean;
  readonly verticalThresholdZ?: number;
  readonly lowerRadarImage?: string;
}

export const MAP_CONFIGS = Object.freeze({
  de_mirage: Object.freeze({ posX: -3230, posY: 1713, scale: 5.0 }),
  de_inferno: Object.freeze({ posX: -2087, posY: 3870, scale: 4.9 }),
  de_dust2: Object.freeze({ posX: -2476, posY: 3239, scale: 4.4 }),
  de_nuke: Object.freeze({
    posX: -3453,
    posY: 2887,
    scale: 7.0,
    hasVerticalLayers: true,
    verticalThresholdZ: -495,
    lowerRadarImage: '/maps/de_nuke_lower_radar.png',
  }),
  de_ancient: Object.freeze({ posX: -2953, posY: 2164, scale: 4.5 }),
  de_anubis: Object.freeze({ posX: -2796, posY: 3328, scale: 5.22 }),
  de_cache: Object.freeze({ posX: -2000, posY: 3250, scale: 5.5 }),
} as const satisfies Record<string, MapConfig>);

export type CS2Map = keyof typeof MAP_CONFIGS;
