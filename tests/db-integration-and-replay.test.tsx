import React from 'react';
import { describe, it, expect, afterAll, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { pool, query, closeDbPool } from '../src/lib/db.ts';
import { getRecentMatches, getPlayerPerformance, getMatchById } from '../src/lib/queries/matches.ts';
import { GET as replayRouteHandler } from '../src/app/api/replays/[id]/route.ts';
import { GET as matchesRouteHandler } from '../src/app/api/matches/[id]/route.ts';
import ReplayerPage from '../src/app/replayer/[id]/page.tsx';
import { PlayerStatsTable } from '../src/components/stats/PlayerStatsTable.tsx';
import { TabIntro } from '../src/components/stats/TabIntro.tsx';
import zlib from 'node:zlib';

describe('Integração PostgreSQL Local, Queries e Streaming de Telemetria (.bin.gz)', () => {
  afterAll(async () => {
    cleanup();
    await closeDbPool();
  });

  it('1. CONFIGURAÇÃO DE ACESSO AO BANCO: Conecta com sucesso ao PostgreSQL local usando pool singleton', async () => {
    expect(pool).toBeDefined();
    const res = await query('SELECT 1 as connected;');
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].connected).toBe(1);
  });

  it('2. QUERIES DE PARTIDAS: getRecentMatches() retorna a partida FURIA 13 x 10 Aurora (de_inferno) com 23 rounds', async () => {
    const matches = await getRecentMatches(10);
    expect(matches.length).toBeGreaterThan(0);

    const furiaMatch = matches.find(
      (m) =>
        (m.team1 === 'FURIA' && m.team2 === 'Aurora') ||
        (m.team1 === 'Aurora' && m.team2 === 'FURIA'),
    );

    expect(furiaMatch).toBeDefined();
    expect(furiaMatch?.winner).toBe('FURIA');
    expect(furiaMatch?.score_t1).toBe(13);
    expect(furiaMatch?.score_t2).toBe(10);
    expect(furiaMatch?.map_name).toBe('de_inferno');
    expect(furiaMatch?.rounds_count).toBe(23);
    expect(furiaMatch?.players).toHaveLength(10);
  });

  it('2.1 QUERY INDIVIDUAL DE PARTIDA: getMatchById() retorna a partida FURIA 13 x 10 Aurora pelo ID e demo_hash', async () => {
    const matchId = '54e43847-2490-4751-9981-831bf7cf367c';
    const match = await getMatchById(matchId);
    expect(match).not.toBeNull();
    expect(match?.team1).toBe('FURIA');
    expect(match?.team2).toBe('Aurora');
    expect(match?.score_t1).toBe(13);
    expect(match?.score_t2).toBe(10);
    expect(match?.map_name).toBe('de_inferno');
    expect(match?.replay_path).toContain('furia-vs-aurora-m2-inferno.bin.gz');
    expect(match?.players).toHaveLength(10);
  });

  it('2.2 ROTA DE METADADOS: /api/matches/[id] responde com JSON 200 e dados completos do PostgreSQL', async () => {
    const matchId = '54e43847-2490-4751-9981-831bf7cf367c';
    const req = new Request(`http://localhost:3000/api/matches/${matchId}`);
    const res = await matchesRouteHandler(req, {
      params: Promise.resolve({ id: matchId }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.match).toBeDefined();
    expect(body.match.team1).toBe('FURIA');
    expect(body.match.team2).toBe('Aurora');
    expect(body.match.map_name).toBe('de_inferno');
    expect(body.match.players).toHaveLength(10);
  });

  it('2. QUERIES DE PARTIDAS: getPlayerPerformance() extrai o histórico do KSCERATO e metrics_json consolidado (CT, TR, Overall)', async () => {
    const ksceratoSteamId = '76561198058500492';
    const perf = await getPlayerPerformance(ksceratoSteamId);

    expect(perf).not.toBeNull();
    expect(perf?.nickname).toBe('KSCERATO');
    expect(perf?.team).toBe('FURIA');
    expect(perf?.currentRating).toBe(1.22);
    expect(perf?.adr).toBe(113.7);
    expect(perf?.ttd).toBeNull();
    expect(perf?.ttk).toBe(327);
    expect(perf?.fsp).toBe(100);

    // Validação de métricas consolidadas (CT, TR, Overall)
    expect(perf?.telemetry.length).toBeGreaterThan(0);
    const lastTelemetry = perf?.telemetry[perf.telemetry.length - 1];
    expect(lastTelemetry?.opponentTeam).toBe('Aurora');
    expect(lastTelemetry?.mapName).toBe('INFERNO');
    expect(lastTelemetry?.score).toBe('13 - 10');
    expect(lastTelemetry?.result).toBe('W');

    const metrics = lastTelemetry?.metrics;
    expect(metrics?.hltv.overall).toBe(1.22);
    expect(metrics?.hltv.ct).toBe(0.95);
    expect(metrics?.hltv.t).toBe(1.47);

    expect(metrics?.adr.overall).toBe(113.7);
    expect(metrics?.adr.ct).toBe(85.7);
    expect(metrics?.adr.t).toBe(139.3);
  });

  it('3. ROTA DE STREAMING DA TELEMETRIA 2D: /api/replays/[id] envia o stream do .bin.gz com cabeçalhos gzip e octet-stream', async () => {
    const matchId = '54e43847-2490-4751-9981-831bf7cf367c';
    const req = new Request(`http://localhost:3000/api/replays/${matchId}`);
    const res = await replayRouteHandler(req, {
      params: Promise.resolve({ id: matchId }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/octet-stream');
    expect(res.headers.get('Content-Encoding')).toBeNull();

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    expect(buffer.length).toBeGreaterThan(0);

    // Descompressão do buffer para verificar integridade do payload
    const decompressedJson = JSON.parse(zlib.gunzipSync(buffer).toString('utf8'));
    expect(decompressedJson.map).toBe('de_inferno');
    expect(decompressedJson.rounds).toHaveLength(23);
    expect(decompressedJson.playersManifest).toHaveLength(10);
  });

  it('3.1 TESTE DE PONTA A PONTA: /replayer/54e43847-2490-4751-9981-831bf7cf367c renderiza mapa, 10 jogadores, granadas e KillFeed sem erro de runtime', async () => {
    const matchId = '54e43847-2490-4751-9981-831bf7cf367c';
    const req = new Request(`http://localhost:3000/api/replays/${matchId}`);
    const res = await replayRouteHandler(req, {
      params: Promise.resolve({ id: matchId }),
    });
    const arrayBuffer = await res.arrayBuffer();
    const decompressedJson = JSON.parse(zlib.gunzipSync(Buffer.from(arrayBuffer)).toString('utf8'));

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      if (String(url).includes(matchId)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(decompressedJson),
        } as Response);
      }
      return Promise.reject(new Error(`Unexpected url: ${url}`));
    });

    try {
      await act(async () => {
        render(
          <React.Suspense fallback={null}>
            <ReplayerPage params={Promise.resolve({ id: matchId })} />
          </React.Suspense>,
        );
      });

      // Elementos essenciais do Replayer tático 2D
      expect(screen.getByTestId('radar-canvas')).toBeTruthy();
      expect(screen.getByTestId('kill-feed')).toBeTruthy();
      expect(screen.getByTestId('roster-block-top')).toBeTruthy();
      expect(screen.getByTestId('roster-block-bottom')).toBeTruthy();

      // Timeline deve conter os 23 rounds da partida FURIA 13 x 10 Aurora
      expect(screen.getByTestId('round-btn-23')).toBeTruthy();

      // Cores dos rounds: CT (#2563EB) e TR (#EA580C)
      const btnRound1 = screen.getByTestId('round-btn-1'); // T venceu (FURIA)
      const btnRound2 = screen.getByTestId('round-btn-2'); // CT venceu (Aurora)
      const btnRound13 = screen.getByTestId('round-btn-13'); // CT venceu (FURIA)
      const btnRound14 = screen.getByTestId('round-btn-14'); // T venceu (Aurora)
      const btnRound23 = screen.getByTestId('round-btn-23'); // CT venceu (FURIA fecha 13x10)

      expect(btnRound1.getAttribute('data-winner-color')).toBe('#EA580C');
      expect(btnRound2.getAttribute('data-winner-color')).toBe('#2563EB');
      expect(btnRound13.getAttribute('data-winner-color')).toBe('#2563EB');
      expect(btnRound14.getAttribute('data-winner-color')).toBe('#EA580C');
      expect(btnRound23.getAttribute('data-winner-color')).toBe('#2563EB');

      // Jogadores da demo oficial de_inferno devem estar no documento
      expect(screen.getByText('KSCERATO')).toBeTruthy();
      expect(screen.getByText('XANTARES')).toBeTruthy();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('4. TRATAMENTO DE VALORES NULOS (TTD): PlayerStatsTable exibe um traço "—" quando ttd for null', () => {
    const samplePlayers = [
      {
        steamId: '76561198058500492',
        nickname: 'KSCERATO',
        team: 'FURIA',
        rating: 1.22,
        kd: 1.23,
        adr: 113.7,
        kast: 65.2,
        ttk: 327,
        ttd: null,
        fsp: 100,
        kills: 16,
        deaths: 13,
      },
      {
        steamId: '76561198044118796',
        nickname: 'XANTARES',
        team: 'Aurora',
        rating: 1.29,
        kd: 1.31,
        adr: 85.6,
        kast: 82.6,
        ttk: 184,
        ttd: null,
        fsp: 100,
        kills: 17,
        deaths: 13,
      },
    ];

    render(<PlayerStatsTable players={samplePlayers} />);

    // Ambos os jogadores possuem ttd null, deve renderizar o traço "—"
    const ksceratoTtdCell = screen.getByTestId('player-ttd-76561198058500492');
    const xantaresTtdCell = screen.getByTestId('player-ttd-76561198044118796');

    expect(ksceratoTtdCell.textContent?.trim()).toBe('—');
    expect(xantaresTtdCell.textContent?.trim()).toBe('—');

    // Foco em TTK, FSP, Rating e K/D
    const row = screen.getByTestId('player-row-76561198058500492');
    expect(row.textContent).toContain('327 ms');
    expect(row.textContent).toContain('100.0%');
    expect(row.textContent).toContain('1.22');
    expect(row.textContent).toContain('1.23');
  });

  it('4. TRATAMENTO DE VALORES NULOS (TTD): TabIntro exibe "—" para TTD nulo e destaca a partida real FURIA 13 x 10 Aurora', () => {
    render(<TabIntro />);

    const ttdElement = screen.getByTestId('player-ttd');
    expect(ttdElement.textContent?.trim()).toBe('—');

    // Exibe o placar e confronto real
    expect(screen.getByText('FURIA 13 x 10 Aurora')).toBeTruthy();
  });
});
