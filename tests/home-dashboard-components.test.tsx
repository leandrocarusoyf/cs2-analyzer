import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeSidebar } from '../src/components/home/HomeSidebar';
import { HomeHeader } from '../src/components/home/HomeHeader';
import { LiveMatchesCarousel } from '../src/components/home/LiveMatchesCarousel';
import { FeaturedMatchCard } from '../src/components/home/FeaturedMatchCard';
import { ValveStandingsCard } from '../src/components/home/ValveStandingsCard';
import { NewsFeedCard, isChampionshipNews } from '../src/components/home/NewsFeedCard';
import { DemoUploadCard } from '../src/components/home/DemoUploadCard';
import { PlayerSearchCard } from '../src/components/home/PlayerSearchCard';
import { MOCK_VALVE_STANDINGS as VALVE_REGIONAL_STANDINGS } from '../src/data/mockData';
import type { MatchItem, NewsItem } from '../src/types/home-data';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const SAMPLE_MATCHES: MatchItem[] = [
  {
    id: 'm1',
    event_name: 'ESL PRO LEAGUE S20',
    status: 'live',
    match_format: 'BO3',
    series_score: '1-0',
    team1: { seriesScore: 1, mapScore: 7, name: 'FURIA', logo_url: null, rank: 1, flag: '🇧🇷' },
    team2: { seriesScore: 0, mapScore: 4, name: 'NAVI', logo_url: null, rank: 2, flag: '🇺🇦' },
    current_map: { name: 'Nuke', team1_rounds: 7, team2_rounds: 4 },
    scheduled_at: '2026-10-22T00:00:00Z',
  },
  {
    id: 'm2',
    event_name: 'IEM RIO 2026',
    status: 'upcoming',
    match_format: 'BO3',
    series_score: null,
    team1: { seriesScore: 0, mapScore: 0, name: 'Liquid', logo_url: null, rank: 9, flag: '🇺🇸' },
    team2: { seriesScore: 0, mapScore: 0, name: 'Complexity', logo_url: null, rank: 14, flag: '🇺🇸' },
    current_map: null,
    scheduled_at: '2026-10-22T19:30:00Z',
  },
];

const SAMPLE_NEWS: NewsItem[] = [
  {
    id: 'n1',
    title: 'FURIA avança aos playoffs do Major com grande atuação de FalleN',
    summary: 'O Professor lidera a equipe brasileira rumo aos playoffs.',
    cover_image_url: 'https://example.com/furia.jpg',
    published_at: '2026-10-22T00:00:00Z',
    source_url: 'https://www.dust2.com.br',
    category_tag: 'Campeonatos',
    tags: ['#FURIA', '#Major', '#Playoffs'],
    comments_count: 84,
    shares_count: 312,
  },
  {
    id: 'n2',
    title: 'Atualização do CS2: Mudanças no mapa Train e ajustes de granada',
    summary: 'Valve implementa novo skybox no bombsite A.',
    cover_image_url: 'https://example.com/train.jpg',
    published_at: '2026-10-21T23:00:00Z',
    source_url: 'https://store.steampowered.com',
    category_tag: 'Atualizações',
    tags: ['#Update', '#Valve'],
    comments_count: 142,
    shares_count: 89,
  },
  {
    id: 'n3',
    title: 'Análise tática dos utilitários de fumaça na Mirage',
    summary: 'Como alinhar as smashes de janela e passagem no CS2.',
    cover_image_url: null, // Fallback tático
    published_at: '2026-10-21T20:00:00Z',
    source_url: 'https://www.dust2.com.br',
    category_tag: 'Atualizações',
    tags: ['#Mirage', '#Smoke'],
    comments_count: 22,
    shares_count: 15,
  },
];

describe('Home Dashboard Dynamic Integration Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Layout Global e Casca (ESTÁTICO)', () => {
    it('deve renderizar a barra lateral com menus e telemetria de 128-tick sem estado dinâmico', () => {
      render(<HomeSidebar />);

      const analyzerText = screen.getByText('ANALYZER');
      expect(analyzerText).toBeTruthy();
      expect(screen.getByText('TACTICAL HUD')).toBeTruthy();

      const logoLink = analyzerText.closest('a');
      expect(logoLink).toBeTruthy();
      expect(logoLink?.getAttribute('href')).toBe('/');

      expect(screen.getByRole('link', { name: /home/i })).toBeTruthy();
      expect(screen.getByRole('link', { name: /match history/i })).toBeTruthy();
      expect(screen.getByRole('link', { name: /2d replayer/i })).toBeTruthy();
      expect(screen.getByRole('link', { name: /player stats/i })).toBeTruthy();
      expect(screen.getByRole('link', { name: /leaderboards/i })).toBeTruthy();

      expect(screen.getByText('SYSTEM TELEMETRY')).toBeTruthy();
      expect(screen.getByText('PARSER ENGINE')).toBeTruthy();
      expect(screen.getByText('128-TICK')).toBeTruthy();
      expect(screen.getByText('14ms')).toBeTruthy();
    });

    it('deve renderizar o header com sino de notificações e avatar', () => {
      render(<HomeHeader />);
      expect(screen.getByRole('button', { name: /notificações do sistema/i })).toBeTruthy();
      expect(screen.getByText('person')).toBeTruthy();
    });
  });

  describe('2. Live & Upcoming Matches (Barra Superior) (DINÂMICO)', () => {
    it('deve refletir o contador real de partidas LIVE e renderizar a lista da API', () => {
      render(<LiveMatchesCarousel matches={SAMPLE_MATCHES} />);

      expect(screen.getByText('LIVE & UPCOMING MATCHES')).toBeTruthy();
      expect(screen.getByText('VER TODOS')).toBeTruthy();

      // 1 partida live na amostra
      expect(screen.getByText('1 LIVE')).toBeTruthy();

      expect(screen.getByText('ESL PRO LEAGUE S20')).toBeTruthy();
      expect(screen.getByText('IEM RIO 2026')).toBeTruthy();
      expect(screen.getByText('FURIA')).toBeTruthy();
      expect(screen.getByText('NAVI')).toBeTruthy();
    });

    it('deve exibir mensagem de "Nenhuma partida no momento" quando lista for vazia (ex: 403 da HLTV)', () => {
      render(<LiveMatchesCarousel matches={[]} />);

      expect(screen.getByText('0 LIVE')).toBeTruthy();
      expect(screen.getByText('Nenhuma partida no momento')).toBeTruthy();
    });
  });

  describe('3. Partida em Destaque // Detalhes ao Vivo (Bloco Central) (DINÂMICO)', () => {
    it('deve renderizar a partida vinda dinamicamente da API', () => {
      render(<FeaturedMatchCard match={SAMPLE_MATCHES[0]} />);

      expect(screen.getByText(/PARTIDA EM DESTAQUE/i)).toBeTruthy();
      expect(screen.getByText('FURIA')).toBeTruthy();
      expect(screen.getByText('NAVI')).toBeTruthy();
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('0')).toBeTruthy();
      expect(screen.getAllByText(/DE_NUKE/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('2. DE_NUKE')).toBeTruthy();
      expect(screen.queryByText(/Gabriel.*FalleN/)).toBeNull();
      expect(screen.getByText('AO VIVO')).toBeTruthy();
    });

    it('deve exibir mensagem de nenhuma partida em destaque quando match for null', () => {
      render(<FeaturedMatchCard match={null} />);

      expect(screen.getByText('NENHUMA PARTIDA EM DESTAQUE NO MOMENTO')).toBeTruthy();
    });
  });

  describe('4. Valve Regional Standings (Lateral Direita) (DINÂMICO)', () => {
    it('deve exibir as abas SA, EU, NA e ÁSIA (sem APAC) e alternar regiões', () => {
      render(<ValveStandingsCard standingsByRegion={VALVE_REGIONAL_STANDINGS} />);

      expect(screen.getByText('VALVE REGIONAL STANDINGS')).toBeTruthy();

      // Abas obrigatórias: SA, EU, NA, ÁSIA
      expect(screen.getByRole('button', { name: 'SA' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'EU' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'NA' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'ÁSIA' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'APAC' })).toBeNull();

      // SA inicial
      expect(screen.getByText('SA REGIONAL • VALVE OFICIAL')).toBeTruthy();
      expect(screen.getByText('FURIA Esports')).toBeTruthy();

      // Alternar para ÁSIA
      fireEvent.click(screen.getByRole('button', { name: 'ÁSIA' }));
      expect(screen.getByText('ÁSIA REGIONAL • VALVE OFICIAL')).toBeTruthy();
      expect(screen.getByText('The MongolZ')).toBeTruthy();
      expect(screen.getByText('FlyQuest')).toBeTruthy();
    });
  });

  describe('5. Notícias & Novidades (Inferior Esquerdo) (DINÂMICO)', () => {
    it('deve conter apenas os filtros TODOS, CAMPEONATOS e ATUALIZAÇÕES e classificar conforme a diretriz', () => {
      render(<NewsFeedCard newsItems={SAMPLE_NEWS} />);

      // Apenas os 3 filtros permitidos
      expect(screen.getByRole('button', { name: 'TODOS' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'CAMPEONATOS' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'ATUALIZAÇÕES' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'TRANSFERÊNCIAS' })).toBeNull();

      // Todas as notícias exibidas inicialmente
      expect(screen.getByText(/FURIA avança aos playoffs do Major/i)).toBeTruthy();
      expect(screen.getByText(/Mudanças no mapa Train/i)).toBeTruthy();
      expect(screen.getByText(/Análise tática dos utilitários/i)).toBeTruthy();

      // Fallback tático renderizado para item com cover_image_url null
      expect(screen.getByText('INTEL REPORT // CS2')).toBeTruthy();

      // Filtro CAMPEONATOS: apenas notícia de campeonato
      fireEvent.click(screen.getByRole('button', { name: 'CAMPEONATOS' }));
      expect(screen.getByText(/FURIA avança aos playoffs do Major/i)).toBeTruthy();
      expect(screen.queryByText(/Mudanças no mapa Train/i)).toBeNull();
      expect(screen.queryByText(/Análise tática dos utilitários/i)).toBeNull();

      // Filtro ATUALIZAÇÕES: outras notícias
      fireEvent.click(screen.getByRole('button', { name: 'ATUALIZAÇÕES' }));
      expect(screen.queryByText(/FURIA avança aos playoffs do Major/i)).toBeNull();
      expect(screen.getByText(/Mudanças no mapa Train/i)).toBeTruthy();
      expect(screen.getByText(/Análise tática dos utilitários/i)).toBeTruthy();
    });

    it('testa a função auxiliar isChampionshipNews', () => {
      expect(isChampionshipNews(SAMPLE_NEWS[0])).toBe(true);
      expect(isChampionshipNews(SAMPLE_NEWS[1])).toBe(false);
      expect(isChampionshipNews(SAMPLE_NEWS[2])).toBe(false);
    });
  });

  describe('6. Upload de Demo & Busca (Inferior Direito) (INTERATIVO)', () => {
    it('deve reagir a eventos de drag/drop no upload de demo', () => {
      render(<DemoUploadCard />);

      expect(screen.getByText('PARTICIPAR DO ANALYZER')).toBeTruthy();
      const dropzone = screen.getByText('UPLOAD .DEM (DRAG-AND-DROP)').closest('div');
      expect(dropzone).toBeTruthy();

      if (dropzone) {
        fireEvent.dragOver(dropzone);
        const file = new File(['content'], 'match.dem', { type: 'application/octet-stream' });
        fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });
        expect(screen.getByText('ARQUIVO SELECIONADO')).toBeTruthy();
        expect(screen.getByText('match.dem')).toBeTruthy();
      }
    });

    it('deve permitir busca por texto e seleção de tags populares', () => {
      const onSearchMock = vi.fn();
      render(<PlayerSearchCard onSearch={onSearchMock} />);

      const input = screen.getByPlaceholderText(/Digite nick, Steam ID ou time/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'donk' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onSearchMock).toHaveBeenCalledWith('donk');

      fireEvent.click(screen.getByRole('button', { name: 'ZywOo' }));
      expect(onSearchMock).toHaveBeenCalledWith('ZywOo');
    });
  });
});
