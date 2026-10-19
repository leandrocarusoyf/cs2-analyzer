import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import type { ReplayDataPackage } from '../types/replay.ts';
import {
  buildReplayStoragePath,
  type InsertMatchRecord,
} from './demo-processor.ts';

/**
 * Salva o pacote de telemetria localmente compactado em Gzip (level: 9).
 * Devolve o caminho do arquivo gravado.
 */
export async function saveReplayPackageLocally(
  packageData: ReplayDataPackage,
  destPath: string,
): Promise<string> {
  if (typeof destPath !== 'string' || destPath.trim() === '') {
    throw new Error('Caminho de destino inválido para o replay.');
  }

  await mkdir(path.dirname(destPath), { recursive: true });
  const rawJson = JSON.stringify(packageData);
  const compressed = gzipSync(Buffer.from(rawJson, 'utf8'), { level: 9 });
  await writeFile(destPath, compressed);
  return destPath;
}

/**
 * Insere o registo da partida no banco de dados PostgreSQL local
 * e devolve o id gerado.
 */
export async function persistMatchMetadata(
  dbClient: { query: Function },
  matchRecord: InsertMatchRecord | any,
): Promise<string> {
  if (!dbClient || typeof dbClient.query !== 'function') {
    throw new Error('Cliente PostgreSQL inválido: método query ausente.');
  }

  const sql = `
    INSERT INTO matches (
      match_date, team1, team2, format, score_t1, score_t2, winner, replay_path
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id;
  `;

  const winner =
    (matchRecord.score_ct ?? 0) > (matchRecord.score_t ?? 0)
      ? matchRecord.team_ct_name
      : (matchRecord.score_t ?? 0) > (matchRecord.score_ct ?? 0)
      ? matchRecord.team_t_name
      : null;

  const values = [
    matchRecord.played_at || new Date().toISOString(),
    matchRecord.team_ct_name || matchRecord.team1 || 'Team1',
    matchRecord.team_t_name || matchRecord.team2 || 'Team2',
    matchRecord.format || 'BO1',
    matchRecord.score_ct ?? matchRecord.score_t1 ?? 0,
    matchRecord.score_t ?? matchRecord.score_t2 ?? 0,
    matchRecord.winner !== undefined ? matchRecord.winner : winner,
    matchRecord.replay_storage_path ?? matchRecord.replay_path ?? null,
  ];

  const result = await dbClient.query(sql, values);
  if (!result?.rows?.[0]?.id) {
    throw new Error('Inserção em matches não devolveu um id.');
  }

  return result.rows[0].id;
}
