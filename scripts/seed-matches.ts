import { pool } from '../src/lib/db.ts';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

async function seed() {
  console.log('--- Inicianco enriquecimento de dados reais ---');

  // 1. Enriquecer partida FURIA vs Aurora do replay
  const replayPath = path.resolve(process.cwd(), 'data/replays/10-2026/18-10-2026/FURIA_vs_Aurora_BO1/furia-vs-aurora-m2-inferno.bin.gz');
  if (fs.existsSync(replayPath)) {
    const raw = fs.readFileSync(replayPath);
    const json = JSON.parse(zlib.gunzipSync(raw).toString());
    const players = json.playersManifest;
    const tickrate = json.tickrate || 64;

    const statsMap: Record<string, any> = {};
    for (const p of players) {
      statsMap[p.steamId] = {
        name: p.name,
        team: p.teamName,
        kills: 0,
        deaths: 0,
        assists: 0,
        headshots: 0,
        hits: 0,
        headHits: 0,
        k2: 0,
        k3: 0,
        k4: 0,
        k5: 0,
        totalDuels: 0,
        firstShotHits: 0,
        ttkSamples: [] as number[],
        ttdSamples: [] as number[],
      };
    }

    for (const round of json.rounds) {
      const roundKills: Record<string, number> = {};
      for (const k of (round.kills || [])) {
        const att = players.find((p: any) => p.id === k[1]);
        const vic = players.find((p: any) => p.id === k[2]);
        const isHs = k[4];
        if (att) {
          statsMap[att.steamId].kills++;
          if (isHs) statsMap[att.steamId].headshots++;
          roundKills[att.steamId] = (roundKills[att.steamId] || 0) + 1;
        }
        if (vic) {
          statsMap[vic.steamId].deaths++;
        }
      }

      for (const [sid, count] of Object.entries(roundKills)) {
        if (count === 2) statsMap[sid].k2++;
        if (count === 3) statsMap[sid].k3++;
        if (count === 4) statsMap[sid].k4++;
        if (count >= 5) statsMap[sid].k5++;
      }

      for (const d of (round.damages || [])) {
        const att = players.find((p: any) => p.id === d[1]);
        const hitgroup = d[4];
        if (att) {
          statsMap[att.steamId].hits++;
          if (hitgroup === 'head') statsMap[att.steamId].headHits++;
        }
      }

      for (const duel of (round.duels || [])) {
        const p = statsMap[duel.attackerSteamId];
        if (p) {
          p.totalDuels++;
          if (duel.isFirstShotHit) p.firstShotHits++;
          if (duel.killTick && duel.firstDamageTick) {
            p.ttkSamples.push(Math.round((duel.killTick - duel.firstDamageTick) * (1000 / tickrate)));
          }
          if (duel.firstSightTick && duel.firstDamageTick) {
            p.ttdSamples.push(Math.round((duel.firstDamageTick - duel.firstSightTick) * (1000 / tickrate)));
          }
        }
      }
    }

    // Benchmark crosshair placement & spotted accuracy por jogador
    const crosshairPlacementMap: Record<string, number> = {
      'KSCERATO': 6.69,
      'yuurih': 8.99,
      'FalleN': 9.77,
      'YEKINDAR': 10.11,
      'molodoy': 10.27,
      'XANTARES': 7.15,
      'Jimpphat': 7.85,
      'Wicadia': 9.12,
      'woxic': 8.45,
      'kyxsan': 10.50,
    };

    const spottedAccMap: Record<string, number> = {
      'KSCERATO': 40,
      'yuurih': 38,
      'FalleN': 36,
      'YEKINDAR': 33,
      'molodoy': 35,
      'XANTARES': 39,
      'Jimpphat': 38,
      'Wicadia': 36,
      'woxic': 34,
      'kyxsan': 31,
    };

    const sprayAccMap: Record<string, number> = {
      'KSCERATO': 44,
      'yuurih': 39,
      'FalleN': 42,
      'YEKINDAR': 67,
      'molodoy': 34,
      'XANTARES': 48,
      'Jimpphat': 41,
      'Wicadia': 38,
      'woxic': 32,
      'kyxsan': 25,
    };

    const counterStrafingMap: Record<string, number> = {
      'KSCERATO': 95,
      'yuurih': 82,
      'FalleN': 92,
      'YEKINDAR': 92,
      'molodoy': 73,
      'XANTARES': 96,
      'Jimpphat': 94,
      'Wicadia': 88,
      'woxic': 90,
      'kyxsan': 82,
    };

    const accuracyAllMap: Record<string, number> = {
      'KSCERATO': 22,
      'yuurih': 19,
      'FalleN': 20,
      'YEKINDAR': 11,
      'molodoy': 15,
      'XANTARES': 23,
      'Jimpphat': 21,
      'Wicadia': 18,
      'woxic': 17,
      'kyxsan': 14,
    };

    const ttdMap: Record<string, number> = {
      'KSCERATO': 453,
      'yuurih': 625,
      'FalleN': 594,
      'YEKINDAR': 922,
      'molodoy': 422,
      'XANTARES': 415,
      'Jimpphat': 430,
      'Wicadia': 510,
      'woxic': 490,
      'kyxsan': 640,
    };

    // Atualiza o match FURIA vs Aurora
    await pool.query(`
      UPDATE matches 
      SET event_name = 'ESL Pro League Season 20',
          bans = '[{"team": "FURIA", "maps": ["Nuke", "Anubis"]}, {"team": "Aurora", "maps": ["Dust2", "Ancient"]}]'::jsonb
      WHERE team1 = 'FURIA' AND team2 = 'Aurora';
    `);

    // Atualizar cada player_stats
    for (const [steamId, st] of Object.entries(statsMap)) {
      const avgTtk = st.ttkSamples.length > 0
        ? Math.round(st.ttkSamples.reduce((a: number, b: number) => a + b, 0) / st.ttkSamples.length)
        : 230;
      const headAcc = st.hits > 0 ? Math.round((st.headHits / st.hits) * 100) : 20;
      const hsKillPct = st.kills > 0 ? Math.round((st.headshots / st.kills) * 100) : 40;
      const firstBullet = st.totalDuels > 0 ? Math.round((st.firstShotHits / st.totalDuels) * 100) : 75;

      const currentDb = await pool.query('SELECT rating, adr, kast, metrics_json FROM player_stats WHERE player_steamid = $1', [steamId]);
      const prevMetrics = currentDb.rows[0]?.metrics_json || {};
      const rating = Number(currentDb.rows[0]?.rating || 1.0);
      const adr = Number(currentDb.rows[0]?.adr || 80);
      const kast = Number(currentDb.rows[0]?.kast || 70);

      const generalMetrics = {
        kills: st.kills,
        assists: st.assists || 3,
        deaths: st.deaths,
        kd: st.deaths > 0 ? Number((st.kills / st.deaths).toFixed(2)) : st.kills,
        adr,
        kast,
        k2: st.k2,
        k3: st.k3,
        k4: st.k4,
        k5: st.k5,
        hltv: rating,
      };

      const aimMetrics = {
        spottedAccuracy: spottedAccMap[st.name] || 35,
        ttd: ttdMap[st.name] || 500,
        ttk: avgTtk,
        crosshairPlacement: crosshairPlacementMap[st.name] || 9.5,
        headAccuracy: headAcc,
        hsKillPct,
        firstBullet,
        sprayAccuracy: sprayAccMap[st.name] || 38,
        counterStrafing: counterStrafingMap[st.name] || 85,
        accuracyAll: accuracyAllMap[st.name] || 18,
      };

      const updatedMetricsJson = {
        ...prevMetrics,
        general: generalMetrics,
        aim: aimMetrics,
      };

      await pool.query(`
        UPDATE player_stats
        SET ttd = $1,
            ttk = $2,
            metrics_json = $3
        WHERE player_steamid = $4
      `, [aimMetrics.ttd, avgTtk, JSON.stringify(updatedMetricsJson), steamId]);
    }
  }

  // 2. Inserir as partidas do catálogo do Print (Public Demos - CROSSFIRE Season 6) se ainda não existirem
  const countMatches = await pool.query('SELECT COUNT(*) FROM matches WHERE event_name = \'CROSSFIRE Season 6\'');
  if (Number(countMatches.rows[0].count) === 0) {
    console.log('Inserindo partidas de referência (Print do catálogo)...');

    // Partida 1: Beyond Limits 1 x 2 my life be like (BO3)
    const m1Res = await pool.query(`
      INSERT INTO matches (match_date, team1, team2, format, score_t1, score_t2, winner, event_name, bans)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id;
    `, [
      new Date('2026-09-20T18:00:00Z'),
      'Beyond Limits',
      'my life be like',
      'BO3',
      1,
      2,
      'my life be like',
      'CROSSFIRE Season 6',
      JSON.stringify([
        { team: 'Beyond Limits', maps: ['Dust2', 'Inferno'] },
        { team: 'my life be like', maps: ['Cache', 'Anubis'] }
      ])
    ]);
    const m1Id = m1Res.rows[0].id;

    // Mapas de m1: Ancient (11-13), Nuke (16-13), Mirage (4-13)
    const map1Res = await pool.query(`
      INSERT INTO match_maps (match_id, map_name, rounds_t1, rounds_t2, duration, pick_type, pick_team)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
    `, [m1Id, 'de_ancient', 11, 13, 2400, 'PICK', 'Beyond Limits']);

    await pool.query(`
      INSERT INTO match_maps (match_id, map_name, rounds_t1, rounds_t2, duration, pick_type, pick_team)
      VALUES ($1, $2, $3, $4, $5, $6, $7);
    `, [m1Id, 'de_nuke', 16, 13, 2700, 'PICK', 'my life be like']);

    await pool.query(`
      INSERT INTO match_maps (match_id, map_name, rounds_t1, rounds_t2, duration, pick_type, pick_team)
      VALUES ($1, $2, $3, $4, $5, $6, $7);
    `, [m1Id, 'de_mirage', 4, 13, 1900, 'DECIDER', null]);

    // Jogadores para m1
    const m1Players = [
      { name: 'agupastor', team: 'my life be like', rating: 1.09, adr: 72, kast: 70, kills: 14, assists: 3, deaths: 12, steamId: '76561198000000001', roleT: 'T Pack', roleCT: 'CT Anchor' },
      { name: 'c', team: 'my life be like', rating: 1.52, adr: 118, kast: 95, kills: 21, assists: 9, deaths: 10, steamId: '76561198000000002', roleT: 'T Lurk', roleCT: 'CT Rotation' },
      { name: 'Murphis DePança', team: 'my life be like', rating: 0.99, adr: 71, kast: 75, kills: 14, assists: 2, deaths: 13, steamId: '76561198000000003', roleT: 'T Entry', roleCT: 'CT Anchor' },
      { name: 'trevis', team: 'my life be like', rating: 1.78, adr: 113, kast: 90, kills: 23, assists: 6, deaths: 10, steamId: '76561198000000004', roleT: 'T Allround', roleCT: 'CT Rotation' },
      { name: 'Zikoya', team: 'my life be like', rating: 0.92, adr: 66, kast: 75, kills: 11, assists: 6, deaths: 13, steamId: '76561198000000005', roleT: 'T Support', roleCT: 'CT Anchor' },
      { name: 'Apex_bl', team: 'Beyond Limits', rating: 1.15, adr: 88, kast: 70, kills: 17, assists: 4, deaths: 16, steamId: '76561198000000006', roleT: 'T Entry', roleCT: 'CT Rotation' },
      { name: 'Vortex', team: 'Beyond Limits', rating: 0.98, adr: 68, kast: 65, kills: 13, assists: 3, deaths: 17, steamId: '76561198000000007', roleT: 'T Pack', roleCT: 'CT Anchor' },
      { name: 'Shadow', team: 'Beyond Limits', rating: 1.05, adr: 75, kast: 72, kills: 15, assists: 5, deaths: 15, steamId: '76561198000000008', roleT: 'T Lurk', roleCT: 'CT Rotation' },
      { name: 'Rider', team: 'Beyond Limits', rating: 0.88, adr: 58, kast: 62, kills: 10, assists: 2, deaths: 18, steamId: '76561198000000009', roleT: 'T Support', roleCT: 'CT Anchor' },
      { name: 'Nova', team: 'Beyond Limits', rating: 1.02, adr: 74, kast: 68, kills: 14, assists: 4, deaths: 16, steamId: '76561198000000010', roleT: 'T Allround', roleCT: 'CT Anchor' },
    ];

    for (const p of m1Players) {
      const aim = {
        spottedAccuracy: 36,
        ttd: 450,
        ttk: 240,
        crosshairPlacement: 8.5,
        headAccuracy: 22,
        hsKillPct: 40,
        firstBullet: 70,
        sprayAccuracy: 35,
        counterStrafing: 88,
        accuracyAll: 19,
      };
      const general = {
        kills: p.kills,
        assists: p.assists,
        deaths: p.deaths,
        kd: Number((p.kills / p.deaths).toFixed(2)),
        adr: p.adr,
        kast: p.kast,
        k2: 3,
        k3: 1,
        k4: 0,
        k5: 0,
        hltv: p.rating,
      };
      await pool.query(`
        INSERT INTO player_stats (
          match_id, map_id, player_steamid, nickname, team,
          rating, adr, kast, kills, deaths, assists, ttd, ttk, fsp, metrics_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);
      `, [
        m1Id,
        map1Res.rows[0].id,
        p.steamId,
        p.name,
        p.team,
        p.rating,
        p.adr,
        p.kast,
        p.kills,
        p.deaths,
        p.assists,
        aim.ttd,
        aim.ttk,
        aim.firstBullet,
        JSON.stringify({
          general,
          aim,
          roles: { t: p.roleT, ct: p.roleCT },
          hltv: { overall: p.rating, ct: p.rating, t: p.rating },
          adr: { overall: p.adr, ct: p.adr, t: p.adr },
          kd: { overall: general.kd, ct: general.kd, t: general.kd },
          kpr: { overall: Number((p.kills / 24).toFixed(2)), ct: Number((p.kills / 24).toFixed(2)), t: Number((p.kills / 24).toFixed(2)) },
          udr: { overall: 6.0, ct: 6.0, t: 6.0 },
          kast: { overall: p.kast, ct: p.kast, t: p.kast },
        })
      ]);
    }

    // Partida 2: Zomblers 0 x 2 Babag (BO3)
    const m2Res = await pool.query(`
      INSERT INTO matches (match_date, team1, team2, format, score_t1, score_t2, winner, event_name, bans)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id;
    `, [
      new Date('2026-09-20T16:00:00Z'),
      'Zomblers',
      'Babag',
      'BO3',
      0,
      2,
      'Babag',
      'CROSSFIRE Season 6',
      JSON.stringify([
        { team: 'Zomblers', maps: ['Nuke', 'Mirage'] },
        { team: 'Babag', maps: ['Cache', 'Anubis'] }
      ])
    ]);
    const m2Id = m2Res.rows[0].id;

    await pool.query(`
      INSERT INTO match_maps (match_id, map_name, rounds_t1, rounds_t2, duration, pick_type, pick_team)
      VALUES ($1, $2, $3, $4, $5, $6, $7);
    `, [m2Id, 'de_dust2', 13, 9, 2100, 'PICK', 'Zomblers']);

    await pool.query(`
      INSERT INTO match_maps (match_id, map_name, rounds_t1, rounds_t2, duration, pick_type, pick_team)
      VALUES ($1, $2, $3, $4, $5, $6, $7);
    `, [m2Id, 'de_inferno', 13, 11, 2300, 'PICK', 'Babag']);

    // Partida 3: Overtake Sector 0 x 2 Villainous (BO3)
    const m3Res = await pool.query(`
      INSERT INTO matches (match_date, team1, team2, format, score_t1, score_t2, winner, event_name, bans)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id;
    `, [
      new Date('2026-09-20T14:00:00Z'),
      'Overtake Sector',
      'Villainous',
      'BO3',
      0,
      2,
      'Villainous',
      'CROSSFIRE Season 6',
      JSON.stringify([
        { team: 'Overtake Sector', maps: ['Ancient', 'Dust2'] },
        { team: 'Villainous', maps: ['Nuke', 'Cache'] }
      ])
    ]);
    const m3Id = m3Res.rows[0].id;

    await pool.query(`
      INSERT INTO match_maps (match_id, map_name, rounds_t1, rounds_t2, duration, pick_type, pick_team)
      VALUES ($1, $2, $3, $4, $5, $6, $7);
    `, [m3Id, 'de_mirage', 13, 10, 2200, 'PICK', 'Overtake Sector']);

    await pool.query(`
      INSERT INTO match_maps (match_id, map_name, rounds_t1, rounds_t2, duration, pick_type, pick_team)
      VALUES ($1, $2, $3, $4, $5, $6, $7);
    `, [m3Id, 'de_anubis', 13, 10, 2200, 'PICK', 'Villainous']);
  }

  console.log('--- Enriquecimento concluído com sucesso ---');
  await pool.end();
}

seed().catch((err) => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
