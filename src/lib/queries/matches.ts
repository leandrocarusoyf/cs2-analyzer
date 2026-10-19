import { pool, query } from '../db.ts';
import type { RecentMatchTelemetry } from '../../types/stats.ts';

export interface DbPlayerStat {
  id?: string;
  match_id: string;
  map_id?: string | null;
  player_steamid: string;
  nickname: string;
  team: string;
  rating: number | null;
  adr: number | null;
  kast: number | null;
  kills: number;
  deaths: number;
  assists: number;
  ttd: number | null;
  ttk: number | null;
  fsp: number | null;
  metrics_json?: Record<string, any> | null;
}

export interface MatchWithDetails {
  id: string;
  match_date: Date | string;
  team1: string;
  team2: string;
  format: string;
  score_t1: number;
  score_t2: number;
  winner: string | null;
  replay_path: string | null;
  demo_hash: string | null;
  created_at?: Date | string;
  map_id?: string | null;
  map_name?: string | null;
  rounds_t1?: number;
  rounds_t2?: number;
  duration?: number;
  rounds_count?: number;
  players: DbPlayerStat[];
}

export interface PlayerPerformanceResult {
  steamId: string;
  nickname: string;
  team: string;
  matchesCount: number;
  currentRating: number;
  adr: number;
  kd: number;
  kpr: number;
  dpr: number;
  kastPct: number;
  ttd: number | null;
  ttk: number | null;
  fsp: number | null;
  history: Array<{
    matchId: string;
    mapName: string;
    date: string;
    opponent: string;
    score: string;
    result: 'W' | 'L';
    rating: number;
    adr: number;
    kills: number;
    deaths: number;
    ttd: number | null;
    ttk: number | null;
    fsp: number | null;
  }>;
  telemetry: RecentMatchTelemetry[];
}

function normalizeTeamSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

function formatDate(dateVal: Date | string | undefined | null): string {
  if (!dateVal) return '18/10';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '18/10';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

/**
 * Busca as partidas salvas na tabela `matches` com join em `match_maps` e `player_stats`.
 */
export async function getRecentMatches(limit = 10): Promise<MatchWithDetails[]> {
  try {
    const matchesSql = `
      SELECT 
        m.id,
        m.match_date,
        m.team1,
        m.team2,
        m.format,
        m.score_t1,
        m.score_t2,
        m.winner,
        m.replay_path,
        m.demo_hash,
        m.created_at,
        mm.id AS map_id,
        mm.map_name,
        mm.rounds_t1,
        mm.rounds_t2,
        mm.duration,
        COALESCE(mm.rounds_t1 + mm.rounds_t2, m.score_t1 + m.score_t2) AS rounds_count
      FROM matches m
      LEFT JOIN match_maps mm ON m.id = mm.match_id
      ORDER BY m.match_date DESC
      LIMIT $1;
    `;
    const matchRes = await query(matchesSql, [limit]);
    const matchRows = matchRes?.rows ?? [];
    if (matchRows.length === 0) {
      return [];
    }

    const matchIds = matchRows.map((r) => r.id);
    const playersSql = `
      SELECT 
        id,
        match_id,
        map_id,
        player_steamid,
        nickname,
        team,
        rating,
        adr,
        kast,
        kills,
        deaths,
        assists,
        ttd,
        ttk,
        fsp,
        metrics_json
      FROM player_stats
      WHERE match_id = ANY($1::uuid[])
      ORDER BY rating DESC NULLS LAST;
    `;
    const playersRes = await query(playersSql, [matchIds]);
    const playerRows = playersRes?.rows ?? [];

    const playersByMatch = new Map<string, DbPlayerStat[]>();
    for (const p of playerRows) {
      const list = playersByMatch.get(p.match_id) || [];
      const parsedMetrics =
        typeof p.metrics_json === 'string'
          ? (() => {
              try {
                return JSON.parse(p.metrics_json);
              } catch {
                return {};
              }
            })()
          : p.metrics_json || {};

      list.push({
        ...p,
        rating: p.rating !== null && p.rating !== undefined ? Number(p.rating) : null,
        adr: p.adr !== null && p.adr !== undefined ? Number(p.adr) : null,
        kast: p.kast !== null && p.kast !== undefined ? Number(p.kast) : null,
        ttd: p.ttd !== null && p.ttd !== undefined ? Number(p.ttd) : null,
        ttk: p.ttk !== null && p.ttk !== undefined ? Number(p.ttk) : null,
        fsp: p.fsp !== null && p.fsp !== undefined ? Number(p.fsp) : null,
        metrics_json: parsedMetrics,
      });
      playersByMatch.set(p.match_id, list);
    }

    return matchRows.map((row) => ({
      id: row.id,
      match_date: row.match_date,
      team1: row.team1,
      team2: row.team2,
      format: row.format,
      score_t1: Number(row.score_t1),
      score_t2: Number(row.score_t2),
      winner: row.winner,
      replay_path: row.replay_path,
      demo_hash: row.demo_hash,
      created_at: row.created_at,
      map_id: row.map_id,
      map_name: row.map_name || 'de_inferno',
      rounds_t1: row.rounds_t1 !== null ? Number(row.rounds_t1) : undefined,
      rounds_t2: row.rounds_t2 !== null ? Number(row.rounds_t2) : undefined,
      duration: row.duration !== null ? Number(row.duration) : undefined,
      rounds_count: row.rounds_count !== null ? Number(row.rounds_count) : Number(row.score_t1) + Number(row.score_t2),
      players: playersByMatch.get(row.id) || [],
    }));
  } catch (err) {
    console.error('[getRecentMatches] Database error, returning fallback:', err);
    return [];
  }
}

/**
 * Busca uma partida específica no PostgreSQL pelo ID (UUID) ou demo_hash,
 * trazendo dados completos do mapa (match_maps) e estatísticas dos 10 jogadores (player_stats).
 */
export async function getMatchById(id: string): Promise<MatchWithDetails | null> {
  try {
    const matchSql = `
      SELECT 
        m.id,
        m.match_date,
        m.team1,
        m.team2,
        m.format,
        m.score_t1,
        m.score_t2,
        m.winner,
        m.replay_path,
        m.demo_hash,
        m.created_at,
        mm.id AS map_id,
        mm.map_name,
        mm.rounds_t1,
        mm.rounds_t2,
        mm.duration,
        COALESCE(mm.rounds_t1 + mm.rounds_t2, m.score_t1 + m.score_t2) AS rounds_count
      FROM matches m
      LEFT JOIN match_maps mm ON m.id = mm.match_id
      WHERE m.id::text = $1 OR m.demo_hash = $1
      LIMIT 1;
    `;
    const matchRes = await query(matchSql, [id]);
    const matchRows = matchRes?.rows ?? [];
    if (matchRows.length === 0) {
      return null;
    }

    const row = matchRows[0];
    const matchUuid = row.id;

    const playersSql = `
      SELECT 
        id,
        match_id,
        map_id,
        player_steamid,
        nickname,
        team,
        rating,
        adr,
        kast,
        kills,
        deaths,
        assists,
        ttd,
        ttk,
        fsp,
        metrics_json
      FROM player_stats
      WHERE match_id = $1::uuid
      ORDER BY rating DESC NULLS LAST;
    `;
    const playersRes = await query(playersSql, [matchUuid]);
    const playerRows = playersRes?.rows ?? [];

    const players: DbPlayerStat[] = playerRows.map((p) => {
      const parsedMetrics =
        typeof p.metrics_json === 'string'
          ? (() => {
              try {
                return JSON.parse(p.metrics_json);
              } catch {
                return {};
              }
            })()
          : p.metrics_json || {};

      return {
        ...p,
        rating: p.rating !== null && p.rating !== undefined ? Number(p.rating) : null,
        adr: p.adr !== null && p.adr !== undefined ? Number(p.adr) : null,
        kast: p.kast !== null && p.kast !== undefined ? Number(p.kast) : null,
        ttd: p.ttd !== null && p.ttd !== undefined ? Number(p.ttd) : null,
        ttk: p.ttk !== null && p.ttk !== undefined ? Number(p.ttk) : null,
        fsp: p.fsp !== null && p.fsp !== undefined ? Number(p.fsp) : null,
        metrics_json: parsedMetrics,
      };
    });

    return {
      id: row.id,
      match_date: row.match_date,
      team1: row.team1,
      team2: row.team2,
      format: row.format,
      score_t1: Number(row.score_t1),
      score_t2: Number(row.score_t2),
      winner: row.winner,
      replay_path: row.replay_path,
      demo_hash: row.demo_hash,
      created_at: row.created_at,
      map_id: row.map_id,
      map_name: row.map_name || 'de_inferno',
      rounds_t1: row.rounds_t1 !== null ? Number(row.rounds_t1) : undefined,
      rounds_t2: row.rounds_t2 !== null ? Number(row.rounds_t2) : undefined,
      duration: row.duration !== null ? Number(row.duration) : undefined,
      rounds_count: row.rounds_count !== null ? Number(row.rounds_count) : Number(row.score_t1) + Number(row.score_t2),
      players,
    };
  } catch (err) {
    console.error('[getMatchById] Database error, returning fallback:', err);
    return null;
  }
}

/**
 * Extrai o histórico do jogador e o `metrics_json` (com dados consolidados de CT, TR e Overall).
 */
export async function getPlayerPerformance(
  steamId: string,
  limit = 10,
): Promise<PlayerPerformanceResult | null> {
  try {
    const sql = `
      SELECT 
        ps.id,
        ps.match_id,
        ps.map_id,
        ps.player_steamid,
        ps.nickname,
        ps.team,
        ps.rating,
        ps.adr,
        ps.kast,
        ps.kills,
        ps.deaths,
        ps.assists,
        ps.ttd,
        ps.ttk,
        ps.fsp,
        ps.metrics_json,
        m.match_date,
        m.team1,
        m.team2,
        m.score_t1,
        m.score_t2,
        m.winner,
        mm.map_name
      FROM player_stats ps
      JOIN matches m ON ps.match_id = m.id
      LEFT JOIN match_maps mm ON ps.map_id = mm.id OR ps.match_id = mm.match_id
      WHERE ps.player_steamid = $1
      ORDER BY m.match_date ASC
      LIMIT $2;
    `;
    const res = await query(sql, [steamId, limit]);
    const rows = res?.rows ?? [];

    if (rows.length === 0) {
      return null;
    }

    const latest = rows[rows.length - 1];

    let totalRating = 0;
    let totalAdr = 0;
    let totalKills = 0;
    let totalDeaths = 0;
    let totalKast = 0;
    let ttdSamples: number[] = [];
    let ttkSamples: number[] = [];
    let fspSamples: number[] = [];

    const history: PlayerPerformanceResult['history'] = [];
    const telemetry: RecentMatchTelemetry[] = [];

    for (const row of rows) {
      const rating = row.rating !== null && row.rating !== undefined ? Number(row.rating) : 1.0;
      const adr = row.adr !== null && row.adr !== undefined ? Number(row.adr) : 0;
      const kills = Number(row.kills || 0);
      const deaths = Number(row.deaths || 0);
      const kast = row.kast !== null && row.kast !== undefined ? Number(row.kast) : 70;
      const ttd = row.ttd !== null && row.ttd !== undefined ? Number(row.ttd) : null;
      const ttk = row.ttk !== null && row.ttk !== undefined ? Number(row.ttk) : null;
      const fsp = row.fsp !== null && row.fsp !== undefined ? Number(row.fsp) : null;

      totalRating += rating;
      totalAdr += adr;
      totalKills += kills;
      totalDeaths += deaths;
      totalKast += kast;
      if (ttd !== null) ttdSamples.push(ttd);
      if (ttk !== null) ttkSamples.push(ttk);
      if (fsp !== null) fspSamples.push(fsp);

      const isTeam1 = row.team === row.team1;
      const teamScore = isTeam1 ? Number(row.score_t1 ?? 0) : Number(row.score_t2 ?? 0);
      const opponentScore = isTeam1 ? Number(row.score_t2 ?? 0) : Number(row.score_t1 ?? 0);
      const opponentTeam = isTeam1 ? (row.team2 ?? 'Opponent') : (row.team1 ?? 'Opponent');
      const opponentSlug = normalizeTeamSlug(opponentTeam);
      const isWinner = row.winner === row.team || teamScore > opponentScore;
      const result: 'W' | 'L' = isWinner ? 'W' : 'L';
      const cleanMap = (row.map_name || 'de_inferno').replace('de_', '').toUpperCase();

      const rawMetricsJson =
        typeof row.metrics_json === 'string'
          ? (() => {
              try {
                return JSON.parse(row.metrics_json);
              } catch {
                return {};
              }
            })()
          : row.metrics_json || {};

      const safeHltv = rawMetricsJson?.hltv ?? {};
      const safeAdr = rawMetricsJson?.adr ?? {};
      const safeKd = rawMetricsJson?.kd ?? {};
      const safeKpr = rawMetricsJson?.kpr ?? {};
      const safeUdr = rawMetricsJson?.udr ?? {};
      const safeKast = rawMetricsJson?.kast ?? {};

      // Garante estrutura completa consolidada de CT, TR e Overall convertidos para Number
      const metrics = {
        hltv: {
          overall: Number(safeHltv?.overall ?? rating),
          ct: Number(safeHltv?.ct ?? rating),
          t: Number(safeHltv?.t ?? rating),
        },
        adr: {
          overall: Number(safeAdr?.overall ?? adr),
          ct: Number(safeAdr?.ct ?? adr),
          t: Number(safeAdr?.t ?? adr),
        },
        kd: {
          overall: Number(safeKd?.overall ?? (deaths > 0 ? Number((kills / deaths).toFixed(2)) : kills)),
          ct: Number(safeKd?.ct ?? (deaths > 0 ? Number((kills / deaths).toFixed(2)) : kills)),
          t: Number(safeKd?.t ?? (deaths > 0 ? Number((kills / deaths).toFixed(2)) : kills)),
        },
        kpr: {
          overall: Number(safeKpr?.overall ?? Number((kills / 23).toFixed(2))),
          ct: Number(safeKpr?.ct ?? Number((kills / 23).toFixed(2))),
          t: Number(safeKpr?.t ?? Number((kills / 23).toFixed(2))),
        },
        udr: {
          overall: Number(safeUdr?.overall ?? 0),
          ct: Number(safeUdr?.ct ?? 0),
          t: Number(safeUdr?.t ?? 0),
        },
        kast: {
          overall: Number(safeKast?.overall ?? kast),
          ct: Number(safeKast?.ct ?? kast),
          t: Number(safeKast?.t ?? kast),
        },
      };

      const dateStr = formatDate(row.match_date);

      history.push({
        matchId: row.match_id,
        mapName: row.map_name || 'de_inferno',
        date: dateStr,
        opponent: opponentTeam,
        score: `${teamScore} - ${opponentScore}`,
        result,
        rating,
        adr,
        kills,
        deaths,
        ttd,
        ttk,
        fsp,
      });

      telemetry.push({
        matchId: row.match_id,
        mapName: cleanMap,
        opponentTeam,
        opponentSlug,
        opponentLogoUrl: `/teams/${opponentSlug}.svg`,
        date: dateStr,
        teamScore,
        opponentScore,
        score: `${teamScore} - ${opponentScore}`,
        result,
        metrics,
      });
    }

    const n = rows.length;
    const avgRating = Number((totalRating / n).toFixed(2));
    const avgAdr = Number((totalAdr / n).toFixed(1));
    const avgKd = totalDeaths > 0 ? Number((totalKills / totalDeaths).toFixed(2)) : totalKills;
    const avgKpr = Number((totalKills / (n * 23)).toFixed(2));
    const avgDpr = Number((totalDeaths / (n * 23)).toFixed(2));
    const avgKast = Number((totalKast / n).toFixed(1));

    const avgTtd = ttdSamples.length > 0 ? Math.round(ttdSamples.reduce((a, b) => a + b, 0) / ttdSamples.length) : null;
    const avgTtk = ttkSamples.length > 0 ? Math.round(ttkSamples.reduce((a, b) => a + b, 0) / ttkSamples.length) : null;
    const avgFsp = fspSamples.length > 0 ? Number((fspSamples.reduce((a, b) => a + b, 0) / fspSamples.length).toFixed(2)) : null;

    return {
      steamId: latest.player_steamid,
      nickname: latest.nickname,
      team: latest.team,
      matchesCount: n,
      currentRating: avgRating,
      adr: avgAdr,
      kd: avgKd,
      kpr: avgKpr,
      dpr: avgDpr,
      kastPct: avgKast,
      ttd: avgTtd,
      ttk: avgTtk,
      fsp: avgFsp,
      history,
      telemetry,
    };
  } catch (err) {
    console.error('[getPlayerPerformance] Database error, returning fallback:', err);
    return null;
  }
}
