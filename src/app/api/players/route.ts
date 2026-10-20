import { NextResponse } from 'next/server';
import { getAllRegisteredPlayers } from '../../../lib/queries/matches.ts';

export async function GET() {
  try {
    const players = await getAllRegisteredPlayers();
    return NextResponse.json({ players });
  } catch (error) {
    console.error('[API /api/players] Error:', error);
    return NextResponse.json({ error: 'Erro ao buscar jogadores' }, { status: 500 });
  }
}
