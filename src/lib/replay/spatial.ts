import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { query } from '../db.ts';
import { resolveReplayFile } from './files.ts';
import { worldToRadarPercent } from './coordinates.ts';
import { analyzeSpatial } from '../../../scripts/spatial-analysis.mjs';

export async function extractPlayerSpatialTelemetry(steamIdOrNick: string, replayPathRelative?: string, startSecond=10, endSecond=50) {
  let stored = replayPathRelative;
  if (!stored) {
    const rows = (await query(`SELECT mm.replay_path FROM player_stats ps JOIN match_maps mm ON ps.map_id=mm.id
      JOIN matches m ON m.id=ps.match_id WHERE ps.player_steamid=$1 OR lower(ps.nickname)=lower($1)
      ORDER BY m.match_date DESC,mm.map_number DESC LIMIT 1`,[steamIdOrNick])).rows;
    stored=rows[0]?.replay_path;
  }
  if (!stored) return null;
  const replay=JSON.parse(gunzipSync(await readFile(await resolveReplayFile(stored))).toString());
  const player=replay.playersManifest?.find((p: {steamId:string;name:string})=>p.steamId===steamIdOrNick || p.name.toLowerCase()===steamIdOrNick.toLowerCase());
  if (!player) return null;
  const data=analyzeSpatial(replay,player,startSecond,endSecond);
  return {...data,clusters:data.clusters.map(c=>({...c,centroid:{...c.centroid,...worldToRadarPercent(c.centroid.x,c.centroid.y,replay.map)}})),heatmapPoints:data.heatmapPoints.map(p=>({...p,...worldToRadarPercent(p.x,p.y,replay.map)}))};
}
