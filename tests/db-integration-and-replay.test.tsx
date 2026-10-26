// @vitest-environment node
import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest';
import {mkdir,writeFile,readFile,readdir,rm,access} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {processDemoFile,generateDeterministicSeriesId} from '../scripts/process-demo.mjs';
import {analyzeSpatial,sideForRound} from '../scripts/spatial-analysis.mjs';
import {normalizeReplayPayload} from '../src/lib/replay/decompress.ts';
import {interpolateSnapshotFrames} from '../src/lib/replay/interpolation.ts';
let testPool:pg.Pool;
vi.mock('../src/lib/db.ts',()=>({pool:{connect:()=>testPool.connect()},query:(sql:string,values:any[])=>testPool.query(sql,values)}));
import {DELETE,GET as metadata} from '../src/app/api/matches/[id]/route.ts';
import {GET as replayRoute} from '../src/app/api/replays/[id]/route.ts';
import {getMatchById,getPlayerPerformance} from '../src/lib/queries/matches.ts';
const schema=`test_refactor_${randomUUID().replaceAll('-','')}`;
const dir=path.resolve('data/replays',schema);
const base={map:'de_inferno',playedAt:'2026-01-02T12:00:00Z',teamCtName:'Test Alpha',teamTName:'Test Beta',team1StartingSide:'CT',players:[{steamId:'1001',name:'Alpha',team:'CT',teamName:'Test Alpha'},{steamId:'1002',name:'Beta',team:'T',teamName:'Test Beta'}],rounds:[{roundNumber:1,startTick:0,freezeEndTick:0,endTick:4096,winnerSide:'CT',kills:[{tick:3000,killerSteamId:'1001',victimSteamId:'1002',weaponId:7}],damages:[{tick:3000,attackerSteamId:'1001',victimSteamId:'1002',damage:100,weaponId:7}],frames:Array.from({length:55},(_,i)=>[i*64,[[1,400,2800,100,0,100,0,0,1,0,0,7,0,0],[2,500,1000,100,0,100,0,0,1,0,0,7,0,0]]])}]};
let seriesId='';let mapId='';
async function ingest(name:string,overrides={}) {
 const file=path.join(dir,name);await writeFile(file,JSON.stringify({...base,...overrides}));
 return processDemoFile(file,{pgPool:testPool,replaysBaseDir:dir,skipAssets:true,logsDir:dir});
}
beforeAll(async()=>{
 const url=process.env.DATABASE_URL || 'postgresql://cs2admin:cs2secret@localhost:5432/cs2_analytics';
 const admin=new pg.Pool({connectionString:url});await admin.query(`CREATE SCHEMA ${schema}`);await admin.end();
 testPool=new pg.Pool({connectionString:url,options:`-c search_path=${schema},public`});
 await testPool.query(await readFile('scripts/init-db.sql','utf8'));await mkdir(dir,{recursive:true});
});
afterAll(async()=>{await testPool.query(`DROP SCHEMA ${schema} CASCADE`);await testPool.end();await rm(dir,{recursive:true,force:true});});
describe('Ingestion and deletion with isolated PostgreSQL tables',()=>{
 it('uses a deterministic identity independent of team order',()=>{
  expect(generateDeterministicSeriesId({playedAt:base.playedAt,team1:base.teamCtName,team2:base.teamTName})).toBe(generateDeterministicSeriesId({playedAt:base.playedAt,team1:base.teamTName,team2:base.teamCtName}));
 });
 it('groups maps, replaces duplicates, and keeps one row per player per map',async()=>{
  const first=await ingest('series-m1-inferno.dem');seriesId=first.matchId;
  await ingest('series-m2-mirage.dem',{map:'de_mirage'});
  const before=(await testPool.query('SELECT id FROM match_maps WHERE map_number=1')).rows[0].id;
  await ingest('new-upload-m1-inferno.dem');
  expect((await testPool.query('SELECT * FROM matches')).rows).toHaveLength(1);
  const maps=(await testPool.query('SELECT * FROM match_maps ORDER BY map_number')).rows;
  expect(maps).toHaveLength(2);expect(maps[0].id).toBe(before);mapId=maps[0].id;
  expect((await testPool.query('SELECT * FROM player_stats')).rows).toHaveLength(4);
  const parent=await getMatchById(seriesId);expect(parent?.format).toBe('BO3');expect(parent?.score_t1).toBe(2);
  const performance=await getPlayerPerformance('1001');expect(performance?.history).toHaveLength(2);expect(performance?.kpr).toBe(1);
  expect((await readdir(path.dirname(maps[0].replay_path))).filter(f=>f.endsWith('.bin.gz'))).toHaveLength(2);
 });
 it('selects map-specific metadata and binary replay and binds names/sides',async()=>{
  const res=await metadata(new Request('http://localhost'),{params:Promise.resolve({id:mapId})});expect(res.status).toBe(200);
  const match=(await res.json()).match;expect(match.players).toHaveLength(2);
  const response=await replayRoute(new Request('http://localhost?format=json'),{params:Promise.resolve({id:mapId})});expect(response.status).toBe(200);
  const replay=normalizeReplayPayload(await response.json(),mapId);
  const meta=Object.fromEntries(replay.playersManifest.map(p=>[String(p.id),{id:p.id,name:p.name,team:p.initialTeam}]));
  const players=interpolateSnapshotFrames(replay.rounds[0].tacticalFrames,100,'de_inferno',meta);
  expect(players.map(p=>p.name)).toEqual(['Alpha','Beta']);expect(players.map(p=>p.team)).toEqual(['CT','T']);
 });
 it('removes the source demo and rolls back a failed transaction',async()=>{
  const file=path.join(dir,'failure.dem');await writeFile(file,JSON.stringify(base));
  const client={query:vi.fn(async(sql:string)=>{if(sql.includes('INSERT INTO matches'))throw new Error('simulated database failure');return {rows:[]}})};
  await expect(processDemoFile(file,{dbClient:client,replaysBaseDir:dir,logsDir:dir,skipAssets:true})).rejects.toThrow('simulated');
  await expect(access(file)).rejects.toThrow();expect(client.query.mock.calls.some(([sql])=>sql==='ROLLBACK')).toBe(true);
 });
 it('infers roles from live positions and ignores dead/freeze samples',()=>{
  const replay={map:'de_inferno',tickrate:64,rounds:base.rounds};const spatial=analyzeSpatial(replay,{id:1,steamId:'1001',name:'Alpha',initialTeam:'CT'});
  expect(spatial.roles.ct).toBe('Inferno B Anchor');expect(spatial.totalSamples).toBe(41);
  expect(sideForRound('CT',13)).toBe('T');expect(sideForRound('CT',25)).toBe('CT');expect(sideForRound('CT',28)).toBe('T');
 });
 it('rejects traversal and physically removes the registered series files',async()=>{
  const bad=await DELETE(new Request('http://localhost'),{params:Promise.resolve({id:'../secret'})});expect(bad.status).toBe(400);
  const storedMaps=(await testPool.query('SELECT replay_path,demo_path FROM match_maps')).rows;
  expect(storedMaps.every(r=>r.demo_path===null)).toBe(true);
  const files=storedMaps.flatMap(r=>[r.replay_path,r.demo_path]).filter(Boolean);
  const res=await DELETE(new Request('http://localhost'),{params:Promise.resolve({id:seriesId})});expect(res.status).toBe(200);
  expect((await testPool.query('SELECT * FROM matches')).rows).toHaveLength(0);expect((await testPool.query('SELECT * FROM player_stats')).rows).toHaveLength(0);
  for(const file of files)await expect(access(file)).rejects.toThrow();
  expect((await replayRoute(new Request('http://localhost'),{params:Promise.resolve({id:mapId})})).status).toBe(404);
 });
});
