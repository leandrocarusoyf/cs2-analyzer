// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cache: vi.fn((fn: (...args: unknown[]) => unknown, _keys: string[], _options: unknown) => fn),
}));

vi.mock('next/cache', () => ({ unstable_cache: mocks.cache }));
import { parseDust2Matches, getLiveMatches, parseScores } from '../src/services/home/live-matches';
import { getNewsFeed, mapNewsItem } from '../src/services/home/news-feed';
import { GET as matchesGET, revalidate as matchesRevalidate, runtime as matchesRuntime } from '../src/app/api/home/live-matches/route';
import { GET as newsGET, revalidate as newsRevalidate, runtime as newsRuntime } from '../src/app/api/news/feed/route';

const cacheCalls = mocks.cache.mock.calls.slice();

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('Dust2 aggregation', () => {
  const card = (id: number, live: boolean) => `<div class="match-list-component">
    <div class="match-list-top ${live ? 'live' : 'not_started'}"><a class="start-time" href="/partidas/${id}/test">${live ? 'Ao vivo' : '16:00'}<span data-date="1800000000000"></span></a><a class="event-name">CCT Brasil</a></div>
    <div class="teamrow"><a class="team"><span>FURIA</span><img src="/furia.svg"></a><span data-maps-score-element>0</span><span data-map-score-element>7</span></div>
    <div class="teamrow"><a class="team"><span>paiN</span></a><span data-maps-score-element>1</span><span data-map-score-element>10</span></div></div>`;
  it.each([
    ['8 (1)', 8, 1], ['(1) 8', 8, 1], ['(1)', 0, 1], ['0 (0)', 0, 0],
    [' ( 2 )   10 ', 10, 2], ['', null, null], ['8', 8, null],
  ])('parses score text %s without mixing series and rounds', (text, mapScore, seriesScore) => {
    expect(parseScores(String(text))).toEqual({ mapScore, seriesScore });
  });
  it.each(['8 (1)', '(1) 8', '(1)'])('publishes team-level scores for adjacent text %s', raw => {
    const html = `<div class="match-list-component"><div class="match-list-top live"><a href="/partidas/123/test">Ao vivo</a></div><div class="teamrow"><a class="team"><span>M80</span></a>${raw}</div><div class="teamrow"><a class="team"><span>9z</span></a><span class="match-list-live-score-container">10 (0)</span></div></div>`;
    const parsed = parseDust2Matches(html)[0];
    expect(parsed.team1).toMatchObject({ name: 'M80', seriesScore: 1, mapScore: raw === '(1)' ? 0 : 8 });
    expect(parsed.team2).toMatchObject({ name: '9z', seriesScore: 0, mapScore: 10 });
  });
  it('parses actual carousel selectors, scores, teams, dates and deduplicates', () => {
    const matches = parseDust2Matches(card(2, false) + card(1, true) + card(1, true));
    expect(matches.map(m => m.id)).toEqual(['1', '2']);
    expect(matches[0]).toMatchObject({ event_name: 'CCT Brasil', status: 'live', series_score: '0-1', team1_score: 7, team2_score: 10, current_map: null,
      team1: { name: 'FURIA', seriesScore: 0, mapScore: 7, logo_url: 'https://www.dust2.com.br/furia.svg' } });
    expect(matches[1].scheduled_at).toBe(new Date(1800000000000).toISOString());
    expect(parseDust2Matches(card(1, true).replace('>0<', '><'))[0].series_score).toBeNull();
  });
  it('extracts series in parentheses and isolated rounds, with fallback to 0 when rounds omitted at match start', () => {
    const htmlWithIsolatedScores = `<div class="match-list-component">
      <div class="match-list-top live"><a class="start-time" href="/partidas/10/test">Ao vivo</a><a class="event-name">ESL Pro League</a></div>
      <div class="teamrow"><a class="team"><span>FURIA</span></a> 12 <span>(1)</span></div>
      <div class="teamrow"><a class="team"><span>NAVI</span></a> <span>(0)</span> 10</div></div>`;
    const match1 = parseDust2Matches(htmlWithIsolatedScores)[0];
    expect(match1).toMatchObject({ team1_score: 12, team2_score: 10, series_score: '1-0' });

    const htmlOmittedRounds = `<div class="match-list-component">
      <div class="match-list-top live"><a class="start-time" href="/partidas/11/test">Ao vivo</a><a class="event-name">ESL Pro League</a></div>
      <div class="teamrow"><a class="team"><span>FURIA</span></a> <span>(1)</span></div>
      <div class="teamrow"><a class="team"><span>NAVI</span></a> <span>(1)</span></div></div>`;
    const match2 = parseDust2Matches(htmlOmittedRounds)[0];
    expect(match2).toMatchObject({ team1_score: 0, team2_score: 0, series_score: '1-1' });
  });

  it('separates compact map/series text and recovers missing live scores from match details', async () => {
    const compact = card(1, true).replace('<span data-maps-score-element>0</span><span data-map-score-element>7</span>', '<span class="match-list-live-score-container">8 (0)</span>').replace('<span data-maps-score-element>1</span><span data-map-score-element>10</span>', '<span class="match-list-live-score-container">10 (1)</span>');
    expect(parseDust2Matches(compact)[0]).toMatchObject({ team1_score: 8, team2_score: 10, series_score: '0-1' });
    const empty = card(1, true).replace(/>0<|>1<|>7<|>10</g, '><');
    const details = `<div class="maps-container">
      <div class="map-container"><div class="map-container-map-name">Mirage</div><div class="map-won"></div><div class="map-container-score-left">13</div><div class="map-container-score-right">8</div></div>
      <div class="map-container"><div class="map-container-map-name">Nuke</div><div class="map-container-score-live">AO VIVO</div><div class="map-container-score-left">7</div><div class="map-container-score-right">10</div></div></div>`;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(url.endsWith('/1/test') ? details : empty)));
    expect((await getLiveMatches())[0]).toMatchObject({ team1_score: 7, team2_score: 10, series_score: '1-0', current_map: { name: 'DE_NUKE', team1_rounds: 7, team2_rounds: 10 } });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(url.endsWith('/1/test') ? '' : empty, { status: url.endsWith('/1/test') ? 503 : 200 })));
    expect(await getLiveMatches()).toHaveLength(1);
  });
  it('returns required numeric team scores even when upstream omits every score', async () => {
    const empty = card(1, true).replace(/>0<|>1<|>7<|>10</g, '><');
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(url.endsWith('/1/test') ? '<div class="match-page-header"></div>' : empty)));
    const body = await (await matchesGET()).json();
    expect(body.matches[0].team1).toMatchObject({ name: 'FURIA', seriesScore: 0, mapScore: 0 });
    expect(body.matches[0].team2).toMatchObject({ name: 'paiN', seriesScore: 0, mapScore: 0 });
    for (const team of [body.matches[0].team1, body.matches[0].team2]) {
      expect(typeof team.seriesScore).toBe('number');
      expect(typeof team.mapScore).toBe('number');
    }
  });
  it('uses the requested browser headers and 30-second fetch cache', async () => {
    const fetchMock = vi.fn(async () => new Response(card(1, true)));
    vi.stubGlobal('fetch', fetchMock);
    expect(await getLiveMatches()).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith('https://www.dust2.com.br/', expect.objectContaining({ next: { revalidate: 30 }, headers: expect.objectContaining({ Referer: 'https://www.dust2.com.br/', 'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7' }) }));
    expect(await (await matchesGET()).json()).toMatchObject({ count: 1, liveCount: 1, matches: expect.any(Array) });
  });
  it.each([403, 429, 503])('returns uncached errors for upstream %i', async status => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status })));
    const response = await matchesGET();
    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it('rejects unexpected HTML and accepts an empty carousel', () => {
    expect(() => parseDust2Matches('<html>blocked</html>')).toThrow();
    expect(parseDust2Matches('<div class="match-listing-slider"></div>')).toEqual([]);
  });
});

describe('RSS aggregation', () => {
  it('extracts image enclosures, strips markup and normalizes dates', () => {
    const item = mapNewsItem({ title: 'FURIA &amp; paiN', link: '/noticias/1', content: '<p>Olá <b>CS2</b></p><script>evil()</script>',
      pubDate: 'Wed, 21 Oct 2026 20:00:00 -0300', enclosure: { url: '/cover.jpg', type: 'image/jpeg' }, categories: ['<b>Brasil</b>'] }, 'https://www.dust2.com.br/rss');
    expect(item).toMatchObject({ title: 'FURIA & paiN', summary: 'Olá CS2', category_tag: 'Atualizações',
      published_at: '2026-10-21T23:00:00.000Z', cover_image_url: 'https://www.dust2.com.br/cover.jpg' });
  });

  it('falls back to body images and rejects unsafe URLs and nonimage enclosures', () => {
    const item = mapNewsItem({ title: 'CS2', link: 'https://example.com/news', enclosure: { url: '/audio.mp3', type: 'audio/mpeg' },
      content: '<img src="javascript:evil()" data-src="/cover.jpg">', pubDate: 'invalid' }, 'https://example.com/rss');
    expect(item).toMatchObject({ cover_image_url: 'https://example.com/cover.jpg', published_at: null, category_tag: 'Atualizações' });
    expect(mapNewsItem({ title: 'CS2', link: 'javascript:evil()' }, 'https://example.com')).toBeNull();
    expect(mapNewsItem({ title: 'CS2', guid: 'news1' }, 'https://example.com')).toBeNull();
  });

  it('uses content:encoded images and stable IDs independent of titles', () => {
    const input = { title: 'CS2', link: 'https://example.com/news', 'content:encoded': '<img src="//example.com/cover.png"><p>Resumo</p>' };
    const item = mapNewsItem(input, 'https://example.com/rss');
    expect(item?.cover_image_url).toBe('https://example.com/cover.png');
    expect(item?.id).toBe(mapNewsItem({ ...input, title: 'Updated' }, 'https://example.com/rss')?.id);
  });

  it.each(['campeonato', 'CIRCUIT', 'Major', 'playoffs', 'classificação', 'fase final', 'grupo'])('categorizes %s in either title or summary as Campeonatos', keyword => {
    const base = { link: 'https://example.com/news', categories: ['Transferências'] };
    expect(mapNewsItem({ ...base, title: `Novidades do ${keyword}` }, 'https://example.com/rss')?.category_tag).toBe('Campeonatos');
    expect(mapNewsItem({ ...base, title: 'CS2', summary: `<b>${keyword}</b>` }, 'https://example.com/rss')?.category_tag).toBe('Campeonatos');
  });

  it.each(['Time anuncia nova line-up', 'Atualização do CS2', 'Jogador muda de equipe'])('uses only Atualizações for %s regardless of RSS categories', title => {
    expect(mapNewsItem({ title, link: 'https://example.com/news', categories: ['Transferências', 'Campeonatos'] }, 'https://example.com/rss')?.category_tag).toBe('Atualizações');
  });

  it('classifies the full summary before truncating it for display', () => {
    const item = mapNewsItem({ title: 'CS2', link: 'https://example.com/news', summary: `${'a'.repeat(330)} playoffs` }, 'https://example.com/rss');
    expect(item?.category_tag).toBe('Campeonatos');
    expect(item?.summary).toHaveLength(320);
  });

  it('parses real XML, deduplicates and sorts newest first', async () => {
    const entry = (id: number, day: number) => `<item><title>CS2 ${id}</title><link>https://example.com/${id}</link><description>Resumo</description><pubDate>2026-10-${day}T12:00:00Z</pubDate></item>`;
    vi.stubGlobal('fetch', vi.fn(async () => new Response(`<rss version="2.0"><channel><title>CS2</title>${entry(1, 20)}${entry(2, 21)}${entry(1, 20)}</channel></rss>`)));
    const items = await getNewsFeed();
    expect(items.map((item) => item.title)).toEqual(['CS2 2', 'CS2 1']);
  });

  it('returns an uncached error on invalid XML or network failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>unavailable</html>')));
    expect((await newsGET()).status).toBe(502);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('timeout'); }));
    const response = await newsGET();
    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});

it('configures native cache TTLs and Node runtimes for both endpoints', () => {
  expect(matchesRevalidate).toBe(0);
  expect(newsRevalidate).toBe(1800);
  expect(matchesRuntime).toBe('nodejs');
  expect(newsRuntime).toBe('nodejs');
  expect(cacheCalls).toContainEqual([expect.any(Function), ['home-cs2-news-v2'], { revalidate: 1800 }]);
});
