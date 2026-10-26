import { query } from '../db.ts';
import type {
  RecentMatchTelemetry,
  PlayerAdvancedStatsRow,
  MatchDuelRow,
  MatchInspectFilters,
  PlayerMatchInspectPayload,
} from '../../types/stats.ts';
import type { LeaderboardPlayer, PlayerMapStats } from '../../data/leaderboards-data.ts';

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
  metrics_json?: Record<string, any> | null;
}

export interface MatchMapDetail {
  id: string;
  map_name: string;
  rounds_t1: number;
  rounds_t2: number;
  duration?: number;
  replay_path?: string | null;
  map_number?: number;
  pick_type?: string | null;
  pick_team?: string | null;
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
  event_name?: string | null;
  bans?: Array<{ team: string; maps: string[] }> | null;
  maps?: MatchMapDetail[];
  players: DbPlayerStat[];
}

export interface PlayerPerformanceResult {
  steamId: string;
  nickname: string;
  team: string;
  matchesCount: number;
  totalRounds?: number;
  currentRating: number;
  adr: number;
  kd: number;
  kpr: number;
  dpr: number;
  kastPct: number;
  ttd: number | null;
  ttk: number | null;
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
  }>;
  telemetry: RecentMatchTelemetry[];
  roles?: {
    ct?: string | null;
    t?: string | null;
    primary?: string | null;
  };
  ctRoles?: any[];
  tRoles?: any[];
  advancedStats?: PlayerAdvancedStatsRow | null;
}

function normalizeTeamSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

function formatDate(dateVal: Date | string | undefined | null): string {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';
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
        m.event_name,
        m.bans
      FROM matches m
      ORDER BY m.match_date DESC
      LIMIT $1;
    `;
    const matchRes = await query(matchesSql, [limit]);
    const matchRows = matchRes?.rows ?? [];
    if (matchRows.length === 0) {
      return [];
    }

    const matchIds = matchRows.map((r) => r.id);

    // Buscar todos os mapas das partidas encontradas
    const mapsSql = `
      SELECT 
        id,
        match_id,
        map_name,
        rounds_t1,
        rounds_t2,
        duration,
        pick_type,
        pick_team, replay_path, map_number
      FROM match_maps
      WHERE match_id = ANY($1::uuid[])
      ORDER BY map_number ASC;
    `;
    const mapsRes = await query(mapsSql, [matchIds]);
    const mapsRows = mapsRes?.rows ?? [];

    const mapsByMatch = new Map<string, MatchMapDetail[]>();
    for (const mm of mapsRows) {
      const list = mapsByMatch.get(mm.match_id) || [];
      list.push({
        replay_path: mm.replay_path,
        map_number: mm.map_number,
        id: mm.id,
        map_name: mm.map_name,
        rounds_t1: Number(mm.rounds_t1 || 0),
        rounds_t2: Number(mm.rounds_t2 || 0),
        duration: mm.duration ? Number(mm.duration) : undefined,
        pick_type: mm.pick_type || 'PICK',
        pick_team: mm.pick_team || null,
      });
      mapsByMatch.set(mm.match_id, list);
    }

    // Buscar estatísticas dos jogadores
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
        metrics_json: parsedMetrics,
      });
      playersByMatch.set(p.match_id, list);
    }

    return matchRows.map((row) => {
      const matchMaps = mapsByMatch.get(row.id) || [];
      const primaryMap = matchMaps[0];
      const parsedBans = typeof row.bans === 'string'
        ? (() => {
            try { return JSON.parse(row.bans); } catch { return null; }
          })()
        : row.bans || null;

      const totalRoundsCount = matchMaps.length > 0
        ? matchMaps.reduce((acc, mm) => acc + (mm.rounds_t1 + mm.rounds_t2), 0)
        : Number(row.score_t1) + Number(row.score_t2);

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
        event_name: row.event_name || 'Counter-Strike 2 Match',
        bans: parsedBans,
        maps: matchMaps,
        map_id: primaryMap?.id || null,
        map_name: primaryMap?.map_name || null,
        rounds_t1: primaryMap?.rounds_t1,
        rounds_t2: primaryMap?.rounds_t2,
        duration: primaryMap?.duration,
        rounds_count: totalRoundsCount,
        players: playersByMatch.get(row.id) || [],
      };
    });
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
        m.event_name,
        m.bans
      FROM matches m
      WHERE m.id::text = $1 OR m.demo_hash = $1 OR m.id=(SELECT match_id FROM match_maps WHERE id::text=$1)
      LIMIT 1;
    `;
    const matchRes = await query(matchSql, [id]);
    const matchRows = matchRes?.rows ?? [];
    if (matchRows.length === 0) {
      return null;
    }

    const row = matchRows[0];
    const matchUuid = row.id;

    // Buscar mapas da partida
    const mapsSql = `
      SELECT 
        id,
        match_id,
        map_name,
        rounds_t1,
        rounds_t2,
        duration,
        pick_type,
        pick_team, replay_path, map_number
      FROM match_maps
      WHERE match_id = $1::uuid
      ORDER BY map_number ASC;
    `;
    const mapsRes = await query(mapsSql, [matchUuid]);
    const mapsRows = mapsRes?.rows ?? [];
    const maps: MatchMapDetail[] = mapsRows.map((mm) => ({
      replay_path: mm.replay_path,
      map_number: mm.map_number,
      id: mm.id,
      map_name: mm.map_name,
      rounds_t1: Number(mm.rounds_t1 || 0),
      rounds_t2: Number(mm.rounds_t2 || 0),
      duration: mm.duration ? Number(mm.duration) : undefined,
      pick_type: mm.pick_type || 'PICK',
      pick_team: mm.pick_team || null,
    }));

    const primaryMap = maps.find(m=>m.id===id) || maps[0];

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
        metrics_json: parsedMetrics,
      };
    });

    const parsedBans = typeof row.bans === 'string'
      ? (() => {
          try { return JSON.parse(row.bans); } catch { return null; }
        })()
      : row.bans || null;

    const totalRoundsCount = maps.length > 0
      ? maps.reduce((acc, mm) => acc + (mm.rounds_t1 + mm.rounds_t2), 0)
      : Number(row.score_t1) + Number(row.score_t2);

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
      event_name: row.event_name || 'Counter-Strike 2 Match',
      bans: parsedBans,
      maps,
      map_id: primaryMap?.id || null,
      map_name: primaryMap?.map_name || null,
      rounds_t1: primaryMap?.rounds_t1,
      rounds_t2: primaryMap?.rounds_t2,
      duration: primaryMap?.duration,
      rounds_count: totalRoundsCount,
      players: maps.some(m=>m.id===id) ? players.filter(p=>p.map_id===id) : players,
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
        ps.metrics_json,
        m.match_date,
        m.team1,
        m.team2,
        m.score_t1,
        m.score_t2,
        m.winner,
        mm.map_name, mm.rounds_t1, mm.rounds_t2, mm.id AS replay_id
      FROM player_stats ps
      JOIN matches m ON ps.match_id = m.id
      LEFT JOIN match_maps mm ON ps.map_id = mm.id
      WHERE ps.player_steamid = $1 OR LOWER(ps.nickname) = LOWER($1)
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
    let totalRounds = 0;
    let totalKills = 0;
    let totalDeaths = 0;
    let totalKast = 0;
    let ttdSamples: number[] = [];
    let ttkSamples: number[] = [];

    const history: PlayerPerformanceResult['history'] = [];
    const telemetry: RecentMatchTelemetry[] = [];

    for (const row of rows) {
      const rating = row.rating !== null && row.rating !== undefined ? Number(row.rating) : 0;
      const adr = row.adr !== null && row.adr !== undefined ? Number(row.adr) : 0;
      const kills = Number(row.kills || 0);
      const deaths = Number(row.deaths || 0);
      const kast = row.kast !== null && row.kast !== undefined ? Number(row.kast) : 0;
      const ttd = row.ttd !== null && row.ttd !== undefined ? Number(row.ttd) : null;
      const ttk = row.ttk !== null && row.ttk !== undefined ? Number(row.ttk) : null;

      totalRounds += Number(row.rounds_t1 || 0) + Number(row.rounds_t2 || 0);
      totalRating += rating;
      totalAdr += adr;
      totalKills += kills;
      totalDeaths += deaths;
      totalKast += kast;
      if (ttd !== null) ttdSamples.push(ttd);
      if (ttk !== null) ttkSamples.push(ttk);

      const isTeam1 = row.team === row.team1;
      const teamScore = isTeam1 ? Number(row.rounds_t1 ?? row.score_t1 ?? 0) : Number(row.rounds_t2 ?? row.score_t2 ?? 0);
      const opponentScore = isTeam1 ? Number(row.rounds_t2 ?? row.score_t2 ?? 0) : Number(row.rounds_t1 ?? row.score_t1 ?? 0);
      const opponentTeam = isTeam1 ? (row.team2 ?? 'Opponent') : (row.team1 ?? 'Opponent');
      const opponentSlug = normalizeTeamSlug(opponentTeam);
      const isWinner = teamScore > opponentScore;
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
          overall: Number(safeKpr?.overall ?? Number((kills / Math.max(1, Number(row.rounds_t1)+Number(row.rounds_t2))).toFixed(2))),
          ct: Number(safeKpr?.ct ?? Number((kills / Math.max(1, Number(row.rounds_t1)+Number(row.rounds_t2))).toFixed(2))),
          t: Number(safeKpr?.t ?? Number((kills / Math.max(1, Number(row.rounds_t1)+Number(row.rounds_t2))).toFixed(2))),
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
        matchId: row.replay_id || row.match_id,
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
      });

      telemetry.push({
        matchId: row.replay_id || row.match_id,
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
    const avgKpr = Number((totalKills / Math.max(1, totalRounds)).toFixed(2));
    const avgDpr = Number((totalDeaths / Math.max(1, totalRounds)).toFixed(2));
    const avgKast = Number((totalKast / n).toFixed(1));

    const avgTtd = ttdSamples.length > 0 ? Math.round(ttdSamples.reduce((a, b) => a + b, 0) / ttdSamples.length) : null;
    const avgTtk = ttkSamples.length > 0 ? Math.round(ttkSamples.reduce((a, b) => a + b, 0) / ttkSamples.length) : null;

    const ctRoles: Array<{
      id: string;
      side: 'ct' | 't';
      role: string;
      map: string;
      hltv: number;
      adr: number;
      kd: number;
      kpr: number;
      rounds: number;
    }> = [];

    const tRoles: Array<{
      id: string;
      side: 'ct' | 't';
      role: string;
      map: string;
      hltv: number;
      adr: number;
      kd: number;
      kpr: number;
      rounds: number;
    }> = [];

    for (const row of rows) {
      const cleanMap = (row.map_name || 'inferno').replace('de_', '').replace(/^./, (c: string) => c.toUpperCase());
      const parsedMetrics =
        typeof row.metrics_json === 'string'
          ? (() => {
              try {
                return JSON.parse(row.metrics_json);
              } catch {
                return {};
              }
            })()
          : row.metrics_json || {};

      const ctRoleName = parsedMetrics?.roles?.ct || `${cleanMap} B Anchor`;
      const tRoleName = parsedMetrics?.roles?.t || `${cleanMap} Mid Lurker`;
      const ctRounds = Number(row.rounds_t1 || Math.round(totalRounds / 2) || 12);
      const tRounds = Number(row.rounds_t2 || Math.round(totalRounds / 2) || 12);

      ctRoles.push({
        id: `ct-${row.id || row.match_id}-${row.map_id || cleanMap}`,
        side: 'ct',
        role: String(ctRoleName).replace(/^de_\w+\s+/i, '').replace(/^[A-Za-z0-9]+\s+/, ''),
        map: cleanMap,
        hltv: Number(parsedMetrics?.hltv?.ct ?? row.rating ?? 1.0),
        adr: Number(parsedMetrics?.adr?.ct ?? row.adr ?? 75.0),
        kd: Number(parsedMetrics?.kd?.ct ?? (row.deaths > 0 ? Number((row.kills / row.deaths).toFixed(2)) : 1.0)),
        kpr: Number(parsedMetrics?.kpr?.ct ?? Number((row.kills / Math.max(1, ctRounds)).toFixed(2))),
        rounds: ctRounds,
      });

      tRoles.push({
        id: `t-${row.id || row.match_id}-${row.map_id || cleanMap}`,
        side: 't',
        role: String(tRoleName).replace(/^de_\w+\s+/i, '').replace(/^[A-Za-z0-9]+\s+/, ''),
        map: cleanMap,
        hltv: Number(parsedMetrics?.hltv?.t ?? row.rating ?? 1.0),
        adr: Number(parsedMetrics?.adr?.t ?? row.adr ?? 75.0),
        kd: Number(parsedMetrics?.kd?.t ?? (row.deaths > 0 ? Number((row.kills / row.deaths).toFixed(2)) : 1.0)),
        kpr: Number(parsedMetrics?.kpr?.t ?? Number((row.kills / Math.max(1, tRounds)).toFixed(2))),
        rounds: tRounds,
      });
    }

    let advancedStats: PlayerAdvancedStatsRow | null = null;
    try {
      const advRes = await query(
        `SELECT * FROM player_advanced_stats WHERE steamid = $1 ORDER BY id DESC LIMIT 1`,
        [latest.player_steamid],
      );
      if (advRes?.rows?.length > 0) {
        const adv = advRes.rows[0];
        advancedStats = {
          match_id: adv.match_id,
          steamid: adv.steamid,
          hltv_rating: adv.hltv_rating != null ? Number(adv.hltv_rating) : null,
          adr: adv.adr != null ? Number(adv.adr) : null,
          kast: adv.kast != null ? Number(adv.kast) : null,
          impact: adv.impact != null ? Number(adv.impact) : null,
          hs_percent: adv.hs_percent != null ? Number(adv.hs_percent) : null,
          hit_head_pct: adv.hit_head_pct != null ? Number(adv.hit_head_pct) : null,
          hit_chest_pct: adv.hit_chest_pct != null ? Number(adv.hit_chest_pct) : null,
          hit_stomach_pct: adv.hit_stomach_pct != null ? Number(adv.hit_stomach_pct) : null,
          hit_limbs_pct: adv.hit_limbs_pct != null ? Number(adv.hit_limbs_pct) : null,
          reaction_time_ms: adv.reaction_time_ms != null ? Number(adv.reaction_time_ms) : null,
          headlock_offset: adv.headlock_offset != null ? Number(adv.headlock_offset) : null,
          first_5_bullets_pct: adv.first_5_bullets_pct != null ? Number(adv.first_5_bullets_pct) : null,
          prefire_pct: adv.prefire_pct != null ? Number(adv.prefire_pct) : null,
          score_opening: adv.score_opening != null ? Number(adv.score_opening) : null,
          score_trade: adv.score_trade != null ? Number(adv.score_trade) : null,
          score_utility: adv.score_utility != null ? Number(adv.score_utility) : null,
          score_flash: adv.score_flash != null ? Number(adv.score_flash) : null,
          score_clutch: adv.score_clutch != null ? Number(adv.score_clutch) : null,
          he_damage: adv.he_damage != null ? Number(adv.he_damage) : null,
        };
      }
    } catch {
      // non-fatal
    }

    const latestParsed = typeof latest.metrics_json === 'string'
      ? (() => { try { return JSON.parse(latest.metrics_json); } catch { return {}; } })()
      : (latest.metrics_json || {});
    const latestCt = latestParsed?.roles?.ct || null;
    const latestT = latestParsed?.roles?.t || null;

    const KNOWN_ROLES: Record<string, string> = {
      fallen: 'Sniper / IGL',
      jimpphat: 'Anchor / Lurker',
      kscerato: 'Rifler / Anchor',
      xantares: 'Entry Fragger',
      woxic: 'Sniper / AWPer',
      wicadia: 'Rifler / Entry',
      kyxsan: 'IGL / Support',
      molodoy: 'Anchor / Rifler',
      yekindar: 'Entry / Space Creator',
      yuurih: 'Rifler / Trader',
    };
    const primaryRole =
      KNOWN_ROLES[latest.nickname.toLowerCase()] ||
      (latestCt && String(latestCt).toLowerCase().includes('anchor')
        ? 'Anchor'
        : latestT && String(latestT).toLowerCase().includes('lurk')
          ? 'Lurker'
          : null);

    return {
      steamId: latest.player_steamid,
      nickname: latest.nickname,
      team: latest.team,
      matchesCount: n,
      totalRounds,
      currentRating: avgRating,
      adr: avgAdr,
      kd: avgKd,
      kpr: avgKpr,
      dpr: avgDpr,
      kastPct: avgKast,
      ttd: avgTtd,
      ttk: avgTtk,
      history,
      telemetry,
      roles: {
        ct: latestCt,
        t: latestT,
        primary: primaryRole,
      },
      ctRoles,
      tRoles,
      advancedStats,
    };
  } catch (err) {
    console.error('[getPlayerPerformance] Database error, returning fallback:', err);
    return null;
  }
}

/**
 * Busca e agrega dados reais do Supabase/PostgreSQL para montar a tabela de Leaderboards.
 * Se o jogador possuir dados de 1 partida, exibe os dados dela.
 * Se houver múltiplas partidas, calcula a média ponderada com base no total de rounds.
 */
export async function getLeaderboardPlayersFromDb(): Promise<LeaderboardPlayer[]> {
  try {
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
        ps.assists,
        ps.metrics_json,
        COALESCE(mm.map_name, 'de_inferno') AS map_name,
        COALESCE(mm.rounds_t1 + mm.rounds_t2, m.score_t1 + m.score_t2, 23) AS rounds
      FROM player_stats ps
      JOIN matches m ON ps.match_id = m.id
      LEFT JOIN match_maps mm ON ps.map_id = mm.id
      ORDER BY ps.rating DESC;
    `;
    const res = await query(sql);
    const rows = res?.rows ?? [];
    if (rows.length === 0) return [];

    const byPlayer = new Map<string, any[]>();
    for (const r of rows) {
      const list = byPlayer.get(r.player_steamid) || [];
      list.push(r);
      byPlayer.set(r.player_steamid, list);
    }

    const result: LeaderboardPlayer[] = [];

    for (const [steamId, playerRows] of byPlayer.entries()) {
      const latest = playerRows[0];
      const nickname = latest.nickname;
      const team = latest.team;

      let totalRounds = 0;
      let totalRatingWeight = 0;
      let totalAdrWeight = 0;
      let totalKastWeight = 0;
      let totalUdrWeight = 0;
      let totalKills = 0;
      let totalDeaths = 0;

      const mapStats: Record<string, PlayerMapStats> = {};

      for (const row of playerRows) {
        const rounds = Number(row.rounds) || 23;
        const rating = Number(row.rating) || 0;
        const adr = Number(row.adr) || 0;
        const kast = Number(row.kast) || 0;
        const kills = Number(row.kills) || 0;
        const deaths = Number(row.deaths) || 0;

        const metrics = typeof row.metrics_json === 'string'
          ? (() => { try { return JSON.parse(row.metrics_json); } catch { return {}; } })()
          : (row.metrics_json || {});
        const udr = Number(metrics?.udr?.overall ?? metrics?.general?.udr ?? 0);

        totalRounds += rounds;
        totalRatingWeight += rating * rounds;
        totalAdrWeight += adr * rounds;
        totalKastWeight += kast * rounds;
        totalUdrWeight += udr * rounds;
        totalKills += kills;
        totalDeaths += deaths;

        // Map name clean (ex: de_inferno -> Inferno, de_dust2 -> Dust II)
        const rawMap = (row.map_name || 'de_inferno').toLowerCase().replace('de_', '');
        const mapKey = rawMap === 'dust2'
          ? 'Dust II'
          : rawMap.charAt(0).toUpperCase() + rawMap.slice(1);

        const mapKd = deaths > 0 ? Number((kills / deaths).toFixed(2)) : kills;
        const mapKpr = Number((kills / rounds).toFixed(2));
        const mapDpr = Number((deaths / rounds).toFixed(2));
        const mapFar = Number((kills / (rounds * 4.5)).toFixed(2));

        mapStats[mapKey] = {
          hltv: rating,
          adr,
          kd: mapKd,
          kpr: mapKpr,
          dpr: mapDpr,
          kast,
          udr,
          far: mapFar,
          rounds,
        };
      }

      const count = playerRows.length;
      // Regra: se houver 1 partida, exibe dados dela; se múltiplas, média ponderada por rounds
      const weightedHltv = count === 1 ? Number(latest.rating) : Number((totalRatingWeight / totalRounds).toFixed(2));
      const weightedAdr = count === 1 ? Number(latest.adr) : Number((totalAdrWeight / totalRounds).toFixed(1));
      const weightedKast = count === 1 ? Number(latest.kast) : Number((totalKastWeight / totalRounds).toFixed(1));
      const weightedUdr = count === 1
        ? Number((typeof latest.metrics_json === 'object' ? latest.metrics_json?.udr?.overall : 0) || 0)
        : Number((totalUdrWeight / totalRounds).toFixed(1));
      const overallKd = totalDeaths > 0 ? Number((totalKills / totalDeaths).toFixed(2)) : totalKills;
      const overallKpr = Number((totalKills / totalRounds).toFixed(2));
      const overallDpr = Number((totalDeaths / totalRounds).toFixed(2));
      const overallFar = Number((totalKills / (totalRounds * 4.5)).toFixed(2));

      // Extração de Roles
      const parsedLatestMetrics = typeof latest.metrics_json === 'string'
        ? (() => { try { return JSON.parse(latest.metrics_json); } catch { return {}; } })()
        : (latest.metrics_json || {});
      const tRole = parsedLatestMetrics?.roles?.t || 'Sem classificação';
      const ctRole = parsedLatestMetrics?.roles?.ct || 'Sem classificação';
      let roleCategory: 'AWP' | 'Entry' | 'Rifler' | 'Anchor' | 'Support' | 'Lurk' = 'Rifler';
      if (tRole.includes('Lurk')) roleCategory = 'Lurk';
      else if (ctRole.includes('Anchor')) roleCategory = 'Anchor';

      result.push({
        id: steamId,
        name: nickname,
        team,
        tRole,
        ctRole,
        roleCategory,
        overall: {
          hltv: weightedHltv,
          adr: weightedAdr,
          kd: overallKd,
          kpr: overallKpr,
          dpr: overallDpr,
          kast: weightedKast,
          udr: weightedUdr,
          far: overallFar,
          rounds: totalRounds,
        },
        mapStats,
      });
    }

    result.sort((a, b) => b.overall.hltv - a.overall.hltv);
    return result;
  } catch (err) {
    console.error('[getLeaderboardPlayersFromDb] Error:', err);
    return [];
  }
}

/**
 * Retorna todos os atletas cadastrados no banco para alimentar dinamicamente o seletor (Dropdown).
 */
export async function getAllRegisteredPlayers(): Promise<Array<{ steamId: string; nickname: string; team: string }>> {
  try {
    const sql = `
      SELECT DISTINCT player_steamid AS "steamId", nickname, team
      FROM player_stats
      ORDER BY nickname ASC;
    `;
    const res = await query(sql);
    return res?.rows ?? [];
  } catch (err) {
    console.error('[getAllRegisteredPlayers] Error:', err);
    return [];
  }
}


function toNullableNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

/**
 * Consulta consolidada de inspeção avançada de jogador por partida:
 * retorna player_advanced_stats e a lista filtrável de match_duels.
 */
export async function getPlayerMatchInspect(
  steamid: string,
  matchId: string,
  filters: MatchInspectFilters = {},
): Promise<PlayerMatchInspectPayload | null> {
  const cleanSteamId = String(steamid ?? '').trim();
  const cleanMatchId = String(matchId ?? '').trim();
  if (!cleanSteamId || !cleanMatchId) {
    return null;
  }

  const statsSql = `
    SELECT
      pas.match_id,
      pas.steamid,
      pas.hltv_rating,
      pas.adr,
      pas.kast,
      pas.impact,
      pas.hs_percent,
      pas.hit_head_pct,
      pas.hit_chest_pct,
      pas.hit_stomach_pct,
      pas.hit_limbs_pct,
      pas.reaction_time_ms,
      pas.headlock_offset,
      pas.first_5_bullets_pct,
      pas.prefire_pct,
      pas.score_opening,
      pas.score_trade,
      pas.score_utility,
      pas.score_flash,
      pas.score_clutch,
      pas.he_damage
    FROM player_advanced_stats pas
    WHERE (
      pas.match_id::text = $1
      OR pas.match_id = (SELECT mm.match_id FROM match_maps mm WHERE mm.id::text = $1 LIMIT 1)
    )
    AND (
      pas.steamid = $2
      OR pas.steamid = (
        SELECT ps.player_steamid
        FROM player_stats ps
        WHERE LOWER(ps.nickname) = LOWER($2)
        LIMIT 1
      )
    )
    LIMIT 1;
  `;

  const statsRes = await query(statsSql, [cleanMatchId, cleanSteamId]);
  const statsRow = statsRes?.rows?.[0];
  if (!statsRow) {
    return null;
  }

  const resolvedMatchId = String(statsRow.match_id);
  const resolvedSteamId = String(statsRow.steamid);

  const advancedStats: PlayerAdvancedStatsRow = {
    match_id: resolvedMatchId,
    steamid: resolvedSteamId,
    hltv_rating: toNullableNumber(statsRow.hltv_rating),
    adr: toNullableNumber(statsRow.adr),
    kast: toNullableNumber(statsRow.kast),
    impact: toNullableNumber(statsRow.impact),
    hs_percent: toNullableNumber(statsRow.hs_percent),
    hit_head_pct: toNullableNumber(statsRow.hit_head_pct),
    hit_chest_pct: toNullableNumber(statsRow.hit_chest_pct),
    hit_stomach_pct: toNullableNumber(statsRow.hit_stomach_pct),
    hit_limbs_pct: toNullableNumber(statsRow.hit_limbs_pct),
    reaction_time_ms: toNullableNumber(statsRow.reaction_time_ms),
    headlock_offset: toNullableNumber(statsRow.headlock_offset),
    first_5_bullets_pct: toNullableNumber(statsRow.first_5_bullets_pct),
    prefire_pct: toNullableNumber(statsRow.prefire_pct),
    score_opening: toNullableNumber(statsRow.score_opening),
    score_trade: toNullableNumber(statsRow.score_trade),
    score_utility: toNullableNumber(statsRow.score_utility),
    score_flash: toNullableNumber(statsRow.score_flash),
    score_clutch: toNullableNumber(statsRow.score_clutch),
    he_damage: toNullableNumber(statsRow.he_damage) ?? 0,
  };

  const conditions: string[] = ['match_id::text = $1'];
  const params: unknown[] = [resolvedMatchId];

  if (filters.outcome === 'win') {
    params.push(resolvedSteamId);
    conditions.push(`winner_steamid = $${params.length}`);
  } else if (filters.outcome === 'loss') {
    params.push(resolvedSteamId);
    conditions.push(`loser_steamid = $${params.length}`);
  } else {
    params.push(resolvedSteamId);
    conditions.push(`(winner_steamid = $${params.length} OR loser_steamid = $${params.length})`);
  }

  if (filters.roundNumber !== undefined && filters.roundNumber !== null && Number.isFinite(filters.roundNumber)) {
    params.push(Number(filters.roundNumber));
    conditions.push(`round_number = $${params.length}`);
  }

  if (typeof filters.isOpening === 'boolean') {
    params.push(filters.isOpening);
    conditions.push(`is_opening = $${params.length}`);
  }

  if (typeof filters.isTrade === 'boolean') {
    params.push(filters.isTrade);
    conditions.push(`is_trade = $${params.length}`);
  }

  if (typeof filters.isClutch === 'boolean') {
    params.push(filters.isClutch);
    conditions.push(`is_clutch = $${params.length}`);
  }

  if (filters.mapZone) {
    params.push(filters.mapZone.trim());
    conditions.push(`LOWER(map_zone) = LOWER($${params.length})`);
  }

  if (filters.weapon) {
    params.push(filters.weapon.trim());
    conditions.push(`(LOWER(winner_weapon) = LOWER($${params.length}) OR LOWER(loser_weapon) = LOWER($${params.length}))`);
  }

  if (filters.duelTag) {
    params.push(`%${filters.duelTag.trim()}%`);
    conditions.push(`duel_tag ILIKE $${params.length}`);
  }

  const duelsSql = `
    SELECT
      id,
      match_id,
      round_number,
      round_time,
      winner_steamid,
      loser_steamid,
      winner_weapon,
      loser_weapon,
      winner_hp_remaining,
      map_zone,
      is_opening,
      is_trade,
      is_clutch,
      duel_tag
    FROM match_duels
    WHERE ${conditions.join(' AND ')}
    ORDER BY round_number ASC, round_time ASC NULLS LAST, id ASC;
  `;

  const duelsRes = await query(duelsSql, params);
  const rawDuels = duelsRes?.rows ?? [];

  let mappedDuels: MatchDuelRow[] = rawDuels.map((d: Record<string, unknown>) => ({
    id: String(d.id ?? ''),
    match_id: String(d.match_id ?? resolvedMatchId),
    round_number: Number(d.round_number ?? 1),
    round_time: d.round_time !== null && d.round_time !== undefined ? String(d.round_time) : null,
    winner_steamid: String(d.winner_steamid ?? ''),
    loser_steamid: String(d.loser_steamid ?? ''),
    winner_weapon: d.winner_weapon !== null && d.winner_weapon !== undefined ? String(d.winner_weapon) : null,
    loser_weapon: d.loser_weapon !== null && d.loser_weapon !== undefined ? String(d.loser_weapon) : null,
    winner_hp_remaining: toNullableNumber(d.winner_hp_remaining),
    map_zone: d.map_zone !== null && d.map_zone !== undefined ? String(d.map_zone) : null,
    is_opening: Boolean(d.is_opening),
    is_trade: Boolean(d.is_trade),
    is_clutch: Boolean(d.is_clutch),
    duel_tag: d.duel_tag !== null && d.duel_tag !== undefined ? String(d.duel_tag) : null,
  }));

  mappedDuels = mappedDuels.filter((d) => {
    if (filters.outcome === 'win' && d.winner_steamid !== resolvedSteamId) return false;
    if (filters.outcome === 'loss' && d.loser_steamid !== resolvedSteamId) return false;
    if (
      filters.outcome !== 'win' &&
      filters.outcome !== 'loss' &&
      d.winner_steamid !== resolvedSteamId &&
      d.loser_steamid !== resolvedSteamId
    ) {
      return false;
    }
    if (
      filters.roundNumber !== undefined &&
      filters.roundNumber !== null &&
      Number.isFinite(filters.roundNumber) &&
      d.round_number !== Number(filters.roundNumber)
    ) {
      return false;
    }
    if (typeof filters.isOpening === 'boolean' && d.is_opening !== filters.isOpening) return false;
    if (typeof filters.isTrade === 'boolean' && d.is_trade !== filters.isTrade) return false;
    if (typeof filters.isClutch === 'boolean' && d.is_clutch !== filters.isClutch) return false;
    if (filters.mapZone && (d.map_zone ?? '').toLowerCase() !== filters.mapZone.trim().toLowerCase()) {
      return false;
    }
    if (filters.weapon) {
      const w = filters.weapon.trim().toLowerCase();
      if ((d.winner_weapon ?? '').toLowerCase() !== w && (d.loser_weapon ?? '').toLowerCase() !== w) {
        return false;
      }
    }
    if (filters.duelTag) {
      const t = filters.duelTag.trim().toLowerCase();
      if (!(d.duel_tag ?? '').toLowerCase().includes(t)) return false;
    }
    return true;
  });

  return {
    matchId: resolvedMatchId,
    steamid: resolvedSteamId,
    player_advanced_stats: advancedStats,
    advancedStats,
    match_duels: mappedDuels,
    duels: mappedDuels,
  };
}
