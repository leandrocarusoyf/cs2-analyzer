import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { MAP_CONFIGS, type CS2Map, type MapConfig } from '../src/constants/maps.ts';
import {
  worldToRadarPixels,
  worldToRadarPercent,
} from '../src/lib/replay/coordinates.ts';

describe('MAP_CONFIGS Constants', () => {
  it('deve conter exatamente os 7 mapas competitivos oficiais com valores exatos e imutáveis', () => {
    assert.equal(Object.isFrozen(MAP_CONFIGS), true);

    const expectedConfigs: Record<CS2Map, MapConfig> = {
      de_mirage: { posX: -3230, posY: 1713, scale: 5.0 },
      de_inferno: { posX: -2087, posY: 3870, scale: 4.9 },
      de_dust2: { posX: -2476, posY: 3239, scale: 4.4 },
      de_nuke: {
        posX: -3453,
        posY: 2887,
        scale: 7.0,
        hasVerticalLayers: true,
        verticalThresholdZ: -495,
        lowerRadarImage: '/maps/de_nuke_lower_radar.png',
      },
      de_ancient: { posX: -2953, posY: 2164, scale: 4.5 },
      de_anubis: { posX: -2796, posY: 3328, scale: 5.22 },
      de_cache: { posX: -2000, posY: 3250, scale: 5.5 },
    };

    assert.deepEqual(MAP_CONFIGS, expectedConfigs);

    for (const key of Object.keys(MAP_CONFIGS) as CS2Map[]) {
      assert.equal(Object.isFrozen(MAP_CONFIGS[key]), true);
    }
  });
});

describe('Radar Coordinate Conversions (Valve Canonical Formulas)', () => {
  it('deve converter o ponto de origem (worldX = posX, worldY = posY) para pixel (0, 0) e (0%, 0%) em todos os mapas', () => {
    const maps = Object.keys(MAP_CONFIGS) as CS2Map[];

    for (const map of maps) {
      const { posX, posY } = MAP_CONFIGS[map];

      const pixels = worldToRadarPixels(posX, posY, map);
      assert.deepEqual(pixels, { pixelX: 0, pixelY: 0 });

      const percent = worldToRadarPercent(posX, posY, map);
      assert.deepEqual(percent, { percentX: 0, percentY: 0 });
    }
  });

  it('deve converter coordenadas no de_mirage (worldX = 1870, worldY = -3407) exatamente para pixelX = 1020 e pixelY = 1024', () => {
    const pixels = worldToRadarPixels(1870, -3407, 'de_mirage');
    assert.deepEqual(pixels, { pixelX: 1020, pixelY: 1024 });

    const percent = worldToRadarPercent(1870, -3407, 'de_mirage');
    assert.deepEqual(percent, {
      percentX: (1020 / 1024) * 100,
      percentY: 100,
    });
  });

  it('deve converter o ponto de origem da de_cache (worldX = -2000, worldY = 3250) para pixel (0, 0)', () => {
    const pixels = worldToRadarPixels(-2000, 3250, 'de_cache');
    assert.deepEqual(pixels, { pixelX: 0, pixelY: 0 });

    const percent = worldToRadarPercent(-2000, 3250, 'de_cache');
    assert.deepEqual(percent, { percentX: 0, percentY: 0 });
  });

  it('deve lançar erro ao passar um mapa inválido', () => {
    const invalidMap = 'de_cbble' as unknown as CS2Map;

    assert.throws(
      () => worldToRadarPixels(0, 0, invalidMap),
      /Invalid or unsupported CS2 map: "de_cbble"/,
    );

    assert.throws(
      () => worldToRadarPercent(0, 0, invalidMap),
      /Invalid or unsupported CS2 map: "de_cbble"/,
    );
  });
});
