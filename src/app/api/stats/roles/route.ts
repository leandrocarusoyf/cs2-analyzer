import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db.ts';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roleName = searchParams.get('role') || 'Inferno A Rotation';
    const mapName = searchParams.get('map') || 'de_inferno';

    const sql = `
      SELECT 
        ps.player_steamid,
        ps.nickname,
        ps.team,
        ps.rating,
        ps.adr,
        ps.kast,
        ps.kills,
        ps.deaths,
        ps.metrics_json
      FROM player_stats ps
      JOIN matches m ON ps.match_id = m.id
      ORDER BY ps.rating DESC NULLS LAST;
    `;

    const res = await query(sql);
    const rows = res?.rows ?? [];

    // Formata e extrai a função de cada jogador
    const players = rows.map((r: any) => {
      const parsedMetrics =
        typeof r.metrics_json === 'string'
          ? (() => {
              try {
                return JSON.parse(r.metrics_json);
              } catch {
                return {};
              }
            })()
          : r.metrics_json || {};

      const deaths = Number(r.deaths || 0);
      const kills = Number(r.kills || 0);
      const kd = deaths > 0 ? Number((kills / deaths).toFixed(2)) : kills;

      // Determina a role de acordo com o metrics_json ou inferência tática
      const ctRole = parsedMetrics?.roles?.ct || 'CT Rotation';
      const tRole = parsedMetrics?.roles?.t || 'T Lurk';

      return {
        steamId: r.player_steamid,
        nickname: r.nickname,
        team: r.team,
        rating: r.rating !== null ? Number(r.rating) : 1.0,
        adr: r.adr !== null ? Number(r.adr) : 75.0,
        kast: r.kast !== null ? Number(r.kast) : 70.0,
        kd,
        ctRole,
        tRole,
        matchedRole: roleName,
      };
    });

    return NextResponse.json({
      role: roleName,
      map: mapName,
      count: players.length,
      players,
    });
  } catch (error: any) {
    console.error('[API /api/stats/roles] Error:', error);
    return NextResponse.json(
      { error: 'Failed to query role players', details: error.message },
      { status: 500 },
    );
  }
}
