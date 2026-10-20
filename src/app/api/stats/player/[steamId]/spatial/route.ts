import { NextResponse } from 'next/server';
import { extractPlayerSpatialTelemetry } from '../../../../../../lib/replay/spatial.ts';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ steamId: string }> },
) {
  try {
    const { steamId } = await params;
    if (!steamId) {
      return NextResponse.json({ error: 'Missing steamId' }, { status: 400 });
    }

    const spatialData = await extractPlayerSpatialTelemetry(steamId);
    if (!spatialData) {
      return NextResponse.json({ error: 'Spatial telemetry not found for player' }, { status: 404 });
    }

    return NextResponse.json(spatialData);
  } catch (err) {
    console.error('[API /api/stats/player/[steamId]/spatial] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
