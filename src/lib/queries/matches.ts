import { pool, query } from '../db.ts';
import type { RecentMatchTelemetry } from '../../types/stats.ts';
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
  fsp: number | null;
  metrics_json?: Record<string, any> | null;
}

export interface MatchMapDetail {
  id: string;
  map_name: string;
  rounds_t1: number;
  rounds_t2: number;
  duration?: number;
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
        pick_team
      FROM match_maps
      WHERE match_id = ANY($1::uuid[])
      ORDER BY id ASC;
    `;
    const mapsRes = await query(mapsSql, [matchIds]);
    const mapsRows = mapsRes?.rows ?? [];

    const mapsByMatch = new Map<string, MatchMapDetail[]>();
    for (const mm of mapsRows) {
      const list = mapsByMatch.get(mm.match_id) || [];
      list.push({
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
        map_name: primaryMap?.map_name || 'de_inferno',
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
        pick_team
      FROM match_maps
      WHERE match_id = $1::uuid
      ORDER BY id ASC;
    `;
    const mapsRes = await query(mapsSql, [matchUuid]);
    const mapsRows = mapsRes?.rows ?? [];
    const maps: MatchMapDetail[] = mapsRows.map((mm) => ({
      id: mm.id,
      map_name: mm.map_name,
      rounds_t1: Number(mm.rounds_t1 || 0),
      rounds_t2: Number(mm.rounds_t2 || 0),
      duration: mm.duration ? Number(mm.duration) : undefined,
      pick_type: mm.pick_type || 'PICK',
      pick_team: mm.pick_team || null,
    }));

    const primaryMap = maps[0];

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
      map_name: primaryMap?.map_name || 'de_inferno',
      rounds_t1: primaryMap?.rounds_t1,
      rounds_t2: primaryMap?.rounds_t2,
      duration: primaryMap?.duration,
      rounds_count: totalRoundsCount,
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
        const rating = Number(row.rating) || 1.0;
        const adr = Number(row.adr) || 80.0;
        const kast = Number(row.kast) || 70.0;
        const kills = Number(row.kills) || 0;
        const deaths = Number(row.deaths) || 0;

        const metrics = typeof row.metrics_json === 'string'
          ? (() => { try { return JSON.parse(row.metrics_json); } catch { return {}; } })()
          : (row.metrics_json || {});
        const udr = Number(metrics?.udr?.overall ?? metrics?.general?.udr ?? 5.5);

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
        ? Number((typeof latest.metrics_json === 'object' ? latest.metrics_json?.udr?.overall : 5.5) || 5.5)
        : Number((totalUdrWeight / totalRounds).toFixed(1));
      const overallKd = totalDeaths > 0 ? Number((totalKills / totalDeaths).toFixed(2)) : totalKills;
      const overallKpr = Number((totalKills / totalRounds).toFixed(2));
      const overallDpr = Number((totalDeaths / totalRounds).toFixed(2));
      const overallFar = Number((totalKills / (totalRounds * 4.5)).toFixed(2));

      // Extração de Roles
      const parsedLatestMetrics = typeof latest.metrics_json === 'string'
        ? (() => { try { return JSON.parse(latest.metrics_json); } catch { return {}; } })()
        : (latest.metrics_json || {});
      const tRole = parsedLatestMetrics?.roles?.t || (nickname.toLowerCase().includes('lurk') ? 'T Lurk' : overallKpr > 0.8 ? 'T Entry' : 'T Allround');
      const ctRole = parsedLatestMetrics?.roles?.ct || (nickname.toLowerCase().includes('anchor') ? 'CT Anchor' : 'CT Rotation');

      let roleCategory: 'AWP' | 'Entry' | 'Rifler' | 'Anchor' | 'Support' | 'Lurk' = 'Rifler';
      const nickLow = nickname.toLowerCase();
      if (nickLow === 'fallen' || nickLow === 'woxic' || nickLow === 'zywoo' || nickLow === 'm0nesy' || nickLow === 'broky' || nickLow === 'sh1ro') {
        roleCategory = 'AWP';
      } else if (nickLow === 'yekindar' || nickLow === 'xantares' || tRole.includes('Entry') || overallKpr >= 0.82) {
        roleCategory = 'Entry';
      } else if (tRole.includes('Lurk')) {
        roleCategory = 'Lurk';
      } else if (ctRole.includes('Anchor')) {
        roleCategory = 'Anchor';
      } else if (tRole.includes('Support')) {
        roleCategory = 'Support';
      }

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

