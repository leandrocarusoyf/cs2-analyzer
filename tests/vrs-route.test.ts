// @vitest-environment node
import { afterEach, beforeEach, vi, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, runtime, revalidate } from '../src/app/api/rankings/vrs/route';
import { GET as legacyGET } from '../src/app/api/home/vrs/route';
import { VALVE_REGIONS, type ValveStandingItem } from '../src/types/home-data';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('api.github.com')
    ? Response.json({ tree: ['americas', 'europe', 'asia'].flatMap(region => ['2026_09_07', '2026_10_05'].map(date => ({ type: 'blob', path: `live/2026/standings_${region}_${date}.md` }))) })
    : new Response('| Standing | Points | Team Name | Roster |\n| 1 | 1931 | Official Team | a, b |')));
});
afterEach(() => vi.unstubAllGlobals());
describe('GET /api/rankings/vrs', () => {
  it('returns exactly four official regions', async () => {
    const response = await GET(new NextRequest('http://localhost/api/rankings/vrs'));
    expect(response.status).toBe(200);
    expect(response.headers.get('X-VRS-Data-Source')).toBe('ValveSoftware/counter-strike_regional_standings');
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual([...VALVE_REGIONS].sort());
    for (const region of VALVE_REGIONS) {
      expect(body[region].length).toBeGreaterThan(0);
      for (const team of body[region] as ValveStandingItem[]) {
        expect(team).toMatchObject({ name: expect.any(String), points: expect.any(Number), rank: expect.any(Number), change: 0, team_name: expect.any(String), region });
        expect(team.points).toBeGreaterThanOrEqual(0);
        expect(team.rank).toBeGreaterThan(0);
        expect(['up', 'down', 'neutral']).toContain(team.change_type);
      }
    }
    expect(runtime).toBe('nodejs');
    expect(revalidate).toBe(3600);
  });

  it('selects the latest file and caches official requests for an hour', async () => {
    await GET(new NextRequest('http://localhost/api/rankings/vrs?region=SA'));
    expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('standings_americas_2026_10_05.md'), expect.objectContaining({ next: { revalidate: 3600 } }));
  });
  it.each([403, 500])('returns an uncached failure for upstream %i', async status => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status })));
    const response = await GET(new NextRequest('http://localhost/api/rankings/vrs?region=SA'));
    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it.each(VALVE_REGIONS)('filters region %s', async region => {
    const response = await GET(new NextRequest(`http://localhost/api/rankings/vrs?region=${region}`));
    expect(response.status).toBe(200);
    expect(Array.isArray(await response.json())).toBe(true);
  });

  it.each(['APAC', 'ÁSIA', 'sa', '', '__proto__'])('rejects unsupported region %s', async region => {
    const response = await GET(new NextRequest(`http://localhost/api/rankings/vrs?region=${encodeURIComponent(region)}`));
    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('keeps the old URL compatible with the new contract', async () => {
    const response = await legacyGET(new NextRequest('http://localhost/api/home/vrs?region=ASIA'));
    expect(response.status).toBe(200);
    expect((await response.json())[0].name).toBe('Official Team');
  });
});
