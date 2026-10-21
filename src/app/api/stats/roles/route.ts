import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db.ts';
export async function GET(req: NextRequest) {
  try {
    const params=new URL(req.url).searchParams;
    const role=params.get('role'), map=params.get('map');
    const rows=(await query(`SELECT ps.player_steamid AS "steamId",ps.nickname,ps.team,
      ROUND(AVG(ps.rating),2) AS rating,ROUND(AVG(ps.adr),1) AS adr,
      ps.metrics_json->'roles'->>'ct' AS "ctRole", ps.metrics_json->'roles'->>'t' AS "tRole"
      FROM player_stats ps JOIN match_maps mm ON ps.map_id=mm.id
      WHERE ($1::text IS NULL OR mm.map_name=$1) AND ($2::text IS NULL OR ps.metrics_json->'roles'->>'ct'=$2 OR ps.metrics_json->'roles'->>'t'=$2)
      GROUP BY ps.player_steamid,ps.nickname,ps.team,"ctRole","tRole" ORDER BY rating DESC NULLS LAST`,[map,role])).rows;
    return NextResponse.json({role,map,count:rows.length,players:rows});
  } catch {return NextResponse.json({error:'Falha ao consultar roles'}, {status:500});}
}
