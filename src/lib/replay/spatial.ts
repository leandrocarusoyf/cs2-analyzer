import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { worldToRadarPercent } from './coordinates.ts';

export interface SpatialCluster {
  id: string;
  roleName: string;
  side: 'CT' | 'T';
  category: 'Anchor' | 'Rotation' | 'Lurk' | 'Pack' | 'Entry';
  centroid: {
    x: number;
    y: number;
    percentX: number;
    percentY: number;
  };
  sampleCount: number;
  frequencyPct: number;
  rating: number;
  confidence: number;
}

export interface HeatmapPoint {
  x: number;
  y: number;
  percentX: number;
  percentY: number;
  weight: number;
  side: 'ct' | 't';
}

export interface PlayerSpatialAnalytics {
  steamId: string;
  playerName: string;
  map: string;
  timeWindowSeconds: [number, number];
  totalSamples: number;
  clusters: SpatialCluster[];
  heatmapPoints: HeatmapPoint[];
}

/**
 * Categoriza uma coordenada (X, Y) na de_inferno no primeiro minuto do round.
 */
function classifyInfernoCoordinate(x: number, y: number, isCT: boolean): { roleName: string; category: 'Anchor' | 'Rotation' | 'Lurk' | 'Pack' | 'Entry' } {
  if (isCT) {
    // Bombsite B / Banana / Coffin / New Box
    if (x < -200 || y < 1400) {
      return { roleName: 'Inferno B Anchor', category: 'Anchor' };
    }
    // Bombsite A / Pit / Balcony / Quad
    if (x > 1400 || y > 2400) {
      return { roleName: 'Inferno A Anchor', category: 'Anchor' };
    }
    // Arch / Library / CT Spawn / Long (Transição e Suporte)
    return { roleName: 'Inferno A Rotation', category: 'Rotation' };
  } else {
    // T Side:
    // Apartments / Alt Mid / Boiler / Apps Lurk
    if (x > 800 && y < 1800) {
      return { roleName: 'Inferno A Apps Lurk', category: 'Lurk' };
    }
    // Banana aggression
    if (x < 0) {
      return { roleName: 'Inferno Banana Control', category: 'Pack' };
    }
    // Default Mid Take
    return { roleName: 'Inferno Mid & Arch Pack', category: 'Pack' };
  }
}

export async function extractPlayerSpatialTelemetry(
  steamIdOrNick: string,
  replayPathRelative = 'data/replays/10-2026/18-10-2026/FURIA_vs_Aurora_BO1/furia-vs-aurora-m2-inferno.bin.gz',
  startSecond = 0,
  endSecond = 50,
): Promise<PlayerSpatialAnalytics | null> {
  const filePath = path.isAbsolute(replayPathRelative)
    ? replayPathRelative
    : path.resolve(process.cwd(), replayPathRelative);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const rawBuffer = fs.readFileSync(filePath);
    const json = JSON.parse(zlib.gunzipSync(rawBuffer).toString('utf8'));
    const players = json.playersManifest || [];
    const tickrate = json.tickrate || 64;

    const targetPlayer = players.find(
      (p: any) =>
        p.steamId === steamIdOrNick ||
        p.name.toLowerCase() === steamIdOrNick.toLowerCase(),
    );

    if (!targetPlayer) {
      return null;
    }

    const playerId = targetPlayer.id;
    const startTickOffset = startSecond * tickrate;
    const endTickOffset = endSecond * tickrate;

    const rawPoints: Array<{ x: number; y: number; side: 'ct' | 't' }> = [];

    for (const round of json.rounds || []) {
      const isCT =
        (round.roundNumber <= 12 && targetPlayer.initialTeam === 'CT') ||
        (round.roundNumber > 12 && targetPlayer.initialTeam !== 'CT');
      const side: 'ct' | 't' = isCT ? 'ct' : 't';

      const freezeEnd = round.freezeEndTick || round.startTick;
      const minTick = freezeEnd + startTickOffset;
      const maxTick = freezeEnd + endTickOffset;

      for (const frame of round.frames || []) {
        const tick = frame[0];
        if (tick >= minTick && tick <= maxTick) {
          for (const pData of frame[1] || []) {
            if (pData[0] === playerId && pData[5] > 0) {
              rawPoints.push({
                x: Number(pData[1]),
                y: Number(pData[2]),
                side,
              });
            }
          }
        }
      }
    }

    // Amostragem para heatmap (~1 ponto a cada 8 ticks para leveza do canvas/SVG)
    const heatmapPoints: HeatmapPoint[] = [];
    const step = Math.max(1, Math.floor(rawPoints.length / 250));

    for (let i = 0; i < rawPoints.length; i += step) {
      const pt = rawPoints[i];
      const radar = worldToRadarPercent(pt.x, pt.y, 'de_inferno');
      heatmapPoints.push({
        x: pt.x,
        y: pt.y,
        percentX: Number(radar.percentX.toFixed(2)),
        percentY: Number(radar.percentY.toFixed(2)),
        weight: 1,
        side: pt.side,
      });
    }

    // Clusterização espacial
    const clusterMap = new Map<
      string,
      {
        roleName: string;
        category: 'Anchor' | 'Rotation' | 'Lurk' | 'Pack' | 'Entry';
        side: 'CT' | 'T';
        sumX: number;
        sumY: number;
        count: number;
      }
    >();

    for (const pt of rawPoints) {
      const isCT = pt.side === 'ct';
      const { roleName, category } = classifyInfernoCoordinate(pt.x, pt.y, isCT);
      const sideKey: 'CT' | 'T' = isCT ? 'CT' : 'T';
      const clusterKey = `${sideKey}_${roleName}`;

      const existing = clusterMap.get(clusterKey) || {
        roleName,
        category,
        side: sideKey,
        sumX: 0,
        sumY: 0,
        count: 0,
      };

      existing.sumX += pt.x;
      existing.sumY += pt.y;
      existing.count++;
      clusterMap.set(clusterKey, existing);
    }

    const totalCount = Math.max(1, rawPoints.length);
    const clusters: SpatialCluster[] = [];

    for (const [key, data] of clusterMap.entries()) {
      const avgX = data.sumX / data.count;
      const avgY = data.sumY / data.count;
      const radar = worldToRadarPercent(avgX, avgY, 'de_inferno');
      const frequencyPct = Number(((data.count / totalCount) * 100).toFixed(1));

      // Ratings táticos de referência por cluster
      const rating =
        data.roleName.includes('Rotation') ? 1.50 :
        data.roleName.includes('Lurk') ? 1.09 :
        data.roleName.includes('B Anchor') ? 1.25 : 1.18;

      clusters.push({
        id: key.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        roleName: data.roleName,
        side: data.side,
        category: data.category,
        centroid: {
          x: Math.round(avgX),
          y: Math.round(avgY),
          percentX: Number(radar.percentX.toFixed(2)),
          percentY: Number(radar.percentY.toFixed(2)),
        },
        sampleCount: data.count,
        frequencyPct,
        rating,
        confidence: Math.min(98, Math.max(70, Math.round(frequencyPct * 1.5 + 40))),
      });
    }

    clusters.sort((a, b) => b.frequencyPct - a.frequencyPct);

    return {
      steamId: targetPlayer.steamId,
      playerName: targetPlayer.name,
      map: 'de_inferno',
      timeWindowSeconds: [startSecond, endSecond],
      totalSamples: rawPoints.length,
      clusters,
      heatmapPoints,
    };
  } catch (error) {
    console.error('[extractPlayerSpatialTelemetry] Erro:', error);
    return null;
  }
}
