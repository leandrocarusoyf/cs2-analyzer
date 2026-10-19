import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../src/app/api/liquipedia/route.ts';
import * as liquipediaModule from '../src/lib/liquipedia.ts';

describe('Liquipedia Server-Side Proxy Route Handler (GET /api/liquipedia)', () => {
  it('retorna erro 400 se parâmetros "type" ou "name" estiverem ausentes', async () => {
    const req = new NextRequest('http://localhost:3000/api/liquipedia');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it('retorna informações do time via type=team resolvendo pelo asset local', async () => {
    const req = new NextRequest('http://localhost:3000/api/liquipedia?type=team&name=Liquid');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.teamName).toBe('Liquid');
    expect(json.logoUrl).toBe('/teams/liquid.svg');
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=86400');
  });

  it('retorna informações do time desconhecido via fallback à API da Liquipedia', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        query: {
          pages: {
            '1': {
              imageinfo: [{ url: 'https://liquipedia.net/unknown_team_logo.svg' }],
            },
          },
        },
      }),
    } as unknown as Response);

    const req = new NextRequest('http://localhost:3000/api/liquipedia?type=team&name=UnknownEsportsTeam');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.teamName).toBe('UnknownEsportsTeam');
    expect(json.logoUrl).toBe('https://liquipedia.net/unknown_team_logo.svg');
  });

  it('retorna informações do jogador via type=player resolvendo pelo asset local', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/liquipedia?type=player&name=KSCERATO&team=FURIA',
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.playerNickname).toBe('KSCERATO');
    expect(json.avatarUrl).toBe('/players/kscerato.png');
  });
});

