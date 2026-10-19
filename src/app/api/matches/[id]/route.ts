import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { getMatchById } from '../../../../lib/queries/matches.ts';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return Response.json({ error: 'Missing match ID' }, { status: 400 });
    }

    let match = await getMatchById(id);

    if (!match) {
      // 1. Fallback: Checa arquivo no diretório data/replays/[id]/
      const matchDir = path.resolve(process.cwd(), 'data', 'replays', id);
      const jsonCandidate = path.join(matchDir, 'match.json');
      if (existsSync(jsonCandidate)) {
        try {
          const raw = readFileSync(jsonCandidate, 'utf8');
          const parsed = JSON.parse(raw);
          const fallbackMatch = parsed.match || parsed.matchRecord || parsed;
          return Response.json({ match: fallbackMatch }, { status: 200 });
        } catch {}
      }

      // 2. Fallback: Checa src/data/ingested-matches.json
      const storePath = path.resolve(process.cwd(), 'src', 'data', 'ingested-matches.json');
      if (existsSync(storePath)) {
        try {
          const rawStore = readFileSync(storePath, 'utf8');
          const store = JSON.parse(rawStore);
          if (Array.isArray(store)) {
            const entry = store.find((item: any) => item.matchId === id || item.demoHash === id);
            if (entry && entry.matchRecord) {
              return Response.json({ match: entry.matchRecord }, { status: 200 });
            }
          }
        } catch {}
      }

      return Response.json(
        { error: `Match not found for ID ${id}` },
        { status: 404 },
      );
    }


    return Response.json({ match }, { status: 200 });
  } catch (error) {
    console.error('[API /api/matches/[id]] Error fetching match:', error);
    return Response.json(
      { error: 'Internal server error while fetching match' },
      { status: 500 },
    );
  }
}

