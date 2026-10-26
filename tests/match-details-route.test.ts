// @vitest-environment node
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../src/app/api/match-details/route';
import { parseDust2MatchDetails, matchDetailsUrl } from '../src/services/home/match-details';
const html = readFileSync(new URL('./fixtures/dust2-match-details.html', import.meta.url), 'utf8');
afterEach(() => vi.unstubAllGlobals());
describe('Dust2 match details', () => {
  it('parses real Dust2 maps, stats scoped to map, rating version and derived MVP', () => {
    const details = parseDust2MatchDetails(html);
    expect(details.maps.map(map => map.name)).toEqual(['DE_MIRAGE', 'DE_CACHE', 'DE_ANCIENT']);
    expect(details.maps[0]).toMatchObject({ status: 'finished', score: '10 : 13' });
    expect(details.maps[1]).toMatchObject({ status: 'finished', score: '16 : 14', team1: [], team2: [] });
    expect(details.maps[2]).toMatchObject({ status: 'live', score: null });
    expect(details.maps[0].team1).toHaveLength(5);
    expect(details.maps[0].team1[0]).toMatchObject({ name: 'stressarN', kills: 27, deaths: 17, difference: 10, adr: 108.8, kast: 87, rating: 1.7 });
    expect(details.team2Stats).toHaveLength(5);
    expect(details.mvp).toMatchObject({ name: 'jottAAA', mapNumber: 1, mapName: 'DE_MIRAGE', rating: 1.92, ratingVersion: '3.0' });
    expect(details.maps[0].rounds).toHaveLength(23);
  });
  it('never substitutes missing metrics with zeros and tolerates changed table classes', () => {
    const details = parseDust2MatchDetails(html.replaceAll('108.8', '-').replaceAll('match-stat-adr', 'new-adr'));
    expect(details.maps[0].team1[0].adr).toBeNull();
    expect(parseDust2MatchDetails('<div class="match-page-header"></div>')).toEqual({ maps: [], team1Stats: [], team2Stats: [], mvp: null });
    expect(() => parseDust2MatchDetails('<html>challenge</html>')).toThrow();
  });
  it.each(['https://evil.com/partidas/123/test', '//evil.com', '/partidas/../admin', '/noticias/123/test', '123?redirect=x', '/partidas/1/%2e%2e', ''])('rejects nonmatch input %s', value => {
    expect(() => matchDetailsUrl(value)).toThrow('INVALID_MATCH_URL');
  });
  it('supports IDs and match paths, uses browser headers and cache', async () => {
    const fetchMock = vi.fn(async () => new Response(html)); vi.stubGlobal('fetch', fetchMock);
    const response = await GET(new NextRequest('http://localhost/api/match-details?url=2399636'));
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith('https://www.dust2.com.br/partidas/2399636/match', expect.objectContaining({ next: { revalidate: 30 }, redirect: 'error', headers: expect.objectContaining({ Referer: 'https://www.dust2.com.br/' }) }));
    expect(matchDetailsUrl('/partidas/2399636/sinners-vs-eternal-fire')).toContain('/partidas/2399636/sinners-vs-eternal-fire');
    expect(matchDetailsUrl('/partida/123-sinners-eternal-fire')).toContain('/partida/123-sinners-eternal-fire');
  });
  it('returns 400 for invalid inputs and 502 for upstream failure or markup changes', async () => {
    expect((await GET(new NextRequest('http://localhost/api/match-details'))).status).toBe(400);
    for (const upstream of [new Response('', { status: 403 }), new Response('<html>changed</html>')]) {
      vi.stubGlobal('fetch', vi.fn(async () => upstream));
      const response = await GET(new NextRequest('http://localhost/api/match-details?url=123'));
      expect(response.status).toBe(502);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    }
  });
});
