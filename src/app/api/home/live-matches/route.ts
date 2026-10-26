export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getLiveMatches } from '../../../../services/home/live-matches';

export async function GET() {
  try {
    const matches = await getLiveMatches();
    return NextResponse.json(
      {
        matches,
        liveCount: matches.filter(match => match.status === 'live').length,
        count: matches.length,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      },
    );
  } catch (error) {
    console.error('[home/live-matches] Aggregation failed', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Não foi possível carregar as partidas. Tente novamente em instantes.' },
      { status: 502, headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' } },
    );
  }
}
