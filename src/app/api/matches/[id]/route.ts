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

    const match = await getMatchById(id);

    if (!match) {
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

