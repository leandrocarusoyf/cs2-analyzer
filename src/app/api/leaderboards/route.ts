import { NextResponse } from 'next/server';
import { getLeaderboardPlayersFromDb } from '../../../lib/queries/matches.ts';

export async function GET() {
  try {
    const players = await getLeaderboardPlayersFromDb();
    return NextResponse.json({ players });
  } catch (error) {
    console.error('[API /api/leaderboards] Error:', error);
    return NextResponse.json({ error: 'Erro ao buscar leaderboards' }, { status: 500 });
  }
}
