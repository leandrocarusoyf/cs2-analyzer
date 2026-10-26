import { NextRequest, NextResponse } from 'next/server';
import { getMatchDetails, matchDetailsUrl } from '../../../services/home/match-details';

export const runtime = 'nodejs';
export const revalidate = 30;

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  try {
    if (!url) throw new Error('INVALID_MATCH_URL');
    matchDetailsUrl(url);
  } catch {
    return NextResponse.json({ error: 'Informe um ID ou caminho válido de partida Dust2.' }, { status: 400 });
  }
  try {
    return NextResponse.json(await getMatchDetails(url!));
  } catch (error) {
    console.error('[match-details] Falha ao consultar Dust2:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Não foi possível carregar os detalhes da partida. Tente novamente.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
