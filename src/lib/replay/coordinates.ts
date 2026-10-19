export interface TacticalMapConfig {
  posX: number;
  posY: number;
  scale: number;
  splitZ?: number;
  lowerRadar?: string;
  upperRadar?: string;
}

export const MAP_CONFIGS: Record<string, TacticalMapConfig> = {
  de_inferno: { posX: -2087, posY: 3870, scale: 4.9, upperRadar: '/maps/de_inferno_radar.png' },
  de_dust2:   { posX: -2476, posY: 3239, scale: 4.4, upperRadar: '/maps/de_dust2_radar.png' },
  de_mirage:  { posX: -3230, posY: 1713, scale: 5.0, upperRadar: '/maps/de_mirage_radar.png' },
  de_ancient: { posX: -2953, posY: 2164, scale: 4.5, upperRadar: '/maps/de_ancient_radar.png' },
  de_anubis:  { posX: -2796, posY: 3328, scale: 5.22, upperRadar: '/maps/de_anubis_radar.png' },
  de_nuke:    {
    posX: -3453,
    posY: 2887,
    scale: 7.0,
    splitZ: -480,
    lowerRadar: '/maps/de_nuke_lower_radar.png',
    upperRadar: '/maps/de_nuke_radar.png',
  },
  de_vertigo: {
    posX: -3168,
    posY: 1762,
    scale: 4.0,
    splitZ: 11720,
    lowerRadar: '/maps/de_vertigo/radar_lower.png',
    upperRadar: '/maps/de_mirage_radar.png',
  },
  de_cache:   { posX: -2000, posY: 3250, scale: 5.5, upperRadar: '/maps/de_cache_radar.png' },
};

function cleanZero(val: number): number {
  return Object.is(val, -0) || Math.abs(val) < 1e-10 ? 0 : val;
}

export function getMapCalibration(mapName: string): TacticalMapConfig {
  const key = mapName?.trim().toLowerCase() || 'de_mirage';
  return MAP_CONFIGS[key] ?? MAP_CONFIGS.de_mirage;
}

/**
 * Converte coordenadas mundiais do Source 2 (x, y) em pixels normalizados (0 a 1024):
 * u = (x_world - posX) / scale
 * v = (posY - y_world) / scale
 */
export function worldToRadarUV(
  xWorld: number,
  yWorld: number,
  mapName: string,
): { u: number; v: number } {
  const cfg = getMapCalibration(mapName);
  const u = cleanZero((xWorld - cfg.posX) / cfg.scale);
  const v = cleanZero((cfg.posY - yWorld) / cfg.scale);
  return { u, v };
}

export function worldToRadarPixels(
  worldX: number,
  worldY: number,
  map: string,
): { pixelX: number; pixelY: number } {
  if (typeof map !== 'string' || !Object.hasOwn(MAP_CONFIGS, map)) {
    throw new Error(`Invalid or unsupported CS2 map: "${String(map)}"`);
  }
  const { u, v } = worldToRadarUV(worldX, worldY, map);
  return { pixelX: u, pixelY: v };
}

export function worldToRadarPercent(
  worldX: number,
  worldY: number,
  map: string,
): { percentX: number; percentY: number } {
  const { pixelX, pixelY } = worldToRadarPixels(worldX, worldY, map);
  const percentX = cleanZero((pixelX / 1024) * 100);
  const percentY = cleanZero((pixelY / 1024) * 100);
  return { percentX, percentY };
}

/**
 * Converte raio em unidades mundiais do Source 2 para pixels na resolução 1024x1024.
 * Ex: Smoke 144 unidades mundiais em de_inferno (scale 4.9) => ~29.39px.
 */
export function worldRadiusToCanvasPixels(
  worldRadius: number,
  mapName: string,
): number {
  const cfg = getMapCalibration(mapName);
  return cleanZero(worldRadius / cfg.scale);
}

/**
 * Verifica se a cota Z do jogador ou granada está no piso inferior em mapas de múltiplos andares.
 */
export function isBelowSplitZ(zWorld: number, mapName: string): boolean {
  const cfg = getMapCalibration(mapName);
  if (typeof cfg.splitZ !== 'number') return false;
  return zWorld < cfg.splitZ;
}

export function resolveFloorLayer(
  zWorld: number,
  mapName: string,
): 'upper' | 'lower' | 'default' {
  const cfg = getMapCalibration(mapName);
  if (typeof cfg.splitZ !== 'number') return 'default';
  return zWorld < cfg.splitZ ? 'lower' : 'upper';
}

