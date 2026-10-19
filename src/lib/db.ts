import pg from 'pg';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;

export const DEFAULT_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://cs2admin:cs2secret@localhost:5432/cs2_analytics';

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: pg.Pool | undefined;
}

const globalForDb = globalThis as unknown as {
  __dbPool?: pg.Pool;
};

export const pool: pg.Pool =
  globalForDb.__dbPool ??
  new Pool({
    connectionString: DEFAULT_DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__dbPool = pool;
}

export function getDbPool(connectionString = DEFAULT_DATABASE_URL): pg.Pool {
  if (connectionString === DEFAULT_DATABASE_URL) {
    return pool;
  }
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
  });
}

export async function closeDbPool(): Promise<void> {
  if (globalForDb.__dbPool) {
    await globalForDb.__dbPool.end();
    globalForDb.__dbPool = undefined;
  }
}

export async function query<R extends pg.QueryResultRow = any>(
  text: string,
  params?: any[],
): Promise<pg.QueryResult<R>> {
  return pool.query<R>(text, params);
}

export interface MatchRecordInput {
  match_date: string | Date;
  team1: string;
  team2: string;
  format?: string;
  score_t1: number;
  score_t2: number;
  winner?: string | null;
  replay_path?: string | null;
}

export interface MatchMapInput {
  match_id: string;
  map_name: string;
  rounds_t1: number;
  rounds_t2: number;
  duration?: number;
}

export interface PlayerStatsInput {
  match_id: string;
  map_id?: string | null;
  player_steamid: string;
  nickname: string;
  team: string;
  rating?: number | null;
  adr?: number | null;
  kast?: number | null;
  kills?: number;
  deaths?: number;
  assists?: number;
  ttd?: number | null;
  ttk?: number | null;
  fsp?: number | null;
}

export async function ensureDatabaseSchema(
  poolOrClient?: pg.Pool | pg.PoolClient | { query: Function },
): Promise<void> {
  const executor = poolOrClient || pool;
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const sqlPath = path.resolve(__dirname, '..', '..', 'scripts', 'init-db.sql');
  const sql = await readFile(sqlPath, 'utf8');
  await executor.query(sql);
}

export async function insertMatch(
  client: { query: Function },
  input: MatchRecordInput,
): Promise<string> {
  const sql = `
    INSERT INTO matches (match_date, team1, team2, format, score_t1, score_t2, winner, replay_path)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id;
  `;
  const values = [
    input.match_date,
    input.team1,
    input.team2,
    input.format || 'BO1',
    input.score_t1,
    input.score_t2,
    input.winner || null,
    input.replay_path || null,
  ];
  const res = await client.query(sql, values);
  return res.rows[0].id;
}

export async function insertMatchMap(
  client: { query: Function },
  input: MatchMapInput,
): Promise<string> {
  const sql = `
    INSERT INTO match_maps (match_id, map_name, rounds_t1, rounds_t2, duration)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id;
  `;
  const values = [
    input.match_id,
    input.map_name,
    input.rounds_t1,
    input.rounds_t2,
    input.duration || 0,
  ];
  const res = await client.query(sql, values);
  return res.rows[0].id;
}

export async function insertPlayerStats(
  client: { query: Function },
  statsList: PlayerStatsInput[],
): Promise<void> {
  for (const stats of statsList) {
    const sql = `
      INSERT INTO player_stats (
        match_id, map_id, player_steamid, nickname, team,
        rating, adr, kast, kills, deaths, assists, ttd, ttk, fsp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);
    `;
    const values = [
      stats.match_id,
      stats.map_id || null,
      stats.player_steamid,
      stats.nickname,
      stats.team,
      stats.rating ?? null,
      stats.adr ?? null,
      stats.kast ?? null,
      stats.kills ?? 0,
      stats.deaths ?? 0,
      stats.assists ?? 0,
      stats.ttd ?? null,
      stats.ttk ?? null,
      stats.fsp ?? null,
    ];
    await client.query(sql, values);
  }
}
