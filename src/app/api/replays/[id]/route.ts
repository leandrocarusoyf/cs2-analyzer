import { readFile } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { Readable } from 'node:stream';
import path from 'node:path';
import zlib from 'node:zlib';
import { query } from '../../../../lib/db.ts';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return Response.json({ error: 'Missing replay ID' }, { status: 400 });
    }

    let replayPath: string | null = null;

    // 1. Consulta no banco de dados por ID ou demo_hash
    try {
      const dbRes = await query(
        `SELECT replay_path FROM matches WHERE id::text = $1 OR demo_hash = $1 LIMIT 1;`,
        [id],
      );
      if (dbRes.rows.length > 0 && dbRes.rows[0].replay_path) {
        replayPath = dbRes.rows[0].replay_path;
      }
    } catch (dbErr) {
      console.warn('[replays route] Database query error, trying fallback:', dbErr);
    }

    // 2. Fallback de busca no disco caso o ID seja um caminho relativo ou partida canônica
    if (!replayPath) {
      const directPath = path.resolve(process.cwd(), id);
      if (existsSync(directPath)) {
        replayPath = directPath;
      } else if (
        id === '54e43847-2490-4751-9981-831bf7cf367c' ||
        id === '916fac287383f0fb' ||
        id.includes('furia-vs-aurora')
      ) {
        const canonicalPath = path.resolve(
          process.cwd(),
          'data',
          'replays',
          '10-2026',
          '18-10-2026',
          'FURIA_vs_Aurora_BO1',
          'furia-vs-aurora-m2-inferno.bin.gz',
        );
        if (existsSync(canonicalPath)) {
          replayPath = canonicalPath;
        }
      }
    }

    if (!replayPath) {
      return Response.json(
        { error: `Replay not found for ID ${id}` },
        { status: 404 },
      );
    }

    const resolvedFile = path.isAbsolute(replayPath)
      ? replayPath
      : path.resolve(process.cwd(), replayPath);

    if (!existsSync(resolvedFile)) {
      return Response.json(
        { error: `Replay file not found on disk: ${replayPath}` },
        { status: 404 },
      );
    }

    // Se o cliente solicitar JSON explicitamente via query param (?format=json):
    let wantsJson = false;
    try {
      const url = new URL(request.url);
      wantsJson = url.searchParams.get('format') === 'json';
    } catch {
      // Ignora erro de URL relativo
    }

    if (wantsJson) {
      const fileBuffer = await readFile(resolvedFile);
      const rawText = zlib.gunzipSync(fileBuffer).toString('utf8');
      const decompressedJson = JSON.parse(rawText);
      return Response.json(decompressedJson, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    const nodeStream = createReadStream(resolvedFile);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'no-cache',
        'Content-Disposition': `inline; filename="${path.basename(resolvedFile)}"`,
      },
    });
  } catch (error) {
    console.error('[replays route] Error streaming replay:', error);
    return Response.json(
      { error: 'Internal server error while streaming replay' },
      { status: 500 },
    );
  }
}


