import { getPlayerPerformance } from '../../../../../lib/queries/matches.ts';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ steamId: string }> },
) {
  try {
    const { steamId } = await params;
    if (!steamId) {
      return Response.json({ error: 'Missing steamId' }, { status: 400 });
    }

    const performance = await getPlayerPerformance(steamId);
    if (!performance) {
      return Response.json({ error: 'Player performance not found' }, { status: 404 });
    }

    return Response.json(performance);
  } catch (err) {
    console.error('[API /stats/player] Error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

