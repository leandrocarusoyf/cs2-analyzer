import { NextRequest, NextResponse } from 'next/server';
import { getValveRegionalStandings } from '../../../../services/home/valve-standings';
import { VALVE_REGIONS, type ValveRegion } from '../../../../types/home-data';

export const runtime = 'nodejs';
export const revalidate = 3600;

/** SA and NA both preserve the official Americas positions. */
export async function GET(request: NextRequest) {
  const region = request.nextUrl.searchParams.get('region');
  if (region !== null && !VALVE_REGIONS.some(value => value === region)) {
    return NextResponse.json(
      { error: 'Região inválida. Utilize SA, EU, NA ou ASIA.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  try {
    const standings = region === null
      ? await getValveRegionalStandings()
      : await getValveRegionalStandings(region as ValveRegion);
    return NextResponse.json(standings, { headers: { 'X-VRS-Data-Source': 'ValveSoftware/counter-strike_regional_standings' } });
  } catch (error) {
    console.error('[rankings/vrs] Falha ao carregar ranking regional:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Não foi possível carregar o ranking regional da Valve.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
