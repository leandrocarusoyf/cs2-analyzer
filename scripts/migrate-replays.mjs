import pg from 'pg';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {analyzeSpatial} from './spatial-analysis.mjs';
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const client=await pool.connect();
try {
 await client.query('BEGIN');
 await client.query(await readFile(new URL('./init-db.sql',import.meta.url),'utf8'));
 const maps=(await client.query('SELECT mm.*,m.replay_path AS parent_path FROM match_maps mm JOIN matches m ON mm.match_id=m.id')).rows;
 for(const m of maps) {
  let file=m.replay_path;
  if(!file && m.parent_path) {
   const dir=path.dirname(m.parent_path);
   const files=(await readdir(dir)).filter(f=>f.endsWith('.bin.gz')&&f.includes(m.map_name.replace('de_',''))).sort();
   if(files.length) file=path.join(dir,files.at(-1));
  }
  if(!file)continue;
  const replay=JSON.parse(gunzipSync(await readFile(file)));
  const num=Number(path.basename(file).match(/(?:-|^)m(\d+)-/)?.[1]||m.map_number||1);
  await client.query('UPDATE match_maps SET replay_path=$1,map_key=$2,map_number=$3 WHERE id=$4',[file,`m${num}`,num,m.id]);
  for(const player of replay.playersManifest || []) {
   const spatial=analyzeSpatial(replay,player);
   await client.query("UPDATE player_stats SET metrics_json=COALESCE(metrics_json,'{}'::jsonb) || $1::jsonb WHERE map_id=$2 AND player_steamid=$3",[JSON.stringify({roles:spatial.roles,spatial}),m.id,player.steamId]);
  }
 }
 await client.query(`UPDATE matches m SET replay_path=(SELECT replay_path FROM match_maps WHERE match_id=m.id ORDER BY map_number LIMIT 1)`);
 await client.query('COMMIT');
 console.log(`Migração concluída: ${maps.length} mapas. Arquivos originais preservados.`);
} catch(error) {await client.query('ROLLBACK');throw error;} finally {client.release();await pool.end();}
