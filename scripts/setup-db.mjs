// Executa o script de inicialização do banco de dados PostgreSQL local (scripts/init-db.sql)
// Uso: node scripts/setup-db.mjs
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_PATH = path.resolve(__dirname, 'init-db.sql');

export const DEFAULT_DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://cs2admin:cs2password@localhost:5432/cs2_analytics';

export async function initDatabase(connectionString = DEFAULT_DATABASE_URL) {
  const pool = new Pool({ connectionString });
  try {
    const sql = await readFile(SQL_PATH, 'utf8');
    await pool.query(sql);
    console.log('[PostgreSQL] Tabelas inicializadas com sucesso em cs2_analytics.');
    return true;
  } finally {
    await pool.end();
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  initDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[PostgreSQL] Erro ao inicializar banco:', err);
      process.exit(1);
    });
}

