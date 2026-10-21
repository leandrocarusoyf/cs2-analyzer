import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { query } from '../../../../lib/db.ts';
import { resolveReplayFile } from '../../../../lib/replay/files.ts';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rows = (await query(`SELECT replay_path FROM match_maps WHERE id::text=$1
      UNION ALL SELECT replay_path FROM matches WHERE id::text=$1 OR demo_hash=$1 LIMIT 1`, [id])).rows;
    if (!rows[0]?.replay_path) return Response.json({ error: 'Replay não encontrado' }, { status: 404 });
    const file = await resolveReplayFile(rows[0].replay_path);
    const bytes = await readFile(file);
    if (new URL(request.url).searchParams.get('format') === 'json') return Response.json(JSON.parse(gunzipSync(bytes).toString()), { headers: { 'Cache-Control': 'no-store' } });
    return new Response(bytes, { headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store' } });
  } catch(error) {
    return Response.json({ error: 'Não foi possível carregar o replay' }, { status: (error as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 500 });
  }
}
