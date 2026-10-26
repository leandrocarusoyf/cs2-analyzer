import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { HomeMatches } from '../src/components/home/HomeMatches';
import { LiveMatchesCarousel } from '../src/components/home/LiveMatchesCarousel';
import { ValveStandingsCard } from '../src/components/home/ValveStandingsCard';
import { MatchDetailsModal } from '../src/components/home/MatchDetailsModal';
import type { MatchDetails } from '../src/types/match-details';
import { getTeamRegion } from '../src/utils/teamRegions';
import type { MatchItem, ValveRegion, ValveStandingItem } from '../src/types/home-data';
const match: MatchItem = { id: '1', team1: { seriesScore: 1, mapScore: 0, name: 'FURIA', logo_url: null, rank: null }, team2: { seriesScore: 0, mapScore: 0, name: 'Imperial', logo_url: null, rank: null }, status: 'live', event_name: 'CCT', series_score: '1-0', current_map: null, match_format: 'BO3', scheduled_at: null };
const details: MatchDetails = { maps: ['DE_MIRAGE', 'DE_NUKE', 'DE_INFERNO'].map((name, i) => ({ number: i + 1, name, status: 'upcoming', score: null, team1: [], team2: [], rounds: [] })), team1Stats: [], team2Stats: [], mvp: null };
beforeEach(() => vi.stubGlobal('fetch', vi.fn(async () => Response.json(details))));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('Home match interactions', () => {
  it('renders map rounds with series wins and applies the requested missing-score fallback', () => {
    const view = render(<LiveMatchesCarousel matches={[{ ...match, team1: { ...match.team1, seriesScore: 0, mapScore: 8 }, team2: { ...match.team2, seriesScore: 1, mapScore: 10 }, team1_score: 0, team2_score: 0, series_score: '0-0' }]}/>);
    expect(screen.getByText('(0) - (1)')).toBeTruthy();
    expect(screen.getByText('8 - 10')).toBeTruthy();
    view.rerender(<LiveMatchesCarousel matches={[{ ...match, team1: { ...match.team1, seriesScore: 0 }, series_score: null }]}/>);
    expect(screen.getByText('(0) - (0)')).toBeTruthy();
    expect(screen.getByText('0 - 0')).toBeTruthy();
    view.rerender(<LiveMatchesCarousel matches={[{ ...match, status: 'upcoming', scheduled_label: '18:00' }]}/>);
    expect(screen.queryByLabelText('Placar do mapa e da série')).toBeNull();
  });
  it('highlights active map with cyan border and displays MVP or live fallback', async () => {
    const response: MatchDetails = { ...details, maps: details.maps.map((map, i) => ({ ...map, status: i === 0 ? 'finished' : i === 1 ? 'live' : 'upcoming', score: i === 0 ? '13 : 9' : i === 1 ? '7 : 10' : '0 : 0' })), mvp: { id: 'real', name: 'Real player', fullName: 'Real player', kills: 20, deaths: 10, adr: 90, kast: 80, rating: 1.4, ratingVersion: '3.0', mapNumber: 1, mapName: 'DE_MIRAGE' } };
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(response)));
    render(<MatchDetailsModal match={match} onClose={() => {}}/>);
    expect(await screen.findByText('Real player')).toBeTruthy();
    const live = screen.getByRole('button', { name: /2. DE_NUKE/ });
    const finished = screen.getByRole('button', { name: /1. DE_MIRAGE/ });
    const upcoming = screen.getByRole('button', { name: /3. DE_INFERNO/ });
    expect(finished.className).toContain('border-cyan-400');
    expect(within(live).getByText('AO VIVO')).toBeTruthy();
    expect(live.textContent).toContain('7 - 10');
    expect(upcoming.textContent).not.toContain('0 : 0');
    fireEvent.click(live);
    expect(screen.queryByText('Real player')).toBeNull();
    expect(screen.getByText('Aguardando término do mapa para definir o Destaque')).toBeTruthy();
    expect(live.className).toContain('border-cyan-400');
    expect(finished.className).toContain('border-outline-variant/50');
    fireEvent.click(finished);
    expect(screen.getByText('Real player')).toBeTruthy();
    expect(finished.className).toContain('border-cyan-400');
  });

  it('calculates MVP locally when match.mvp is absent and displays Name, Team, K-D, ADR, Rating', async () => {
    const responseWithoutMvp: MatchDetails = {
      maps: [
        {
          number: 1,
          name: 'DE_MIRAGE',
          status: 'finished',
          score: '13 : 9',
          team1: [
            { id: 'p1', name: 'stressarN', fullName: 'stressarN', kills: 24, deaths: 12, adr: 96.5, kast: 81.0, rating: 1.33 },
            { id: 'p2', name: 'chelo', kills: 18, deaths: 14, adr: 78.0, kast: 70.0, rating: 1.10 },
          ],
          team2: [
            { id: 'p3', name: 'vini', kills: 15, deaths: 16, adr: 68.0, kast: 65.0, rating: 0.95 },
          ],
          rounds: [],
        },
        {
          number: 2,
          name: 'DE_CACHE',
          status: 'live',
          score: '7 : 5',
          team1: [
            { id: 'p1', name: 'stressarN', kills: 14, deaths: 8, adr: 88.0, kast: 75.0, rating: 1.25 },
          ],
          team2: [
            { id: 'p3', name: 'vini', kills: 17, deaths: 9, adr: 102.0, kast: 80.0, rating: 1.45 },
          ],
          rounds: [],
        },
        {
          number: 3,
          name: 'DE_ANCIENT',
          status: 'upcoming',
          score: null,
          team1: [],
          team2: [],
          rounds: [],
        },
      ],
      team1Stats: [],
      team2Stats: [],
      mvp: null,
    };

    vi.stubGlobal('fetch', vi.fn(async () => Response.json(responseWithoutMvp)));
    render(<MatchDetailsModal match={match} onClose={() => {}} />);

    // Map 1 is initially active: stressarN has highest rating (1.33)
    expect((await screen.findAllByText('stressarN')).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('FURIA').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('24-12').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('96.5').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1.33').length).toBeGreaterThanOrEqual(1);

    const map1Btn = screen.getByRole('button', { name: /1. DE_MIRAGE/ });
    const map2Btn = screen.getByRole('button', { name: /2. DE_CACHE/ });
    const map3Btn = screen.getByRole('button', { name: /3. DE_ANCIENT/ });

    expect(map1Btn.className).toContain('border-cyan-400');

    // Click Map 2 (DE_CACHE): vini has highest rating (1.45) on Imperial
    fireEvent.click(map2Btn);
    expect(map2Btn.className).toContain('border-cyan-400');
    expect(map1Btn.className).toContain('border-outline-variant/50');
    expect((await screen.findAllByText('vini')).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Imperial').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1.45').length).toBeGreaterThanOrEqual(1);

    // Click Map 3 (DE_ANCIENT): upcoming map with no stats
    fireEvent.click(map3Btn);
    expect(map3Btn.className).toContain('border-cyan-400');
    expect(screen.getByText(/Aguardando início do mapa para definir o Destaque|Aguardando término/)).toBeTruthy();
  });
  it('opens the same modal from the featured card and repeatedly from different carousel cards', async () => {
    const second = { ...match, id: '2', team1: { ...match.team1, name: 'M80' } };
    render(<HomeMatches matches={[match, second]} featuredMatch={match}/>);
    const featured = screen.getByRole('button', { name: 'Abrir detalhes da partida em destaque' });
    featured.focus(); fireEvent.click(featured);
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    await screen.findByText('1. DE_MIRAGE');
    fireEvent.click(screen.getByRole('button', { name: 'Fechar detalhes da partida' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(featured);
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalhes de M80 contra Imperial' }));
    await screen.findByText('1. DE_MIRAGE');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(within(screen.getByRole('dialog')).getAllByText('M80').length).toBeGreaterThan(0);
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalhes de FURIA contra Imperial' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    await screen.findByText('1. DE_MIRAGE');
    expect(fetch).toHaveBeenCalledWith('/api/match-details?url=2', expect.any(Object));
  });
  it('opens details by clicking the featured card body and does not emit list key warnings', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const missingId = { ...match, id: '' };
      render(<HomeMatches matches={[missingId, missingId]} featuredMatch={match}/>);
      const featured = screen.getByRole('button', { name: 'Abrir detalhes da partida em destaque' });
      fireEvent.click(featured.parentElement!);
      expect(screen.getAllByRole('dialog')).toHaveLength(1);
      await screen.findByText('1. DE_MIRAGE');
      fireEvent.click(screen.getByRole('button', { name: 'Fechar detalhes da partida' }));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(consoleError.mock.calls.flat().join(' ')).not.toMatch(/unique.*key|same key/i);
    } finally { consoleError.mockRestore(); }
  });
  it('uses nested team scores in preference to stale legacy fields in both entry points', () => {
    const scored = { ...match, team1: { ...match.team1, seriesScore: 1, mapScore: 8 }, team2: { ...match.team2, seriesScore: 0, mapScore: 10 }, team1_score: 0, team2_score: 0, series_score: '0-0' };
    render(<HomeMatches matches={[scored]} featuredMatch={scored}/>);
    expect(screen.getAllByText('8 - 10')).toHaveLength(2);
    expect(screen.getByText('(1) - (0)')).toBeTruthy();
  });
  it('resolves regions without case sensitivity and handles unknown names', () => {
    expect(getTeamRegion(' furia ')).toBe('BRASIL');
    expect(getTeamRegion('Unknown')).toBe('TBD');
  });
  it('limits the initial row, expands every match and opens/closes details with restored focus', async () => {
    render(<HomeMatches matches={Array.from({ length: 7 }, (_, i) => ({ ...match, id: String(i) }))} featuredMatch={match}/>);
    expect(screen.getAllByRole('button', { name: /Ver detalhes/ })).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: /VER TODOS/ }));
    expect(screen.getAllByRole('button', { name: /Ver detalhes/ })).toHaveLength(7);
    const card = screen.getAllByRole('button', { name: /Ver detalhes/ })[0];
    card.focus(); fireEvent.click(card);
    const dialog = screen.getByRole('dialog');
    expect(screen.getByRole('status').textContent).toContain('Carregando');
    await within(dialog).findByText('1. DE_MIRAGE');
    expect(fetch).toHaveBeenCalledWith('/api/match-details?url=0', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(screen.queryByText(/Demonstração visual/)).toBeNull();
    const close = within(dialog).getByRole('button', { name: 'Fechar detalhes da partida' });
    const lastMap = within(dialog).getByRole('button', { name: /3. DE_INFERNO/ });
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastMap);
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    expect(within(dialog).getByText('1. DE_MIRAGE')).toBeTruthy();
    expect(within(dialog).getAllByRole('table')).toHaveLength(2);
    fireEvent.click(within(dialog).getByRole('button', { name: /3. DE_INFERNO/ }));
    expect(within(dialog).getByText('Nenhum round registrado neste mapa.')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(card);
    expect(document.body.style.overflow).toBe('');
  });
  it('recovers from fetch errors using retry without any mock fallback', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(Response.json(details));
    vi.stubGlobal('fetch', fetchMock);
    render(<MatchDetailsModal match={match} onClose={() => {}}/>);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('FalleN')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('1. DE_MIRAGE')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('aborts a pending request when closed', () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => { signal = init.signal as AbortSignal; return new Promise(() => {}); }));
    const view = render(<MatchDetailsModal match={match} onClose={() => {}}/>);
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });
  it('supports absent MVP and maps and closes on backdrop', async () => {
    const close = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ maps: [], team1Stats: [], team2Stats: [], mvp: null })));
    render(<MatchDetailsModal match={{ ...match, status: 'upcoming' }} onClose={close}/>);
    expect(await screen.findByText('Mapas ainda não disponíveis.')).toBeTruthy();
    expect(screen.getAllByText('Estatísticas indisponíveis antes do início da partida')).toHaveLength(2);
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(close).toHaveBeenCalledOnce();
  });
});
describe('Ranking disclosure', () => {
  it('deduplicates Americas in GERAL, sorts by points, expands and groups the top ten', () => {
    const teams: ValveStandingItem[] = Array.from({ length: 12 }, (_, i) => ({ rank: i + 1, name: `Team ${i}`, code: `T${i}`, tier: '', points: 2000 - i * 50, change: 0, change_type: 'neutral' }));
    const data: Record<ValveRegion, ValveStandingItem[]> = { SA: teams, NA: teams, EU: [{ ...teams[0], name: 'European leader', points: 3000 }], ASIA: [] };
    render(<ValveStandingsCard standingsByRegion={data}/>);
    expect(screen.queryByText('Team 5')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'VER TABELA COMPLETA (TOP 10)' }));
    expect(screen.getByText('Team 9')).toBeTruthy();
    expect(screen.queryByText('Team 10')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar elegíveis para o prox major' }));
    expect(screen.getByRole('region', { name: 'Legends' }).className).toContain('border-yellow-500/50');
    expect(screen.getByRole('region', { name: 'Challengers' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Contenders' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'GERAL' }));
    expect(screen.getByText('European leader')).toBeTruthy();
    expect(screen.getAllByText('Team 0')).toHaveLength(1);
    expect(screen.queryByRole('region', { name: 'Legends' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'VER APENAS TOP 5' }));
    expect(screen.queryByText('Team 4')).toBeNull();
  });
});
