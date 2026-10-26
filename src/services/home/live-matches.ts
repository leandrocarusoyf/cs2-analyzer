import { load } from 'cheerio';
import type { MatchItem } from '../../types/home-data';
import { httpUrl, isoDate } from './external-data';
import { DUST2_HEADERS } from './dust2';
import { getMatchDetails } from './match-details';
export { DUST2_HEADERS } from './dust2';

const ORIGIN = 'https://www.dust2.com.br';

/** Parenthesized numbers are always series wins; only adjacent text supplies rounds. */
export function parseScores(rawText: string): { seriesScore: number | null; mapScore: number | null } {
  const series = rawText.match(/\(\s*(\d+)\s*\)/);
  const remaining = rawText.replace(/\(\s*\d+\s*\)/g, ' ').trim();
  const map = remaining.match(/\b\d+\b/);
  return { seriesScore: series ? Number(series[1]) : null, mapScore: map ? Number(map[0]) : series ? 0 : null };
}

export function parseDust2Matches(html: string): MatchItem[] {
  const $ = load(html);
  const matches = new Map<string, MatchItem>();
  $('.match-list-component').each((_, element) => {
    const card = $(element);
    const id = card.find('a[href*="/partidas/"]').first().attr('href')?.match(/\/partidas\/(\d+)/)?.[1];
    if (!id || card.find('.match-list-top.finished, .match-list-top.ended').length) return;
    const rows = card.find('.teamrow');
    const team = (index: number) => ({
      name: rows.eq(index).find('.team > span').text().trim() || 'A definir',
      logo_url: httpUrl(rows.eq(index).find('img').first().attr('src'), ORIGIN),
      rank: null,
    });
    const score = (index: number, selector: string) => {
      const text = rows.eq(index).find(selector).first().text().trim();
      const raw = text || rows.eq(index).find(selector).first().attr('data-score') || '';
      return /^\d+$/.test(raw) ? Number(raw) : null;
    };
    const live = card.find('.match-list-top.live').length > 0 || /ao vivo/i.test(card.find('.start-time').text());

    const extractTeamScore = (index: number) => {
      const row = rows.eq(index);
      const dataMapScore = score(index, '[data-map-score-element]');
      const dataMapsScore = score(index, '[data-maps-score-element]');

      const container = row.find('.match-list-live-score-container');
      const rowClone = row.clone();
      rowClone.find('.team').remove();
      const text = (container.length ? container.text() : rowClone.text()).trim();

      const parsed = parseScores(text);
      const seriesVal = dataMapsScore ?? parsed.seriesScore;
      const mapVal = dataMapScore ?? parsed.mapScore;

      return { map: mapVal, series: seriesVal };
    };

    const team1Scores = extractTeamScore(0);
    const team2Scores = extractTeamScore(1);
    const left = team1Scores.series;
    const right = team2Scores.series;
    const team1MapScore = team1Scores.map;
    const team2MapScore = team2Scores.map;

    const timestamp = card.find('[data-date]').first().attr('data-date');
    matches.set(id, {
      source_url: card.find('a[href*="/partidas/"]').first().attr('href'),
      id,
      event_name: card.find('.event-name').text().trim() || 'Evento a definir',
      status: live ? 'live' : 'upcoming',
      team1: { ...team(0), seriesScore: left ?? 0, mapScore: team1MapScore ?? 0 },
      team2: { ...team(1), seriesScore: right ?? 0, mapScore: team2MapScore ?? 0 },
      match_format: null,
      series_score: left !== null && right !== null ? `${left}-${right}` : null,
      // The carousel does not identify the active map; never invent its name.
      current_map: null,
      team1_score: team1MapScore,
      team2_score: team2MapScore,
      scheduled_at: timestamp ? isoDate(Number(timestamp)) : null,
      scheduled_label: live ? undefined : card.find('.start-time').text().trim() || undefined,
    });
  });
  if (!$('.match-listing-slider').length && !matches.size) throw new Error('Dust2 match markup unavailable');
  return [...matches.values()].sort((a, b) => Number(b.status === 'live') - Number(a.status === 'live')
    || (a.scheduled_at ?? '9999').localeCompare(b.scheduled_at ?? '9999'));
}

export async function getLiveMatches(): Promise<MatchItem[]> {
  const response = await fetch(`${ORIGIN}/`, {
    headers: DUST2_HEADERS,
    next: { revalidate: 30 },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Dust2 returned HTTP ${response.status}`);
  const matches = parseDust2Matches(await response.text());
  const missing = matches.filter(match => match.status === 'live' &&
    (match.team1_score === null || match.team2_score === null || match.series_score === null || !match.current_map));
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(2, missing.length) }, async () => {
    while (next < missing.length) {
      const match = missing[next++];
      try {
        const details = await getMatchDetails(match.source_url ?? match.id);
        const active = details.maps.find(map => map.status === 'live') || details.maps.find(map => map.status !== 'finished');
        let r1: number | null = null;
        let r2: number | null = null;
        const partial = active?.score?.match(/^(\d+)\s*[:-]\s*(\d+)$/);
        if (partial) {
          r1 = Number(partial[1]);
          r2 = Number(partial[2]);
        } else if (active?.rounds && active.rounds.length > 0) {
          r1 = active.rounds.filter(r => r.winner === 'team1').length;
          r2 = active.rounds.filter(r => r.winner === 'team2').length;
        }
        if (active && r1 !== null && r2 !== null) {
          match.team1_score = r1;
          match.team2_score = r2;
          match.team1.mapScore = r1;
          match.team2.mapScore = r2;
          match.current_map = { number: active.number, name: active.name, team1_rounds: r1, team2_rounds: r2 };
        }
        const completed = details.maps.filter(map => map.status === 'finished');
        if (!match.series_score && completed.every(map => map.score !== null) && (completed.length || active)) {
          let left = 0, right = 0;
          for (const map of completed) {
            const pair = map.score!.split(/\s*[:-]\s*/).map(Number);
            if (pair[0] > pair[1]) left++;
            if (pair[1] > pair[0]) right++;
          }
          match.series_score = `${left}-${right}`;
          match.team1.seriesScore = left;
          match.team2.seriesScore = right;
        }
      } catch {
        // A failed detail request must not discard the carousel preview.
      }
    }
  }));
  return matches;
}
