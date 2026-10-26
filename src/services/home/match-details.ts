import { load, type CheerioAPI } from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { MatchDetails, MatchMapDetails, MatchPlayerStats, MatchRound } from '../../types/match-details';
import { DUST2_HEADERS } from './dust2';

const ORIGIN = 'https://www.dust2.com.br';

/** Only match paths on the fixed upstream origin are accepted. */
export function matchDetailsUrl(input: string): string {
  const path = /^\d+$/.test(input) ? `/partidas/${input}/match` : input;
  if (!/^\/partidas?\/\d+(?:[/-][a-zA-Z0-9_-]+)*\/?$/.test(path)) throw new Error('INVALID_MATCH_URL');
  return `${ORIGIN}${path}`;
}

const mapName = (name: string) => `DE_${name.trim().replace(/^de_/i, '').toUpperCase()}`;
function numeric(text: string): number | null {
  const clean = text.trim().replace('%', '').replace(',', '.');
  return /^[+-]?\d+(?:\.\d+)?$/.test(clean) ? Number(clean) : null;
}

function players($: CheerioAPI, table: AnyNode): MatchPlayerStats[] {
  const result: MatchPlayerStats[] = [];
  const headers = $(table).find('thead th').toArray().map(cell => $(cell).text().trim().toLowerCase().replace(/\s/g, ''));
  const ratingLabel = $(table).find('thead').text().match(/rating\s*(2\.0|3\.0)/i)?.[1];
  $(table).find('tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (!cells.length) return;
    const value = (selector: string, header: RegExp) => {
      const explicit = $(row).find(selector).first();
      const index = headers.findIndex(label => header.test(label));
      return explicit.length ? explicit.text().trim() : index >= 0 ? cells.eq(index).text().trim() : ''; 
    };
    const nameCell = $(row).find('.match-stat-player-team, .player, .player-name').first();
    const name = (nameCell.find('b, .nickname').first().text() || nameCell.text() || cells.first().text()).trim();
    if (!name) return;
    const kd = value('.match-stat-kd, .kd', /^k-?d$/).match(/^(\d+)\s*[-–:]\s*(\d+)$/);
    const kills = kd ? Number(kd[1]) : null;
    const deaths = kd ? Number(kd[2]) : null;
    result.push({
      id: name, name, fullName: nameCell.text().trim() || name, kills, deaths,
      difference: numeric(value('.match-stat-kd-ratio, .plus-minus', /^\+\/-$/)) ?? (kills !== null && deaths !== null ? kills - deaths : null),
      adr: numeric(value('.match-stat-adr, .adr', /^adr$/)),
      kast: numeric(value('.match-stat-kast, .kast', /^kast$/)),
      rating: numeric(value('.match-stat-rating, .rating', /^rating/)),
      ratingVersion: ratingLabel === '2.0' || ratingLabel === '3.0' ? ratingLabel : null,
    });
  });
  return result;
}

function rounds($: CheerioAPI, scope: AnyNode): MatchRound[] {
  const result = new Map<number, MatchRound>();
  $(scope).find('.round-breakdown-team-wrapper').each((teamIndex, team) => {
    if (teamIndex > 1) return;
    $(team).find('.round-breakdown-icon').each((_, icon) => {
      const score = ($(icon).attr('title') || $(icon).attr('alt') || '').match(/^(\d+)\s*-\s*(\d+)$/);
      const src = $(icon).attr('src') || '';
      if (!score || !/t_win|ct_win|bomb_exploded|bomb_defused|stopwatch/.test(src)) return;
      const number = Number(score[1]) + Number(score[2]);
      const half = number <= 24 ? Math.ceil(number / 12) : 3 + Math.floor((number - 25) / 3);
      result.set(number, { number, half, winner: teamIndex === 0 ? 'team1' : 'team2',
        side: /ct_win|bomb_defused|stopwatch/.test(src) ? 'CT' : 'TR',
        reason: /bomb_/.test(src) ? 'bomb' : 'elimination' });
    });
  });
  return [...result.values()].sort((a, b) => a.number - b.number);
}

export function parseDust2MatchDetails(html: string): MatchDetails {
  const $ = load(html);
  // Distinguish an empty upcoming match from a challenge/error/unrecognized page.
  if (!$('.match-page-header, .matchpage-header-title, .maps-container, .mapholder').length) {
    throw new Error('Dust2 match page unavailable or markup changed');
  }
  const maps: MatchMapDetails[] = [];
  $('.maps-container .map-container, .mapholder').each((_, element) => {
    const card = $(element);
    if (card.is('.map-banned') || /baniu/i.test(card.find('.map-container-type').text())) return;
    const name = card.find('.map-container-map-name, .mapname, .map-name-holder').first().text().trim();
    if (!name || /^(tba|tbd|a definir)$/i.test(name)) return;
    const left = numeric(card.find('.map-container-score-left, .results-left .results-team-score').first().text());
    const right = numeric(card.find('.map-container-score-right, .results-right .results-team-score').first().text());
    const finished = card.is('.finished, .completed') || card.find('.map-won, .map-lost, .results-team-score.won, .results-stats').length > 0;
    const live = card.is('.live, .playing') || /ao vivo/i.test(card.find('.map-container-score-live').text());
    maps.push({ number: maps.length + 1, name: mapName(name), status: finished ? 'finished' : live ? 'live' : 'upcoming',
      score: (finished || live) && left !== null && right !== null ? `${left} : ${right}` : null, team1: [], team2: [], rounds: [] });
  });
  const teamNames = $('.match-page-header-teams .team-name-container').toArray().map(el => $(el).text().trim().toLowerCase());
  let team1Stats: MatchPlayerStats[] = [], team2Stats: MatchPlayerStats[] = [];
  $('.match-result-wrapper-tabs > [data-tab-content-id]').each((_, content) => {
    const id = $(content).attr('data-tab-content-id');
    const tabs = $(content).parent();
    const label = tabs.find('[data-tab-id]').filter((_, tab) => $(tab).attr('data-tab-id') === id).first().text().trim();
    const map = maps.find(map => map.name === mapName(label));
    $(content).find('.match-result-table table, table.stats-table, table.matchstats').each((index, table) => {
      const name = $(table).find('.match-stat-team-name').text().trim().toLowerCase();
      const side = name && teamNames.includes(name) ? teamNames.indexOf(name) : index;
      const stats = players($, table);
      if (map && side === 0) map.team1 = stats;
      if (map && side === 1) map.team2 = stats;
      // Unscoped series tables must not be attributed to map 1.
      if (!map && side === 0) team1Stats = stats;
      if (!map && side === 1) team2Stats = stats;
    });
    if (map) map.rounds = rounds($, content);
  });
  // Support alternate table markup without pretending aggregate stats are map-specific.
  if (!$('.match-result-wrapper-tabs > [data-tab-content-id]').length) {
    $('.match-result-table table, table.stats-table, table.matchstats').each((index, table) => {
      if (index === 0) team1Stats = players($, table);
      if (index === 1) team2Stats = players($, table);
    });
  }
  const first = maps[0];
  const best = first?.status === 'finished' ? [...first.team1, ...first.team2]
    .filter(player => player.rating !== null).sort((a, b) => b.rating! - a.rating!)[0] : undefined;
  return { maps, team1Stats: team1Stats.length ? team1Stats : first?.team1 ?? [], team2Stats: team2Stats.length ? team2Stats : first?.team2 ?? [], mvp: best ? { ...best, fullName: best.fullName || best.name,
    mapNumber: first.number, mapName: first.name, ratingVersion: best.ratingVersion ?? null } : null };
}

export async function getMatchDetails(input: string): Promise<MatchDetails> {
  const response = await fetch(matchDetailsUrl(input), { headers: DUST2_HEADERS, next: { revalidate: 30 },
    redirect: 'error', signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Dust2 returned HTTP ${response.status}`);
  return parseDust2MatchDetails(await response.text());
}
