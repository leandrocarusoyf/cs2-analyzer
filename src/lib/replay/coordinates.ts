import { MAP_CONFIGS, type CS2Map } from '../../constants/maps';
import { MapMetadata } from '../../types/replay';

export const OFFICIAL_MAP_METADATA: Record<string, MapMetadata> = {
  de_mirage: {
    mapName: 'de_mirage',
    displayName: 'Mirage',
    pos_x: -3230,
    pos_y: 1713,
    scale: 5.0,
    radarWidth: 1024,
    radarHeight: 1024,
  },
  de_inferno: {
    mapName: 'de_inferno',
    displayName: 'Inferno',
    pos_x: -2087,
    pos_y: 3870,
    scale: 4.9,
    radarWidth: 1024,
    radarHeight: 1024,
  },
  de_nuke: {
    mapName: 'de_nuke',
    displayName: 'Nuke',
    pos_x: -3453,
    pos_y: 2887,
    scale: 7.0,
    radarWidth: 1024,
    radarHeight: 1024,
  },
  de_ancient: {
    mapName: 'de_ancient',
    displayName: 'Ancient',
    pos_x: -2953,
    pos_y: 2164,
    scale: 4.5,
    radarWidth: 1024,
    radarHeight: 1024,
  },
  de_anubis: {
    mapName: 'de_anubis',
    displayName: 'Anubis',
    pos_x: -2796,
    pos_y: 3328,
    scale: 5.22,
    radarWidth: 1024,
    radarHeight: 1024,
  },
  de_dust2: {
    mapName: 'de_dust2',
    displayName: 'Dust II',
    pos_x: -2476,
    pos_y: 3239,
    scale: 4.4,
    radarWidth: 1024,
    radarHeight: 1024,
  },
  de_cache: {
    mapName: 'de_cache',
    displayName: 'Cache',
    pos_x: -2000,
    pos_y: 3250,
    scale: 5.5,
    radarWidth: 1024,
    radarHeight: 1024,
  },
  de_vertigo: {
    mapName: 'de_vertigo',
    displayName: 'Vertigo',
    pos_x: -3168,
    pos_y: 1762,
    scale: 4.0,
    radarWidth: 1024,
    radarHeight: 1024,
  },
  de_overpass: {
    mapName: 'de_overpass',
    displayName: 'Overpass',
    pos_x: -4831,
    pos_y: 1781,
    scale: 5.2,
    radarWidth: 1024,
    radarHeight: 1024,
  },
  cs_office: {
    mapName: 'cs_office',
    displayName: 'Office',
    pos_x: -1838,
    pos_y: 1858,
    scale: 4.1,
    radarWidth: 1024,
    radarHeight: 1024,
  },
};

export function getMapMetadata(mapName?: string | null): MapMetadata {
  if (!mapName || typeof mapName !== 'string') {
    return (
      OFFICIAL_MAP_METADATA['de_mirage'] || {
        mapName: 'unknown',
        displayName: 'Mirage',
        pos_x: -3230,
        pos_y: 1713,
        scale: 5.0,
        radarWidth: 1024,
        radarHeight: 1024,
      }
    );
  }

  const clean = mapName.trim().toLowerCase();
  const withPrefix = clean.startsWith('de_') || clean.startsWith('cs_') ? clean : 'de_' + clean;

  if (OFFICIAL_MAP_METADATA[withPrefix]) {
    return OFFICIAL_MAP_METADATA[withPrefix];
  }

  if (OFFICIAL_MAP_METADATA[clean]) {
    return OFFICIAL_MAP_METADATA[clean];
  }

  return {
    mapName: clean,
    displayName: clean.replace(/^(de_|cs_)/, '').toUpperCase(),
    pos_x: -3000,
    pos_y: 3000,
    scale: 5.0,
    radarWidth: 1024,
    radarHeight: 1024,
  };
}

export function worldToRadarPixel(
  worldX: number,
  worldY: number,
  metadata: MapMetadata
): { x: number; y: number } {
  const posX = metadata.pos_x ?? -3000;
  const posY = metadata.pos_y ?? 3000;
  const scale = metadata.scale > 0 ? metadata.scale : 5.0;

  const radarX = (worldX - posX) / scale;
  const radarY = (posY - worldY) / scale;

  return { x: radarX, y: radarY };
}

export function worldToRadarPixels(
  worldX: number,
  worldY: number,
  mapOrMeta: CS2Map | MapMetadata | string
): { pixelX: number; pixelY: number } {
  if (typeof mapOrMeta === 'string' && !(mapOrMeta in MAP_CONFIGS)) {
    throw new Error(`Invalid or unsupported CS2 map: "${mapOrMeta}"`);
  }
  const meta: MapMetadata =
    typeof mapOrMeta === 'object' && mapOrMeta !== null
      ? (mapOrMeta as MapMetadata)
      : getMapMetadata(mapOrMeta);

  const { x, y } = worldToRadarPixel(worldX, worldY, meta);
  return { pixelX: x, pixelY: y };
}

export function worldToRadarPercent(
  worldX: number,
  worldY: number,
  mapOrMeta: CS2Map | MapMetadata | string
): { percentX: number; percentY: number } {
  const { pixelX, pixelY } = worldToRadarPixels(worldX, worldY, mapOrMeta);
  return {
    percentX: (pixelX / 1024) * 100,
    percentY: (pixelY / 1024) * 100,
  };
}

export function worldToRadarUV(
  worldX: number,
  worldY: number,
  mapOrMeta: CS2Map | MapMetadata | string
): { u: number; v: number } {
  const { pixelX, pixelY } = worldToRadarPixels(worldX, worldY, mapOrMeta);
  return { u: pixelX, v: pixelY };
}

export function worldRadiusToCanvasPixels(
  worldRadius: number,
  mapOrMeta: CS2Map | MapMetadata | string,
  canvasSize: number = 1024
): number {
  const meta =
    typeof mapOrMeta === 'object' && mapOrMeta !== null
      ? (mapOrMeta as MapMetadata)
      : getMapMetadata(mapOrMeta);

  const scale = meta.scale > 0 ? meta.scale : 5.0;
  return (worldRadius / scale) * (canvasSize / 1024);
}

export function isBelowSplitZ(z: number, map: string): boolean {
  if (map === 'de_nuke') {
    return z < -480;
  }
  return false;
}

export function worldToCanvas(
  worldX: number,
  worldY: number,
  metadata: MapMetadata,
  canvasWidth: number,
  canvasHeight: number,
  zoom: number = 1.0,
  pan: { x: number; y: number } = { x: 0, y: 0 }
): { x: number; y: number } {
  const radar = worldToRadarPixel(worldX, worldY, metadata);
  const radarW = metadata.radarWidth || 1024;
  const radarH = metadata.radarHeight || 1024;

  const baseScaleX = canvasWidth / radarW;
  const baseScaleY = canvasHeight / radarH;

  const cx = radar.x * baseScaleX * zoom + pan.x;
  const cy = radar.y * baseScaleY * zoom + pan.y;

  return { x: cx, y: cy };
}
