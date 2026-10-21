import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { query } from '../../../../../../lib/db.ts';
import { resolveReplayFile } from '../../../../../../lib/replay/files.ts';
import { sideForRound } from '../../../../../../../scripts/spatial-analysis.mjs';

export async function GET(request: Request, {params}: {params: Promise<{steamId:string}>}) {
  try {
    const {steamId}=await params;
    const rows=(await query(`SELECT ps.*,mm.map_name,mm.replay_path,mm.rounds_t1,mm.rounds_t2,m.team1
      FROM player_stats ps JOIN match_maps mm ON ps.map_id=mm.id JOIN matches m ON ps.match_id=m.id
      WHERE ps.player_steamid=$1 OR lower(ps.nickname)=lower($1) ORDER BY m.match_date DESC`,[steamId])).rows;
    const buckets:Record<string,{rounds:number;wins:number;kills:number;deaths:number;damage:number}>={};
    const weapons:Record<string,{name:string;kills:number;damage:number}>={};
    for(const row of rows) {
      if(!row.replay_path)continue;
      const replay=JSON.parse(gunzipSync(await readFile(await resolveReplayFile(row.replay_path))).toString());
      const p=replay.playersManifest.find((p:any)=>p.steamId===row.player_steamid);
      if(!p)continue;
      const names=new Map(replay.weaponsManifest.map((w:any)=>[w.id,w.name]));
      for(const r of replay.rounds) {
        const side=sideForRound(p.initialTeam,r.roundNumber);
        const mine=side==='CT'?r.equipValueCT:r.equipValueT,other=side==='CT'?r.equipValueT:r.equipValueCT;
        if(mine==null||other==null)continue;
        const key=/pistol/i.test(r.buyTypeCT||'')&&/pistol/i.test(r.buyTypeT||'')?'Pistol':Math.abs(mine-other)<5000?'Equal Buy':mine>other?'Better Buy':'Worse Buy';
        const b=buckets[key] ||= {rounds:0,wins:0,kills:0,deaths:0,damage:0};b.rounds++;if(r.winnerSide===side)b.wins++;
        for(const k of r.kills||[]) {if(k[1]===p.id){b.kills++;const name=String(names.get(k[3])||k[3]);(weapons[name] ||= {name,kills:0,damage:0}).kills++;} if(k[2]===p.id)b.deaths++;}
        for(const d of r.damages||[]) if(d[1]===p.id){b.damage+=Number(d[3]);const name=String(names.get(d[5])||d[5]);(weapons[name] ||= {name,kills:0,damage:0}).damage+=Number(d[3]);}
      }
    }
    return Response.json({buyTypes:Object.entries(buckets).map(([name,b])=>({name,...b,winRatePct:100*b.wins/b.rounds,adr:b.damage/b.rounds,kd:b.deaths?b.kills/b.deaths:b.kills})),weapons:Object.values(weapons).sort((a,b)=>b.damage-a.damage),maps:rows.map(r=>({name:r.map_name,rounds:Number(r.rounds_t1)+Number(r.rounds_t2),rating:r.rating==null?null:Number(r.rating),adr:r.adr==null?null:Number(r.adr),kills:r.kills,deaths:r.deaths}))});
  } catch(error) {console.error('[breakdowns]',error);return Response.json({error:'Falha ao carregar telemetria'}, {status:500});}
}
