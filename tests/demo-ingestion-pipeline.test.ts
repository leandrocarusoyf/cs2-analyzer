import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, access, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {
  processDemoFile,
  computeMatchPlayerMetrics,
  extractRawDemoWithParser,
  buildTaxonomyPath,
  extractMapIdentifier,
  generateDeterministicSeriesId,
} from '../scripts/process-demo.mjs';
import {
  syncMatchAssets,
  extractMatchEntities,
  buildTacticalTeamSvg,
  buildTacticalPlayerPng,
} from '../scripts/sync-match-assets.mjs';
import { getSavedRecentTelemetry } from './fixtures/recent-performance-mock.ts';

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

describe('Pipeline de Ingestão de Demos (PostgreSQL Local + .bin.gz + Exclusão Incondicional)', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'cs2-demo-pipeline-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('constrói corretamente a taxonomia de pastas de replay (YYYY/DD-MM-YYYY/TimeA_vs_TimeB)', () => {
    const tax = buildTaxonomyPath({
      demFilePath: '/demos/furia-vs-imperial.dem',
      playedAt: '2026-10-17T19:00:00.000Z',
      team1: 'FURIA',
      team2: 'Imperial',
      baseDir: './data/replays',
    });

    expect(tax.dir).toBe('data/replays/2026/17-10-2026/FURIA_vs_Imperial');
    expect(tax.filePath).toBe('data/replays/2026/17-10-2026/FURIA_vs_Imperial/furia-vs-imperial.bin.gz');
    expect(tax.fileName).toBe('furia-vs-imperial.bin.gz');
  });



  it('suporta extração direta via adaptador demoparser2 (parseHeader, parseEvent, parseTicks)', async () => {
    const demPath = path.join(tmpDir, 'binary-source2.dem');
    const replaysDir = path.join(tmpDir, 'replays');
    const publicDir = path.join(tmpDir, 'public');
    await writeFile(demPath, Buffer.from('PBDEMS2_BINARY_CONTENT'));

    const mockDemoParser2 = {
      parseHeader: vi.fn().mockReturnValue({
        map_name: 'de_nuke',
        tickrate: 64,
        team_ct_name: 'Vitality',
        team_t_name: 'MOUZ',
      }),
      parseEvent: vi.fn((_path: string, eventName: string) => {
        if (eventName === 'round_end') {
          return [{ round: 1, start_tick: 1000, tick: 2000, winner: 'CT', reason: 'ct_win_elimination' }];
        }
        if (eventName === 'player_death') {
          return [
            {
              tick: 1500,
              attacker_steamid: '76561198000000111',
              attacker_name: 'ZywOo',
              user_steamid: '76561198000000222',
              user_name: 'torzsi',
              weapon_id: 9,
              headshot: true,
            },
          ];
        }
        if (eventName === 'player_hurt') {
          return [
            {
              tick: 1490,
              attacker_steamid: '76561198000000111',
              user_steamid: '76561198000000222',
              dmg_health: 100,
              hitgroup: 'head',
              weapon_id: 9,
            },
          ];
        }
        return [];
      }),
      parseTicks: vi.fn().mockReturnValue([
        {
          steamid: '76561198000000111',
          name: 'ZywOo',
          team_num: 3,
          team_clan_name: 'Vitality',
        },
        {
          steamid: '76561198000000222',
          name: 'torzsi',
          team_num: 2,
          team_clan_name: 'MOUZ',
        },
      ]),
    };

    const mockDb = {
      query: vi.fn().mockResolvedValue({ rows: [{ id: 'match-vitality-mouz' }] }),
    };

    const res = await processDemoFile(demPath, {
      demoparser: mockDemoParser2,
      dbClient: mockDb,
      replaysBaseDir: replaysDir,
      storeFilePath: null,
      assetOptions: {
        publicDir,
        fetchImpl: vi.fn().mockResolvedValue({ ok: false, status: 404 }),
      },
    });

    expect(mockDemoParser2.parseHeader).toHaveBeenCalledWith(demPath);
    expect(res.matchRecord.map_name).toBe('de_nuke');
    expect(res.matchRecord.team_ct_name).toBe('Vitality');
    expect(res.matchRecord.team_t_name).toBe('MOUZ');
    expect(await exists(demPath)).toBe(true);
    expect(await exists(path.join(publicDir, 'teams', 'vitality.svg'))).toBe(true);
    expect(await exists(path.join(publicDir, 'teams', 'mouz.svg'))).toBe(true);
    expect(await exists(path.join(publicDir, 'players', 'zywoo.png'))).toBe(true);
    expect(await exists(path.join(publicDir, 'players', 'torzsi.png'))).toBe(true);
  });

  it('baixa o avatar oficial via Steam Web API usando SteamID64 quando disponível', async () => {
    const publicDir = path.join(tmpDir, 'public');
    const fakePngBytes = buildTacticalPlayerPng('DONK');

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('api.steampowered.com')) {
        return {
          ok: true,
          json: async () => ({
            response: {
              players: [{ avatarfull: 'https://avatars.steamstatic.com/donk_full.png' }],
            },
          }),
        };
      }
      if (url.includes('avatars.steamstatic.com')) {
        return {
          ok: true,
          arrayBuffer: async () =>
            fakePngBytes.buffer.slice(
              fakePngBytes.byteOffset,
              fakePngBytes.byteOffset + fakePngBytes.byteLength,
            ),
        };
      }
      return { ok: false, status: 404 };
    });

    const syncRes = await syncMatchAssets(
      {
        teamCtName: 'Spirit',
        teamTName: 'FaZe',
        players: [{ steamId: '76561198386265483', name: 'donk' }],
      },
      {
        publicDir,
        steamApiKey: 'TEST_STEAM_KEY',
        fetchImpl: fetchMock,
      },
    );

    expect(syncRes.players[0].status).toBe('downloaded');
    expect(await exists(path.join(publicDir, 'players', 'donk.png'))).toBe(true);
  });

  it('descarta warmup/knife, encerra no MR12 em 13x10 (23 rounds) e mapeia FURIA vencedora contra Aurora', async () => {
    const demPath = path.join(tmpDir, 'furia-vs-aurora-m2-inferno.dem');
    await writeFile(demPath, Buffer.from('FAKE_DEMO_BYTES'));

    // Simula demo oficial com:
    // - Warmup tick 0 e Knife round terminando no tick 10000
    // - round_announce_match_start no tick 11000
    // - 23 rounds oficiais onde FURIA começa de T e fecha em 13 x 10 no round 23
    // - Rounds extras pós-vitória (ticks > 210000) que DEVEM ser descartados
    const consoleSpy = vi.spyOn(console, 'log');

    // 23 rounds oficiais:
    // Rounds 1-12 (FURIA é T, Aurora é CT):
    // R1: CT (Aurora) -> FURIA 0 x 1 Aurora
    // R2-4: T (FURIA) -> FURIA 3 x 1 Aurora
    // R5: CT (Aurora) -> FURIA 3 x 2 Aurora
    // R6-7: T (FURIA) -> FURIA 5 x 2 Aurora
    // R8-9: CT (Aurora) -> FURIA 5 x 4 Aurora
    // R10-12: T (FURIA) -> FURIA 8 x 4 Aurora
    // Halftime: FURIA 8 x 4 Aurora
    // Rounds 13-23 (FURIA troca para CT, Aurora troca para T):
    // R13: CT (FURIA) -> FURIA 9 x 4 Aurora
    // R14-15: T (Aurora) -> FURIA 9 x 6 Aurora
    // R16: CT (FURIA) -> FURIA 10 x 6 Aurora
    // R17-20: T (Aurora) -> FURIA 10 x 10 Aurora
    // R21-23: CT (FURIA) -> FURIA 13 x 10 Aurora (Fim em 13x10 no round 23!)
    const officialWinners = [
      'CT', // R1: Aurora
      'T', 'T', 'T', // R2-4: FURIA
      'CT', // R5: Aurora
      'T', 'T', // R6-7: FURIA
      'CT', 'CT', // R8-9: Aurora
      'T', 'T', 'T', // R10-12: FURIA
      // Half time: FURIA 8 x 4 Aurora
      'CT', // R13: FURIA
      'T', 'T', // R14-15: Aurora
      'CT', // R16: FURIA
      'T', 'T', 'T', 'T', // R17-20: Aurora
      'CT', 'CT', 'CT', // R21-23: FURIA fecha em 13x10!
    ];

    const roundEnds = [
      // Warmup / Knife round (devem ser descartados pois tick <= 11000)
      { tick: 0, winner: 'T', reason: 'elimination' },
      { tick: 10000, winner: 'T', reason: 'ct_killed' },
      // 23 rounds oficiais
      ...officialWinners.map((w, idx) => ({
        tick: 15000 + idx * 8000,
        winner: w,
        reason: w === 'CT' ? 'ct_win_elimination' : 'target_bombed',
      })),
      // Rounds extras pós-vitória (devem ser ignorados pela condição MR12)
      { tick: 220000, winner: 'CT', reason: 'ct_win_elimination' },
      { tick: 230000, winner: 'CT', reason: 'ct_win_elimination' },
    ];

    const mockParser = {
      parseHeader: vi.fn().mockReturnValue({
        map_name: 'de_inferno',
        tickrate: 64,
        team_ct_name: '',
        team_t_name: '',
      }),
      parseEvent: vi.fn((_path: string, eventName: string) => {
        if (eventName === 'round_announce_match_start') {
          return [{ tick: 11000 }];
        }
        if (eventName === 'round_end') {
          return roundEnds;
        }
        if (eventName === 'player_hurt') {
          return [
            // Dano residual antigo no início do round 2 (descartado pelo hiato > 2.0s)
            { tick: 16000, attacker_steamid: '76561198058500492', user_steamid: '76561198044118796', dmg_health: 12, hitgroup: 'generic' },
            // Rajada contínua final (13 ticks = ~203ms antes da morte)
            { tick: 22987, attacker_steamid: '76561198058500492', user_steamid: '76561198044118796', dmg_health: 27, hitgroup: 'chest' },
            { tick: 23000, attacker_steamid: '76561198058500492', user_steamid: '76561198044118796', dmg_health: 105, hitgroup: 'head' },
          ];
        }
        if (eventName === 'player_death') {
          return [
            { tick: 23000, attacker_steamid: '76561198058500492', user_steamid: '76561198044118796', weapon_id: 7, headshot: true },
          ];
        }
        return [];
      }),
      parseTicks: vi.fn().mockReturnValue([
        // Atletas FURIA (começam em T no round 1, tick 12000)
        { steamid: '76561198058500492', name: 'KSCERATO', team_num: 2, team_clan_name: 'FURIA', tick: 12000 },
        { steamid: '76561197960690195', name: 'FalleN', team_num: 2, team_clan_name: 'FURIA', tick: 12000 },
        { steamid: '76561198164970560', name: 'yuurih', team_num: 2, team_clan_name: 'FURIA', tick: 12000 },
        // Atletas Aurora (começam em CT no round 1, tick 12000)
        { steamid: '76561198044118796', name: 'XANTARES', team_num: 3, team_clan_name: 'Aurora', tick: 12000 },
        { steamid: '76561198855375325', name: 'Jimpphat', team_num: 3, team_clan_name: 'Aurora', tick: 12000 },
      ]),
    };

    let insertedMatch: any = null;
    let insertedPlayerStats: any[] = [];
    const mockDb = {
      query: vi.fn(async (sql: string, values: any[]) => {
        if (sql.includes('SELECT * FROM match_maps')) return {rows:[{rounds_t1:13,rounds_t2:10,replay_path:'test.bin.gz',map_number:1}]};
        if (sql.includes('INSERT INTO matches')) {
          insertedMatch = { sql, values };
          return { rows: [{ id: 'furia-aurora-match-id' }] };
        }
        if (sql.includes('INSERT INTO match_maps')) {
          return { rows: [{ id: 'map-id-1' }] };
        }
        if (sql.includes('INSERT INTO player_stats')) {
          insertedPlayerStats.push(values);
          return { rows: [] };
        }
        return { rows: [] };
      }),
    };

    const res = await processDemoFile(demPath, {
      demoparser: mockParser,
      dbClient: mockDb,
      replaysBaseDir: path.join(tmpDir, 'replays'),
      storeFilePath: null,
      assetOptions: {
        publicDir: path.join(tmpDir, 'public'),
        fetchImpl: vi.fn().mockResolvedValue({ ok: false, status: 404 }),
      },
    });

    // 1. Descarte de Warmup e Knife round + 2. Condição de Término no Regulamentar (MR12)
    // Devem existir estritamente 23 rounds computados
    expect(res.matchRecord.rounds_count).toBe(23);

    // 3. Mapeamento Preciso de Times e Lados
    expect(res.matchRecord.team_ct_name).toBe('FURIA');
    expect(res.matchRecord.team_t_name).toBe('Aurora');
    expect(res.matchRecord.score_ct).toBe(13);
    expect(res.matchRecord.score_t).toBe(10);
    expect(insertedMatch).toBeTruthy();
    expect(insertedMatch.values).toContain('FURIA');
    expect(insertedMatch.values).toContain('Aurora');

    // Validação cinemática: TTD deve ser null (sem LoS mockado de 250ms) e TTK deve refletir a rajada real (~203ms)
    const ksceratoStats = res.playerStats.find((p) => p.name === 'KSCERATO');
    expect(ksceratoStats).toBeTruthy();
    expect(ksceratoStats?.ttd).toBeNull();
    expect(ksceratoStats?.ttk).toBe(203);
    expect(res.matchRecord.global_avg_ttd_ms).toBeNull();
    expect(res.matchRecord.global_avg_ttk_ms).toBe(203);

    // No banco de dados player_stats:
    const ksceratoDbRow = insertedPlayerStats.find((row) => row[2] === '76561198058500492');
    expect(ksceratoDbRow).toBeTruthy();
    expect(ksceratoDbRow[4]).toBe('FURIA'); // team
    expect(ksceratoDbRow[11]).toBeNull(); // ttd
    expect(ksceratoDbRow[12]).toBe(203); // ttk

    // 4. Auditoria de Rounds no terminal
    const auditCalls = consoleSpy.mock.calls
      .map((c) => String(c[0]))
      .filter((msg) => msg.startsWith('Round '));
    expect(auditCalls).toHaveLength(23);
    expect(auditCalls[0]).toContain('Round 1: Aurora (CT) venceu | Placar: FURIA 0 x 1 Aurora');
    expect(auditCalls[22]).toContain('Round 23: FURIA (CT) venceu | Placar: FURIA 13 x 10 Aurora');

    consoleSpy.mockRestore();
  });

  it('extrai identificadores de mapa (m1, m2, m3) com Regex e gera ID de Série Determinístico (Pai)', () => {
    // 1. Extração via Regex
    expect(extractMapIdentifier('furia-vs-aurora-m1-dust2.dem')).toBe('m1');
    expect(extractMapIdentifier('furia-vs-aurora-m2-inferno.dem')).toBe('m2');
    expect(extractMapIdentifier('navi_vs_faze_m3.dem')).toBe('m3');
    expect(extractMapIdentifier('match-single.dem')).toBeNull();

    // 2. ID Determinístico RFC 4122 v4
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const seriesId1 = generateDeterministicSeriesId({
      playedAt: '2026-10-18T14:00:00Z',
      team1: 'FURIA',
      team2: 'Aurora',
    });
    const seriesId2 = generateDeterministicSeriesId({
      playedAt: '2026-10-18T16:30:00Z',
      team1: 'Aurora', // lados trocados no mapa 2
      team2: 'FURIA',
    });
    const differentDaySeriesId = generateDeterministicSeriesId({
      playedAt: '2026-10-19T14:00:00Z',
      team1: 'FURIA',
      team2: 'Aurora',
    });

    expect(seriesId1).toMatch(uuidRegex);
    expect(seriesId2).toMatch(uuidRegex);
    expect(seriesId1).toBe(seriesId2); // mesmo confronto no mesmo dia = mesmo ID Pai
    expect(seriesId1).not.toBe(differentDaySeriesId);
    expect(seriesId1).not.toBe('54e43847-2490-4751-9981-831bf7cf367c');
  });



});

