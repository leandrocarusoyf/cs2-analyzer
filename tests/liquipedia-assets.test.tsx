import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  parseTeamLogoResponse,
  parsePlayerImageResponse,
  createLiquipediaClient,
  slugifyTeam,
  liquipedia,
  LIQUIPEDIA_HEADERS,
  LIQUIPEDIA_CACHE_TTL_MS,
} from '../src/lib/liquipedia.ts';
import { PlayerAvatar } from '../src/components/stats/PlayerAvatar.tsx';
import { OpponentLogo } from '../src/components/stats/OpponentLogo.tsx';
import { TabIntro } from '../src/components/stats/TabIntro.tsx';
import { RecentPerformanceChart } from '../src/components/stats/RecentPerformanceChart.tsx';

const okResponse = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

describe('Liquipedia parsing & service', () => {
  it('extrai a URL do logo via imageinfo e ignora páginas ausentes', () => {
    expect(
      parseTeamLogoResponse({
        query: { pages: { '1': { imageinfo: [{ url: 'https://liquipedia.net/a.svg', mime: 'image/svg+xml' }] } } },
      }),
    ).toBe('https://liquipedia.net/a.svg');
    expect(parseTeamLogoResponse({ query: { pages: { '-1': { missing: '' } } } })).toBeNull();
    expect(parseTeamLogoResponse(null)).toBeNull();
  });

  it('extrai a foto do jogador priorizando thumbnail', () => {
    expect(
      parsePlayerImageResponse({
        query: { pages: { '5': { thumbnail: { source: 'https://upload.wikimedia.org/t.png' } } } },
      }),
    ).toBe('https://upload.wikimedia.org/t.png');
    expect(parsePlayerImageResponse({})).toBeNull();
  });

  it('envia headers obrigatórios, usa cache com TTL e refaz após expirar', async () => {
    let t = 1000;
    const fetchImpl = vi.fn(async () =>
      okResponse({ query: { pages: { '1': { imageinfo: [{ url: 'https://liquipedia.net/f.svg' }] } } } }),
    );
    const client = createLiquipediaClient({ fetchImpl, now: () => t });

    const first = await client.getOpponentLogo('Team Liquid');
    expect(first.teamSlug).toBe(slugifyTeam('Team Liquid'));
    expect(first.logoUrl).toBe('https://liquipedia.net/f.svg');
    expect((fetchImpl.mock.calls[0] as any)[1]).toEqual({ headers: LIQUIPEDIA_HEADERS });

    await client.getOpponentLogo('Team Liquid');
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    t += LIQUIPEDIA_CACHE_TTL_MS + 1;
    await client.getOpponentLogo('Team Liquid');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('resolve logos e avatares via assets locais e CDN aberta', async () => {
    const { getTeamCdnLogoUrl, liquipedia } = await import('../src/lib/liquipedia.ts');
    expect(getTeamCdnLogoUrl('FURIA')).toBe(
      'https://cdn.jsdelivr.net/gh/lootmarket/esport-team-logos@master/csgo/furia/furia-logo.png',
    );
    expect(getTeamCdnLogoUrl('Team Liquid')).toBe(
      'https://cdn.jsdelivr.net/gh/lootmarket/esport-team-logos@master/csgo/team-liquid/team-liquid-logo.png',
    );
    expect(getTeamCdnLogoUrl('Natus Vincere')).toBe(
      'https://cdn.jsdelivr.net/gh/lootmarket/esport-team-logos@master/csgo/natus-vincere/natus-vincere-logo.png',
    );

    // O client padrão de produção prioriza assets locais instantâneos
    const furiaLogo = await liquipedia.getOpponentLogo('FURIA');
    expect(furiaLogo.logoUrl).toBe('/teams/furia.svg');
    const ksceratoProfile = await liquipedia.getPlayerProfile('kscerato');
    expect(ksceratoProfile.avatarUrl).toBe('/players/kscerato.png');
  });

  it('retorna null sem lançar em 403/429 ou erro de rede', async () => {
    const forbidden = createLiquipediaClient({
      fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({}) }),
    });
    expect((await forbidden.getOpponentLogo('FaZe')).logoUrl).toBeNull();
    expect((await forbidden.getPlayerProfile('NiKo')).avatarUrl).toBeNull();

    const failing = createLiquipediaClient({
      fetchImpl: async () => {
        throw new Error('network');
      },
    });
    expect((await failing.getPlayerProfile('NiKo')).avatarUrl).toBeNull();
  });
});

describe('Fallback visual states', () => {
  afterEach(() => cleanup());

  it('PlayerAvatar aponta para /players/{slug}.png e mostra fallback após erro de carregamento', () => {
    const { unmount } = render(<PlayerAvatar playerName="kscerato" avatarUrl={null} />);
    expect(screen.getByTestId('player-avatar-fallback').textContent).toBe('KS');
    unmount();

    render(<PlayerAvatar playerName="kscerato" avatarUrl="/players/kscerato.png" />);
    const img = screen.getByAltText('kscerato profile picture');
    expect(img.getAttribute('src')).toContain('kscerato.png');
    fireEvent.error(img);
    expect(screen.getByTestId('player-avatar-fallback')).toBeTruthy();
  });

  it('OpponentLogo aponta para /teams/{slug}.svg e mostra fallback quando falha ou vazio', () => {
    const { unmount } = render(<OpponentLogo opponentTeam="Vitality" logoUrl="" />);
    expect(screen.getByTestId('opponent-logo-fallback').textContent).toBe('V');
    unmount();

    // Renderiza diretamente o SVG local
    render(<OpponentLogo opponentTeam="Vitality" opponentSlug="vitality" />);
    const img = screen.getByAltText('Vitality logo');
    expect(img.getAttribute('src')).toBe('/teams/vitality.svg');
    expect(img.getAttribute('loading')).toBe('lazy');
    fireEvent.error(img);
    expect(screen.getByTestId('opponent-logo-fallback')).toBeTruthy();
  });
});

describe('Empty analytics do not fabricate players', () => {
 afterEach(()=>cleanup());
 it('requests a selection instead of a fixed player',()=>{render(<TabIntro/>);expect(screen.getByText(/Selecione um jogador/)).toBeTruthy();});
 it('does not render fake opponent logos',()=>{render(<RecentPerformanceChart telemetryData={[]}/>);expect(screen.queryByAltText('Liquid logo')).toBeNull();});
});
