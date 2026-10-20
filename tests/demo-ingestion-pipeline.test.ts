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
import { getSavedRecentTelemetry } from '../src/data/recent-performance-mock.ts';

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

  it('processa demo, grava em matches/match_maps/player_stats no PostgreSQL, gera .bin.gz com Gzip 9 e exclui o .dem', async () => {
    const demPath = path.join(tmpDir, 'furia-vs-imperial.dem');
    const storePath = path.join(tmpDir, 'ingested-matches.json');
    const replaysDir = path.join(tmpDir, 'replays');
    const publicDir = path.join(tmpDir, 'public');

    // Pré-cria furia.svg e kscerato.png para testar cache de assets
    await mkdir(path.join(publicDir, 'teams'), { recursive: true });
    await mkdir(path.join(publicDir, 'players'), { recursive: true });
    await writeFile(path.join(publicDir, 'teams', 'furia.svg'), '<svg>furia-cached</svg>', 'utf8');
    await writeFile(path.join(publicDir, 'players', 'kscerato.png'), Buffer.from([137, 80, 78, 71]));

    const rawDemoPayload = {
      demoHash: 'match_furia_imp_01',
      map: 'de_inferno',
      tickrate: 64,
      samplingRate: 4,
      format: 'BO1',
      playedAt: '2026-10-17T19:00:00.000Z',
      teamCtName: 'FURIA',
      teamTName: 'Imperial',
      players: [
        { steamId: '76561198012345678', name: 'KSCERATO', team: 'CT' },
        { steamId: '76561198087654321', name: 'try', team: 'T' },
      ],
      rounds: [
        {
          roundNumber: 1,
          startTick: 1000,
          endTick: 2000,
          winnerSide: 'CT',
          winReason: 'ct_win_elimination',
          damages: [
            {
              tick: 1016,
              attackerSteamId: '76561198012345678',
              victimSteamId: '76561198087654321',
              damage: 100,
              hitgroup: 'head',
              weaponId: 7,
            },
          ],
          kills: [
            {
              tick: 1032,
              killerSteamId: '76561198012345678',
              victimSteamId: '76561198087654321',
              weaponId: 7,
              headshot: true,
            },
          ],
          duels: [
            {
              attackerSteamId: '76561198012345678',
              victimSteamId: '76561198087654321',
              firstSightTick: 1000,
              firstDamageTick: 1016,
              killTick: 1032,
              isFirstShotHit: true,
            },
          ],
        },
        {
          roundNumber: 13,
          startTick: 3000,
          endTick: 4000,
          winnerSide: 'T',
          winReason: 'target_bombed',
          damages: [
            {
              tick: 3100,
              attackerSteamId: '76561198012345678',
              victimSteamId: '76561198087654321',
              damage: 88,
              hitgroup: 'chest',
              weaponId: 7,
            },
          ],
          kills: [
            {
              tick: 3120,
              killerSteamId: '76561198012345678',
              victimSteamId: '76561198087654321',
              weaponId: 7,
              headshot: false,
            },
          ],
          duels: [
            {
              attackerSteamId: '76561198012345678',
              victimSteamId: '76561198087654321',
              firstSightTick: 3080,
              firstDamageTick: 3100,
              killTick: 3120,
              isFirstShotHit: false,
            },
          ],
        },
      ],
    };

    await writeFile(demPath, JSON.stringify(rawDemoPayload), 'utf8');
    expect(await exists(demPath)).toBe(true);

    const executedQueries: Array<{ sql: string; values: any[] }> = [];
    const mockDbClient = {
      query: vi.fn(async (sql: string, values: any[]) => {
        executedQueries.push({ sql, values });
        if (sql.includes('INSERT INTO matches')) {
          return { rows: [{ id: 'match-uuid-123' }] };
        }
        if (sql.includes('INSERT INTO match_maps')) {
          return { rows: [{ id: 'map-uuid-456' }] };
        }
        return { rows: [] };
      }),
    };

    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });

    const result = await processDemoFile(demPath, {
      dbClient: mockDbClient,
      replaysBaseDir: replaysDir,
      storeFilePath: storePath,
      assetOptions: {
        publicDir,
        fetchImpl: fetchMock,
      },
    });

    // 1. Confirma id gerado no banco e queries de inserção no PostgreSQL
    expect(result.matchId).toBe('match-uuid-123');
    expect(mockDbClient.query).toHaveBeenCalled();

    // Query em matches
    const matchInsert = executedQueries.find((q) => q.sql.includes('INSERT INTO matches'));
    expect(matchInsert).toBeTruthy();
    expect(matchInsert?.values).toContain('FURIA');
    expect(matchInsert?.values).toContain('Imperial');
    expect(matchInsert?.values).toContain('BO1');

    // Query em match_maps
    const mapInsert = executedQueries.find((q) => q.sql.includes('INSERT INTO match_maps'));
    expect(mapInsert).toBeTruthy();
    expect(mapInsert?.values).toContain('de_inferno');

    // Query em player_stats
    const playerInserts = executedQueries.filter((q) => q.sql.includes('INSERT INTO player_stats'));
    expect(playerInserts).toHaveLength(2);
    const ksceratoQuery = playerInserts.find((q) => q.values.includes('KSCERATO'));
    expect(ksceratoQuery).toBeTruthy();

    // 2. Confirma gravação do arquivo .bin.gz respeitando a taxonomia YYYY/DD-MM-YYYY/TimeA_vs_TimeB
    const expectedGzPath = path.join(
      replaysDir,
      '2026',
      '17-10-2026',
      'FURIA_vs_Imperial',
      'furia-vs-imperial.bin.gz',
    );
    expect(await exists(expectedGzPath)).toBe(true);

    // Valida que o replay gravado é um Gzip válido e contém a telemetria 2D
    const gzBuf = await readFile(expectedGzPath);
    const decompressed = zlib.gunzipSync(gzBuf).toString('utf8');
    const parsedPkg = JSON.parse(decompressed);
    expect(parsedPkg.map).toBe('de_inferno');
    expect(parsedPkg.rounds).toHaveLength(2);

    // 3. REGRA ABSOLUTA: O arquivo .dem original DEVE ser deletado fisicamente do disco
    expect(result.demDeleted).toBe(true);
    expect(await exists(demPath)).toBe(false);

    // 4. Confirma sincronização de assets
    expect(await exists(path.join(publicDir, 'teams', 'furia.svg'))).toBe(true);
    expect(await exists(path.join(publicDir, 'teams', 'imperial.svg'))).toBe(true);
    expect(await exists(path.join(publicDir, 'players', 'kscerato.png'))).toBe(true);
    expect(await exists(path.join(publicDir, 'players', 'try.png'))).toBe(true);

    // 5. Confirma store UI
    const stored = JSON.parse(await readFile(storePath, 'utf8'));
    expect(stored).toHaveLength(1);
    const mergedTelemetry = getSavedRecentTelemetry(stored);
    expect(mergedTelemetry).toHaveLength(10);
    expect(mergedTelemetry[9].matchId).toBe('match-uuid-123');
    expect(mergedTelemetry[9].teamScore).toBe(2);
    expect(mergedTelemetry[9].result).toBe('W');
  });

  it('REGRA ABSOLUTA DE EXCLUSÃO DO .DEM: Exclui incondicionalmente o .dem mesmo quando ocorre erro no banco e anexa em ./logs/ingestion-errors.log', async () => {
    const demPath = path.join(tmpDir, 'error-match.dem');
    const logsDir = path.join(tmpDir, 'logs');
    await mkdir(logsDir, { recursive: true });

    await writeFile(
      demPath,
      JSON.stringify({
        demoHash: 'err_hash',
        map: 'de_mirage',
        players: [{ steamId: '1', name: 'kscerato', team: 'CT' }],
        rounds: [{ roundNumber: 1, startTick: 100, endTick: 200, winnerSide: 'CT', winReason: 'elim' }],
      }),
      'utf8',
    );
    expect(await exists(demPath)).toBe(true);

    const failingDbClient = {
      query: vi.fn().mockRejectedValue(new Error('PostgreSQL Connection Refused: port 5432 unreachable')),
    };

    // O processamento deve falhar
    await expect(
      processDemoFile(demPath, {
        dbClient: failingDbClient,
        logsDir,
        replaysBaseDir: path.join(tmpDir, 'replays'),
        storeFilePath: null,
      }),
    ).rejects.toThrow(/PostgreSQL Connection Refused/);

    // REGRA ABSOLUTA: O arquivo .dem NÃO deve permanecer no HD em hipótese alguma (deletado em finally)
    expect(await exists(demPath)).toBe(false);

    // Confirma que o erro foi anexado no arquivo de log
    const logFilePath = path.join(logsDir, 'ingestion-errors.log');
    expect(await exists(logFilePath)).toBe(true);
    const logContent = await readFile(logFilePath, 'utf8');
    expect(logContent).toContain('PostgreSQL Connection Refused');
    expect(logContent).toContain('error-match.dem');
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
    expect(await exists(demPath)).toBe(false);
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
    expect(insertedMatch.values[1]).toBe('FURIA'); // team1
    expect(insertedMatch.values[2]).toBe('Aurora'); // team2
    expect(insertedMatch.values[4]).toBe(13); // score_t1
    expect(insertedMatch.values[5]).toBe(10); // score_t2
    expect(insertedMatch.values[6]).toBe('FURIA'); // winner

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

  it('salva replays estritamente em YYYY/DD-MM-YYYY/TimeA_vs_TimeB e remove diretórios soltos de UUID', async () => {
    const demPath = path.join(tmpDir, 'furia-vs-aurora-m1-dust2.dem');
    const replaysDir = path.join(tmpDir, 'replays');

    await writeFile(
      demPath,
      JSON.stringify({
        demoHash: 'hash_series_m1',
        map: 'de_dust2',
        tickrate: 64,
        playedAt: '2026-10-18T15:00:00.000Z',
        teamCtName: 'FURIA',
        teamTName: 'Aurora',
        rounds: [{ roundNumber: 1, startTick: 100, endTick: 200, winnerSide: 'CT', winReason: 'ct_win' }],
      }),
    );

    const res = await processDemoFile(demPath, {
      skipDb: true,
      replaysBaseDir: replaysDir,
      storeFilePath: null,
      assetOptions: { publicDir: path.join(tmpDir, 'public'), fetchImpl: vi.fn() },
    });

    // 1. O destino estrito é data/replays/YYYY/DD-MM-YYYY/TimeA_vs_TimeB/
    const seriesDir = path.join(replaysDir, '2026', '18-10-2026', 'FURIA_vs_Aurora');
    expect(await exists(path.join(seriesDir, 'furia-vs-aurora-m1-dust2.bin.gz'))).toBe(true);
    expect(await exists(path.join(seriesDir, 'furia-vs-aurora-m1-dust2.json'))).toBe(true);
    expect(await exists(path.join(seriesDir, 'm1.bin.gz'))).toBe(true);
    expect(await exists(path.join(seriesDir, 'm1.json'))).toBe(true);
    expect(await exists(path.join(seriesDir, 'replay.bin.gz'))).toBe(true);

    // 2. Não cria pastas na raiz com UUID solto
    const looseUuidDir = path.join(replaysDir, res.matchId);
    expect(await exists(looseUuidDir)).toBe(false);
  });

  it('agrupa série MD3 no mesmo ID pai e executa query UPSERT com ON CONFLICT (id) DO UPDATE SET', async () => {
    const dem1Path = path.join(tmpDir, 'furia-vs-aurora-m1-dust2.dem');
    const dem2Path = path.join(tmpDir, 'furia-vs-aurora-m2-inferno.dem');

    await writeFile(
      dem1Path,
      JSON.stringify({
        demoHash: 'hash_m1_test',
        map: 'de_dust2',
        playedAt: '2026-10-18T14:00:00.000Z',
        teamCtName: 'FURIA',
        teamTName: 'Aurora',
        rounds: [{ roundNumber: 1, startTick: 100, endTick: 200, winnerSide: 'CT', winReason: 'ct_win' }],
      }),
    );
    await writeFile(
      dem2Path,
      JSON.stringify({
        demoHash: 'hash_m2_test',
        map: 'de_inferno',
        playedAt: '2026-10-18T15:30:00.000Z',
        teamCtName: 'FURIA',
        teamTName: 'Aurora',
        rounds: [{ roundNumber: 1, startTick: 100, endTick: 200, winnerSide: 'CT', winReason: 'ct_win' }],
      }),
    );

    const executedQueries: Array<{ sql: string; values?: any[] }> = [];
    const storedMaps: Array<{ id: string; match_id: string; map_name: string; rounds_t1: number; rounds_t2: number }> = [];

    const mockDb = {
      query: vi.fn(async (sql: string, values?: any[]) => {
        executedQueries.push({ sql, values });

        if (sql.includes('INSERT INTO matches')) {
          return { rows: [{ id: values?.[9] || 'deterministic-series-uuid' }] };
        }
        if (sql.includes('SELECT id, map_name, rounds_t1, rounds_t2 FROM match_maps')) {
          return { rows: [...storedMaps] };
        }
        if (sql.includes('SELECT id FROM match_maps WHERE match_id = $1 AND map_name = $2')) {
          const found = storedMaps.find((m) => m.match_id === values?.[0] && m.map_name === values?.[1]);
          return { rows: found ? [{ id: found.id }] : [] };
        }
        if (sql.includes('INSERT INTO match_maps')) {
          const newMap = {
            id: `map-${storedMaps.length + 1}`,
            match_id: values?.[0],
            map_name: values?.[1],
            rounds_t1: values?.[2],
            rounds_t2: values?.[3],
          };
          storedMaps.push(newMap);
          return { rows: [{ id: newMap.id }] };
        }
        if (sql.includes('SELECT rounds_t1, rounds_t2 FROM match_maps')) {
          return { rows: storedMaps.map((m) => ({ rounds_t1: m.rounds_t1, rounds_t2: m.rounds_t2 })) };
        }
        return { rows: [] };
      }),
    };

    const res1 = await processDemoFile(dem1Path, {
      dbClient: mockDb,
      replaysBaseDir: path.join(tmpDir, 'replays'),
      storeFilePath: null,
      assetOptions: { publicDir: path.join(tmpDir, 'public'), fetchImpl: vi.fn() },
    });

    const res2 = await processDemoFile(dem2Path, {
      dbClient: mockDb,
      replaysBaseDir: path.join(tmpDir, 'replays'),
      storeFilePath: null,
      assetOptions: { publicDir: path.join(tmpDir, 'public'), fetchImpl: vi.fn() },
    });

    // 1. Ambos os mapas compartilham o mesmo ID pai de série
    expect(res1.matchId).toBe(res2.matchId);
    expect(res1.seriesId).toBe(res2.seriesId);

    // 2. Ambos os mapas coexistem em match_maps (m1 não foi apagado por m2)
    expect(storedMaps).toHaveLength(2);
    expect(storedMaps[0].map_name).toBe('de_dust2');
    expect(storedMaps[1].map_name).toBe('de_inferno');

    // 3. Ao processar m2, a série é atualizada para formato MD3
    const formatUpdates = executedQueries.filter(
      (q) => q.sql.includes('UPDATE matches SET format = $1') && q.values?.includes('MD3'),
    );
    expect(formatUpdates.length).toBeGreaterThan(0);

    // 4. Inserções em matches usam UPSERT (ON CONFLICT (id) DO UPDATE SET)
    const matchInserts = executedQueries.filter((q) => q.sql.includes('INSERT INTO matches'));
    expect(matchInserts).toHaveLength(2);
    for (const insert of matchInserts) {
      expect(insert.sql).toContain('ON CONFLICT (id) DO UPDATE SET');
      expect(insert.sql).toContain('demo_hash = COALESCE(matches.demo_hash, EXCLUDED.demo_hash)');
    }
  });
});

