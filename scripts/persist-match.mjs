import { createHash } from 'node:crypto';

export function stableUuid(seed) {
  const h = createHash('sha256').update(seed).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}

// Caller owns the transaction and the series advisory lock.
export async function persistMatch(client, { matchRecord: m, rawDemo, playerStats, replayPath, demoPath, targetMatchId, mapIdentifier }) {
  const id = targetMatchId;
  const existing = (await client.query('SELECT * FROM matches WHERE id = $1 FOR UPDATE', [id])).rows[0];
  const team1 = existing?.team1 ?? m.team_ct_name;
  const team2 = existing?.team2 ?? m.team_t_name;
  const reversed = team1 !== m.team_ct_name;
  const scores = reversed ? [m.score_t, m.score_ct] : [m.score_ct, m.score_t];
  const mapNumber = Number(mapIdentifier?.slice(1) || 1);
  const mapKey = mapIdentifier || m.map_name;
  const mapId = stableUuid(`${id}:${mapKey}`);
  await client.query(`INSERT INTO matches(id,match_date,team1,team2,format,score_t1,score_t2,replay_path)
    VALUES($1,$2,$3,$4,$5,0,0,$6) ON CONFLICT(id) DO UPDATE SET match_date=EXCLUDED.match_date`,
    [id,m.played_at,team1,team2,rawDemo.format || 'BO1',replayPath]);
  // Replace just this map, including rows written by the previous schema.
  await client.query('DELETE FROM match_maps WHERE match_id=$1 AND (map_key=$2 OR (map_key IS NULL AND map_name=$3))', [id,mapKey,m.map_name]);
  await client.query(`INSERT INTO match_maps(id,match_id,map_key,map_number,map_name,rounds_t1,rounds_t2,duration,replay_path,demo_path,demo_hash)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [mapId,id,mapKey,mapNumber,m.map_name,...scores,Math.round(rawDemo.rounds.reduce((sum,r)=>sum+(r.endTick-r.startTick)/(rawDemo.tickrate||64),0)),replayPath,demoPath,m.demo_hash]);
  for (const p of playerStats) {
    await client.query(`INSERT INTO player_stats(match_id,map_id,player_steamid,nickname,team,rating,adr,kast,kills,deaths,assists,ttd,ttk,fsp,metrics_json)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [id,mapId,p.steamId,p.name,p.teamName || (p.initialTeam === rawDemo.team1StartingSide ? m.team_ct_name : m.team_t_name),p.metrics.hltv.overall,p.metrics.adr.overall,p.metrics.kast.overall,p.kills,p.deaths,p.assists,p.ttd,p.ttk,p.fsp,p.metricsJson]);
  }
  const maps = (await client.query('SELECT * FROM match_maps WHERE match_id=$1 ORDER BY map_number', [id])).rows;
  const series = Boolean(mapIdentifier) || maps.length > 1;
  const format = /5/.test(existing?.format || rawDemo.format || '') || maps.some(m=>m.map_number>=4) ? 'BO5' : series ? 'BO3' : 'BO1';
  const s1 = series ? maps.filter(m=>m.rounds_t1>m.rounds_t2).length : scores[0];
  const s2 = series ? maps.filter(m=>m.rounds_t2>m.rounds_t1).length : scores[1];
  const complete = !series || Math.max(s1,s2) >= (format === 'BO5' ? 3 : 2);
  await client.query('UPDATE matches SET format=$2,score_t1=$3,score_t2=$4,winner=$5,replay_path=$6 WHERE id=$1',
    [id,format,s1,s2,complete && s1!==s2 ? s1>s2 ? team1 : team2 : null,maps[0].replay_path]);
  return id;
}
