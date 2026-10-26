import { NextResponse } from 'next/server';
import { getNewsFeed } from '../../../../services/home/news-feed';

export const runtime = 'nodejs';
export const revalidate = 1800;

export async function GET() {
  try {
    return NextResponse.json(await getNewsFeed());
  } catch (error) {
    console.error('[news/feed] Aggregation failed', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Não foi possível carregar as notícias. Tente novamente em instantes.' },
      { status: 502, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } },
    );
  }
}
