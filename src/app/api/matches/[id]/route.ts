import { readFile, rename, unlink, readdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pool } from '../../../../lib/db.ts';
import { getMatchById } from '../../../../lib/queries/matches.ts';
import { resolveReplayFile } from '../../../../lib/replay/files.ts';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const match = await getMatchById(id);
    return match ? Response.json({ match }) : Response.json({ error: 'Partida não encontrada' }, { status: 404 });
  } catch {
    return Response.json({ error: 'Não foi possível consultar a partida' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) return Response.json({ error: 'ID inválido' }, { status: 400 });
  const client = await pool.connect();
  const moved: Array<[string,string]> = [];
  let committed = false;
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [id]);
    const match = (await client.query('SELECT * FROM matches WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (!match) { await client.query('ROLLBACK'); return Response.json({ error: 'Partida não encontrada' }, { status: 404 }); }
    const maps = (await client.query('SELECT replay_path,demo_path FROM match_maps WHERE match_id=$1', [id])).rows;
    const files = new Set<string>();
    for (const stored of [match.replay_path,...maps.flatMap(m=>[m.replay_path,m.demo_path])].filter(Boolean)) {
      const file = await resolveReplayFile(stored);
      files.add(file);
      if (file.endsWith('.bin.gz')) {
        files.add(file.replace(/\.bin\.gz$/, '.dem'));
        files.add(file.replace(/\.bin\.gz$/, '.json'));
      }
    }
    // Legacy ingestion wrote aliases in the series directory. Include them only
    // when no other match references that directory.
    for (const dir of new Set([...files].map(f=>path.dirname(f)))) {
      const others = (await client.query('SELECT replay_path FROM matches WHERE id<>$1 UNION ALL SELECT replay_path FROM match_maps WHERE match_id<>$1', [id])).rows;
      if (others.some(r=>r.replay_path && path.dirname(path.resolve(r.replay_path))===dir)) continue;
      for (const entry of await readdir(dir).catch(()=>[])) {
        if (/\.(dem|bin\.gz|json)$/.test(entry)) files.add(await resolveReplayFile(path.join(dir,entry)));
      }
    }
    for (const file of files) {
      await resolveReplayFile(file);
      const staged = `${file}.deleting-${randomUUID()}`;
      try { await rename(file,staged); moved.push([file,staged]); }
      catch(error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    await client.query('DELETE FROM matches WHERE id=$1', [id]);
    await client.query('COMMIT'); committed = true;
    // Physical cleanup must finish before reporting success.
    await Promise.all(moved.map(([,staged])=>unlink(staged)));
    return Response.json({ deleted: true, filesDeleted: moved.length });
  } catch(error) {
    if (!committed) {
      await client.query('ROLLBACK');
      for (const [file,staged] of moved.reverse()) await rename(staged,file);
    }
    console.error('[delete match]',error);
    return Response.json({ error: committed ? 'Registro removido; a limpeza de arquivos precisa ser concluída.' : 'Exclusão cancelada; a partida foi preservada.' }, { status: 500 });
  } finally { client.release(); }
}
