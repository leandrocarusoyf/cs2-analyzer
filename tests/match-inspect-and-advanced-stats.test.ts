// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  classifyHitgroup,
  resolveMapZone,
  extractMatchDuels,
  computePlayerAdvancedStats,
  computeMatchPlayerMetrics,
} from '../scripts/process-demo.mjs';
import { persistMatch } from '../scripts/persist-match.mjs';

const mockQuery = vi.fn();
vi.mock('../src/lib/db.ts', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    query: (...args: any[]) => mockQuery(...args),
  };
});

import { GET as getMatchInspect } from '../src/app/api/players/[steamid]/match-inspect/route.ts';

describe('1. Migração PostgreSQL (player_advanced_stats e match_duels)', () => {
  it('define as tabelas player_advanced_stats e match_duels com constraints e índices exigidos', async () => {
    const migrationSql = await readFile(
      path.resolve('scripts/migrations/001_advanced_stats_and_duels.sql'),
      'utf8',
    );
    const initDbSql = await readFile(path.resolve('scripts/init-db.sql'), 'utf8');

    for (const sql of [migrationSql, initDbSql]) {
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS player_advanced_stats');
      expect(sql).toContain('hit_head_pct');
      expect(sql).toContain('hit_chest_pct');
      expect(sql).toContain('hit_stomach_pct');
      expect(sql).toContain('hit_limbs_pct');
      expect(sql).toContain('reaction_time_ms');
      expect(sql).toContain('headlock_offset');
      expect(sql).toContain('first_5_bullets_pct');
      expect(sql).toContain('prefire_pct');
      expect(sql).toContain('score_opening');
      expect(sql).toContain('score_trade');
      expect(sql).toContain('score_utility');
      expect(sql).toContain('score_flash');
      expect(sql).toContain('score_clutch');
      expect(sql).toMatch(/UNIQUE\s*\(\s*match_id\s*,\s*steamid\s*\)/i);

      expect(sql).toContain('CREATE TABLE IF NOT EXISTS match_duels');
      expect(sql).toContain('winner_steamid');
      expect(sql).toContain('loser_steamid');
      expect(sql).toContain('winner_weapon');
      expect(sql).toContain('loser_weapon');
      expect(sql).toContain('winner_hp_remaining');
      expect(sql).toContain('map_zone');
      expect(sql).toContain('is_opening');
      expect(sql).toContain('is_trade');
      expect(sql).toContain('is_clutch');
      expect(sql).toContain('duel_tag');
      expect(sql).toMatch(/ON\s+match_duels\s*\(\s*match_id\s*,\s*winner_steamid\s*\)/i);
      expect(sql).toMatch(/ON\s+match_duels\s*\(\s*match_id\s*,\s*round_number\s*\)/i);
    }
  });
});

describe('2. Pipeline de Ingestão (Hitbox Extraction e Micro-Duels em process-demo.mjs)', () => {
  it('soma somente dano HE por atacante entre rounds e mantém zero sem HE', () => {
    const rawDemo = {
      players: [{ steamId: 'S1' }, { steamId: 'S2' }],
      rounds: [
        { damages: [
          { attackerSteamId: 'S1', weapon: 'hegrenade', damage: 35 },
          { attackerSteamId: 'S1', weapon: 'hegrenade', damage: 20 },
          { attackerSteamId: 'S1', weapon: 'inferno', damage: 40 },
          { attackerSteamId: 'S2', weapon: 'ak47', damage: 100 },
        ] },
        { damages: [
          { attacker_steamid: 'S1', weapon: 'hegrenade', dmg_health: 15 },
          { attackerSteamId: 'S1', weapon: 'hegrenade', damage: 'invalid' },
          { attackerSteamId: 'S1', weapon: 'hegrenade', damage: -5 },
        ] },
      ],
    };
    const stats = computePlayerAdvancedStats(rawDemo, [], [], 'match-he');
    expect(stats.find((s) => s.steamid === 'S1')?.he_damage).toBe(70);
    expect(stats.find((s) => s.steamid === 'S2')?.he_damage).toBe(0);
  });

  it('agrupa hitgroups (1=Head, 2=Chest, 3=Stomach, outros=Limbs) e calcula porcentagens reais sem fallbacks falsos', () => {
    expect(classifyHitgroup(1)).toBe('head');
    expect(classifyHitgroup('1')).toBe('head');
    expect(classifyHitgroup('head')).toBe('head');
    expect(classifyHitgroup(2)).toBe('chest');
    expect(classifyHitgroup('chest')).toBe('chest');
    expect(classifyHitgroup(3)).toBe('stomach');
    expect(classifyHitgroup('stomach')).toBe('stomach');
    expect(classifyHitgroup(4)).toBe('limbs');
    expect(classifyHitgroup(7)).toBe('limbs');
    expect(classifyHitgroup('leftarm')).toBe('limbs');

    const rawDemo = {
      demoHash: 'hitbox1234567890',
      map: 'de_inferno',
      tickrate: 64,
      teamCtName: 'FURIA',
      teamTName: 'NAVI',
      players: [
        { steamId: 'S1', name: 'KSCERATO', team: 'CT', teamName: 'FURIA' },
        { steamId: 'S2', name: 'b1t', team: 'T', teamName: 'NAVI' },
      ],
      weapons: [{ id: 7, name: 'weapon_ak47' }],
      rounds: [
        {
          roundNumber: 1,
          startTick: 1000,
          freezeEndTick: 1000,
          endTick: 3000,
          winnerSide: 'CT',
          winReason: 'ct_win_elimination',
          damages: [
            { tick: 1100, attackerSteamId: 'S1', victimSteamId: 'S2', damage: 25, hitgroup: 1, weaponId: 7 },
            { tick: 1108, attackerSteamId: 'S1', victimSteamId: 'S2', damage: 25, hitgroup: 2, weaponId: 7 },
            { tick: 1116, attackerSteamId: 'S1', victimSteamId: 'S2', damage: 25, hitgroup: 3, weaponId: 7 },
            { tick: 1124, attackerSteamId: 'S1', victimSteamId: 'S2', damage: 25, hitgroup: 5, weaponId: 7 },
          ],
          kills: [
            { tick: 1124, killerSteamId: 'S1', victimSteamId: 'S2', weaponId: 7, headshot: true },
          ],
          duels: [
            {
              attackerSteamId: 'S1',
              victimSteamId: 'S2',
              firstSightTick: 1084,
              firstDamageTick: 1100,
              killTick: 1124,
              isFirstShotHit: true,
              preAimErrorDegrees: 1.45,
            },
          ],
        },
      ],
    };

    const playerStats = computeMatchPlayerMetrics(rawDemo);
    const advList = computePlayerAdvancedStats(rawDemo, playerStats, null, 'match-uuid-1');

    const s1Adv = advList.find((a) => a.steamid === 'S1');
    const s2Adv = advList.find((a) => a.steamid === 'S2');

    expect(s1Adv).toBeDefined();
    expect(s1Adv?.hit_head_pct).toBe(25);
    expect(s1Adv?.hit_chest_pct).toBe(25);
    expect(s1Adv?.hit_stomach_pct).toBe(25);
    expect(s1Adv?.hit_limbs_pct).toBe(25);
    expect(s1Adv?.hs_percent).toBe(100);
    expect(s1Adv?.reaction_time_ms).toBe(250); // (1100 - 1084) * 1000 / 64 = 250ms
    expect(s1Adv?.headlock_offset).toBe(1.45);
    expect(s1Adv?.first_5_bullets_pct).toBe(100);
    expect(s1Adv?.score_opening).toBe(100);

    // Jogador S2 não efetuou disparos nem acertos -> 0 e null (sem dados falsos)
    expect(s2Adv).toBeDefined();
    expect(s2Adv?.hit_head_pct).toBe(0);
    expect(s2Adv?.hit_chest_pct).toBe(0);
    expect(s2Adv?.hit_stomach_pct).toBe(0);
    expect(s2Adv?.hit_limbs_pct).toBe(0);
    expect(s2Adv?.reaction_time_ms).toBeNull();
    expect(s2Adv?.headlock_offset).toBeNull();
  });

  it('gera micro-duelos (match_duels) com zona por X,Y, is_opening, is_trade (<=4s), is_clutch (1 vivo) e duel_tag', () => {
    expect(resolveMapZone('de_inferno', 500, 2600)).toBe('Bomb B');
    expect(resolveMapZone('de_inferno', 1800, 300)).toBe('Bomb A');
    expect(resolveMapZone('de_inferno', null, null)).toBeNull();

    const rawDemo = {
      demoHash: 'duels12345678901',
      map: 'de_inferno',
      tickrate: 64,
      teamCtName: 'FURIA',
      teamTName: 'Aurora',
      players: [
        { steamId: 'CT1', name: 'FalleN', team: 'CT', teamName: 'FURIA' },
        { steamId: 'CT2', name: 'KSCERATO', team: 'CT', teamName: 'FURIA' },
        { steamId: 'T1', name: 'XANTARES', team: 'T', teamName: 'Aurora' },
        { steamId: 'T2', name: 'Wicadia', team: 'T', teamName: 'Aurora' },
      ],
      weapons: [
        { id: 7, name: 'weapon_ak47' },
        { id: 9, name: 'weapon_awp' },
        { id: 60, name: 'weapon_m4a1_silencer' },
      ],
      rounds: [
        {
          roundNumber: 1,
          startTick: 1000,
          freezeEndTick: 1000,
          endTick: 5000,
          winnerSide: 'CT',
          winReason: 'ct_win_elimination',
          damages: [
            // T1 toma 27 de dano antes de matar CT1
            { tick: 1600, attackerSteamId: 'CT1', victimSteamId: 'T1', damage: 27, hitgroup: 2, weaponId: 60 },
            // T1 mata CT1 (opening)
            { tick: 1640, attackerSteamId: 'T1', victimSteamId: 'CT1', damage: 100, hitgroup: 1, weaponId: 7 },
            // CT2 vinga CT1 2 segundos depois (128 ticks <= 256 ticks) e está sozinho vivo (1v2 clutch + trade + headshot)
            { tick: 1752, attackerSteamId: 'CT2', victimSteamId: 'T1', damage: 100, hitgroup: 1, weaponId: 9 },
          ],
          kills: [
            {
              tick: 1640,
              killerSteamId: 'T1',
              victimSteamId: 'CT1',
              weaponId: 7,
              headshot: true,
              victimX: 500,
              victimY: 2600,
            },
            {
              tick: 1768,
              killerSteamId: 'CT2',
              victimSteamId: 'T1',
              weaponId: 9,
              headshot: true,
              victimX: 1800,
              victimY: 300,
            },
          ],
          duels: [
            {
              attackerSteamId: 'T1',
              victimSteamId: 'CT1',
              firstSightTick: 1624,
              firstDamageTick: 1640,
              killTick: 1640,
              isFirstShotHit: true,
            },
            {
              attackerSteamId: 'CT2',
              victimSteamId: 'T1',
              firstSightTick: 1740,
              firstDamageTick: 1752,
              killTick: 1768,
              isFirstShotHit: true,
            },
          ],
        },
      ],
    };

    const duels = extractMatchDuels(rawDemo, 'match-uuid-99');
    expect(duels).toHaveLength(2);

    // Duelo 1: T1 elimina CT1 no Bomb B (Opening, sem Trade, sem Clutch pois T1 e T2 estão vivos)
    expect(duels[0]).toMatchObject({
      match_id: 'match-uuid-99',
      round_number: 1,
      round_time: '00:10',
      winner_steamid: 'T1',
      loser_steamid: 'CT1',
      winner_weapon: 'weapon_ak47',
      loser_weapon: 'weapon_m4a1_silencer',
      winner_hp_remaining: 73,
      map_zone: 'Bomb B',
      is_opening: true,
      is_trade: false,
      is_clutch: false,
      duel_tag: 'Headshot (250ms)',
    });

    // Duelo 2: CT2 elimina T1 no Bomb A (2s após morte de CT1 => is_trade=true; único CT vivo => is_clutch=true)
    expect(duels[1]).toMatchObject({
      match_id: 'match-uuid-99',
      round_number: 1,
      round_time: '00:12',
      winner_steamid: 'CT2',
      loser_steamid: 'T1',
      winner_weapon: 'weapon_awp',
      loser_weapon: 'weapon_ak47',
      winner_hp_remaining: 100,
      map_zone: 'Bomb A',
      is_opening: false,
      is_trade: true,
      is_clutch: true,
      duel_tag: 'Headshot (188ms)',
    });
  });

  it('persiste player_advanced_stats e match_duels na transação de persistMatch', async () => {
    const executedQueries: Array<{ sql: string; values: any[] }> = [];
    const mockClient = {
      query: vi.fn(async (sql: string, values: any[] = []) => {
        executedQueries.push({ sql, values });
        if (sql.includes('SELECT * FROM matches')) return { rows: [] };
        if (sql.includes('SELECT * FROM match_maps')) {
          return {
            rows: [{ rounds_t1: 1, rounds_t2: 0, replay_path: 'test.bin.gz', map_number: 1 }],
          };
        }
        return { rows: [] };
      }),
    };

    const rawDemo = {
      format: 'BO1',
      tickrate: 64,
      team1StartingSide: 'CT',
      rounds: [{ roundNumber: 1, startTick: 0, endTick: 640 }],
    };
    const matchRecord = {
      played_at: '2026-10-20T12:00:00Z',
      team_ct_name: 'FURIA',
      team_t_name: 'NAVI',
      score_ct: 1,
      score_t: 0,
      map_name: 'de_inferno',
      demo_hash: 'hash999',
    };
    const playerStats = [
      {
        steamId: '76561198000000001',
        name: 'KSCERATO',
        initialTeam: 'CT',
        teamName: 'FURIA',
        kills: 1,
        deaths: 0,
        assists: 0,
        ttd: 220,
        ttk: 250,
        metrics: {
          hltv: { overall: 1.45 },
          adr: { overall: 100 },
          kast: { overall: 100 },
        },
        metricsJson: '{}',
      },
    ];
    const advancedStats = [
      {
        match_id: '54e43847-2490-4751-9981-831bf7cf367c',
        steamid: '76561198000000001',
        hltv_rating: 1.45,
        adr: 100,
        kast: 100,
        impact: 1.72,
        hs_percent: 100,
        hit_head_pct: 50,
        hit_chest_pct: 50,
        hit_stomach_pct: 0,
        hit_limbs_pct: 0,
        reaction_time_ms: 220,
        headlock_offset: 1.2,
        first_5_bullets_pct: 100,
        prefire_pct: 0,
        score_opening: 100,
        score_trade: 0,
        score_utility: 0,
        score_flash: 0,
        score_clutch: 0,
        he_damage: 70,
      },
    ];
    const matchDuels = [
      {
        match_id: '54e43847-2490-4751-9981-831bf7cf367c',
        round_number: 1,
        round_time: '00:10',
        winner_steamid: '76561198000000001',
        loser_steamid: '76561198000000002',
        winner_weapon: 'weapon_ak47',
        loser_weapon: 'weapon_m4a1_silencer',
        winner_hp_remaining: 80,
        map_zone: 'Bomb A',
        is_opening: true,
        is_trade: false,
        is_clutch: false,
        duel_tag: 'Headshot (220ms)',
      },
    ];

    await persistMatch(mockClient, {
      matchRecord,
      rawDemo,
      playerStats,
      advancedStats,
      matchDuels,
      replayPath: 'data/replays/test.bin.gz',
      demoPath: 'data/replays/test.dem',
      targetMatchId: '54e43847-2490-4751-9981-831bf7cf367c',
      mapIdentifier: 'm1',
    });

    const advInsert = executedQueries.find((q) => q.sql.includes('INSERT INTO player_advanced_stats'));
    const duelInsert = executedQueries.find((q) => q.sql.includes('INSERT INTO match_duels'));

    expect(advInsert).toBeDefined();
    expect(advInsert?.values[1]).toBe('76561198000000001');
    expect(advInsert?.values[7]).toBe(50); // hit_head_pct
    expect(advInsert?.values[20]).toBe(70); // he_damage
    expect(advInsert?.sql).toContain('he_damage = EXCLUDED.he_damage');
    expect(duelInsert).toBeDefined();
    expect(duelInsert?.values[4]).toBe('76561198000000001'); // winner_steamid
    expect(duelInsert?.values[9]).toBe('Bomb A'); // map_zone
  });
});

describe('3. Endpoint GET /api/players/:steamid/match-inspect', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('retorna 400 quando matchId está ausente', async () => {
    const req = new Request('http://localhost/api/players/76561198058500492/match-inspect');
    const res = await getMatchInspect(req, {
      params: Promise.resolve({ steamid: '76561198058500492' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('matchId');
  });

  it('retorna 404 quando o jogador não possui estatísticas avançadas na partida', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const req = new Request(
      'http://localhost/api/players/76561198058500492/match-inspect?matchId=54e43847-2490-4751-9981-831bf7cf367c',
    );
    const res = await getMatchInspect(req, {
      params: Promise.resolve({ steamid: '76561198058500492' }),
    });
    expect(res.status).toBe(404);
  });

  it('retorna payload consolidado com player_advanced_stats tipado em números e lista filtrável de match_duels', async () => {
    const matchId = '54e43847-2490-4751-9981-831bf7cf367c';
    const steamid = '76561198058500492';

    const dbStatsRow = {
      match_id: matchId,
      steamid,
      hltv_rating: '1.38',
      adr: '94.50',
      kast: '82.60',
      impact: '1.42',
      hs_percent: '61.50',
      hit_head_pct: '42.00',
      hit_chest_pct: '35.00',
      hit_stomach_pct: '13.00',
      hit_limbs_pct: '10.00',
      reaction_time_ms: '215.00',
      headlock_offset: null,
      first_5_bullets_pct: '78.50',
      prefire_pct: '12.50',
      score_opening: '75.00',
      score_trade: '40.00',
      score_utility: '65.00',
      score_flash: '50.00',
      score_clutch: '100.00',
      he_damage: '70.00',
    };

    const dbDuelsRows = [
      {
        id: 'duel-1',
        match_id: matchId,
        round_number: 1,
        round_time: '00:14',
        winner_steamid: steamid,
        loser_steamid: '76561198044118796',
        winner_weapon: 'weapon_ak47',
        loser_weapon: 'weapon_m4a1_silencer',
        winner_hp_remaining: 100,
        map_zone: 'Bananinha',
        is_opening: true,
        is_trade: false,
        is_clutch: false,
        duel_tag: 'Headshot (215ms)',
      },
      {
        id: 'duel-2',
        match_id: matchId,
        round_number: 4,
        round_time: '00:48',
        winner_steamid: '76561198044118796',
        loser_steamid: steamid,
        winner_weapon: 'weapon_awp',
        loser_weapon: 'weapon_ak47',
        winner_hp_remaining: 55,
        map_zone: 'Meio',
        is_opening: false,
        is_trade: true,
        is_clutch: false,
        duel_tag: 'Trade',
      },
      {
        id: 'duel-3',
        match_id: matchId,
        round_number: 9,
        round_time: '01:22',
        winner_steamid: steamid,
        loser_steamid: '76561198855375325',
        winner_weapon: 'weapon_ak47',
        loser_weapon: null,
        winner_hp_remaining: 18,
        map_zone: 'Bomb B',
        is_opening: false,
        is_trade: false,
        is_clutch: true,
        duel_tag: 'Clutch (195ms)',
      },
    ];

    mockQuery
      .mockResolvedValueOnce({ rows: [dbStatsRow] })
      .mockResolvedValueOnce({ rows: dbDuelsRows });

    const req = new Request(
      `http://localhost/api/players/${steamid}/match-inspect?matchId=${matchId}&isClutch=true`,
    );
    const res = await getMatchInspect(req, {
      params: Promise.resolve({ steamid }),
    });

    expect(res.status).toBe(200);
    const payload = await res.json();

    expect(payload.matchId).toBe(matchId);
    expect(payload.steamid).toBe(steamid);
    expect(payload.player_advanced_stats).toEqual({
      match_id: matchId,
      steamid,
      hltv_rating: 1.38,
      adr: 94.5,
      kast: 82.6,
      impact: 1.42,
      hs_percent: 61.5,
      hit_head_pct: 42,
      hit_chest_pct: 35,
      hit_stomach_pct: 13,
      hit_limbs_pct: 10,
      reaction_time_ms: 215,
      headlock_offset: null,
      first_5_bullets_pct: 78.5,
      prefire_pct: 12.5,
      score_opening: 75,
      score_trade: 40,
      score_utility: 65,
      score_flash: 50,
      score_clutch: 100,
      he_damage: 70,
    });

    // Filtrado por isClutch=true
    expect(mockQuery.mock.calls[0][0]).toContain('pas.he_damage');
    expect(payload.match_duels).toHaveLength(1);
    expect(payload.match_duels[0].id).toBe('duel-3');
    expect(payload.match_duels[0].is_clutch).toBe(true);
    expect(payload.match_duels[0].loser_weapon).toBeNull();
  });
});
