import { getPlayerMatchInspect } from '../../../../../lib/queries/matches.ts';
import type { MatchInspectFilters } from '../../../../../types/stats.ts';

export interface MatchInspectRouteContext {
  params: Promise<{ steamid: string; steamId?: string }>;
}

function parseBooleanParam(raw: string | null): boolean | null {
  if (raw === null || raw === undefined || raw.trim() === '') return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return null;
}

export async function GET(
  request: Request,
  context: MatchInspectRouteContext,
): Promise<Response> {
  try {
    const resolvedParams = (await Promise.resolve(context?.params ?? {})) as {
      steamid?: string;
      steamId?: string;
    };
    const steamid = String(resolvedParams.steamid ?? resolvedParams.steamId ?? '').trim();

    if (!steamid) {
      return Response.json(
        { error: 'Parâmetro steamid é obrigatório.' },
        { status: 400 },
      );
    }

    const url = new URL(request.url, 'http://localhost');
    const searchParams = url.searchParams;
    const matchId = (
      searchParams.get('matchId') ??
      searchParams.get('match_id') ??
      ''
    ).trim();

    if (!matchId) {
      return Response.json(
        { error: 'Parâmetro matchId é obrigatório.' },
        { status: 400 },
      );
    }

    const rawRound = searchParams.get('round') ?? searchParams.get('roundNumber') ?? searchParams.get('round_number');
    const parsedRound =
      rawRound !== null && rawRound.trim() !== '' && Number.isFinite(Number(rawRound))
        ? Number(rawRound)
        : null;

    const rawOutcome = (
      searchParams.get('outcome') ??
      searchParams.get('result') ??
      searchParams.get('role') ??
      ''
    )
      .trim()
      .toLowerCase();
    const outcome: MatchInspectFilters['outcome'] =
      rawOutcome === 'win' || rawOutcome === 'winner'
        ? 'win'
        : rawOutcome === 'loss' || rawOutcome === 'loser'
        ? 'loss'
        : rawOutcome === 'all'
        ? 'all'
        : null;

    const isOpening = parseBooleanParam(
      searchParams.get('isOpening') ?? searchParams.get('is_opening') ?? searchParams.get('opening'),
    );
    const isTrade = parseBooleanParam(
      searchParams.get('isTrade') ?? searchParams.get('is_trade') ?? searchParams.get('trade'),
    );
    const isClutch = parseBooleanParam(
      searchParams.get('isClutch') ?? searchParams.get('is_clutch') ?? searchParams.get('clutch'),
    );

    const mapZone =
      searchParams.get('mapZone') ??
      searchParams.get('map_zone') ??
      searchParams.get('zone') ??
      null;
    const weapon = searchParams.get('weapon') ?? null;
    const duelTag =
      searchParams.get('duelTag') ??
      searchParams.get('duel_tag') ??
      searchParams.get('tag') ??
      null;

    const filters: MatchInspectFilters = {
      roundNumber: parsedRound,
      outcome,
      isOpening,
      isTrade,
      isClutch,
      mapZone: mapZone ? mapZone.trim() : null,
      weapon: weapon ? weapon.trim() : null,
      duelTag: duelTag ? duelTag.trim() : null,
    };

    const payload = await getPlayerMatchInspect(steamid, matchId, filters);
    if (!payload) {
      return Response.json(
        { error: 'Dados de inspeção não encontrados para este jogador e partida.' },
        { status: 404 },
      );
    }

    return Response.json(payload, { status: 200 });
  } catch (err) {
    console.error('[API /api/players/:steamid/match-inspect] Error:', err);
    return Response.json(
      { error: 'Erro interno ao buscar inspeção da partida.' },
      { status: 500 },
    );
  }
}
