import { getRecentMatches } from '../../../lib/queries/matches.ts';

export async function GET() {
  try {
    const matches = await getRecentMatches(10);
    return Response.json({ matches });
  } catch (err) {
    console.error('[API /matches] Error:', err);
    return Response.json({ error: 'Failed to fetch matches' }, { status: 500 });
  }
}

