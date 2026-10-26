import { describe, it, expect, vi } from 'vitest';
import {
  aggregateAimMetrics,
  processDemoTelemetry,
} from '../src/services/demo-processor.ts';
import {
  persistMatchMetadata,
  saveReplayPackageLocally,
} from '../src/services/replay-storage-worker.ts';
import { replayDataPackageSchema } from '../src/contracts/replay.schema.ts';

function buildRawDemo(): any {
  const p = (steamId: string, x: number, yaw: number, extra: object = {}) => ({
    steamId,
    x,
    y: 100,
    z: 0,
    yaw,
    hp: 100,
    armor: 100,
    hasHelmet: true,
    isAlive: true,
    weaponId: 7,
    flashDuration: 0,
    ping: 15,
    ...extra,
  });

  const ticksFor = (start: number) =>
    Array.from({ length: 9 }, (_, i) => ({
      tick: start + i,
      players: [p('A', -500 + i, 370 + i), p('B', 200 + i, 90)],
    }));

  return {
    demoHash: 'abc123hash',
    map: 'de_mirage',
    tickrate: 64,
    samplingRate: 4,
    playedAt: '2026-10-16T20:00:00.000Z',
    teamCtName: 'FURIA',
    teamTName: 'NAVI',
    players: [
      { steamId: 'A', name: 'kscerato', team: 'CT' },
      { steamId: 'B', name: 'b1t', team: 'T' },
    ],
    weapons: [{ id: 7, name: 'weapon_ak47' }],
    rounds: [
      {
        roundNumber: 1,
        startTick: 1000,
        endTick: 2000,
        winnerSide: 'CT',
        winReason: 'ct_win_elimination',
        ticks: [...ticksFor(1000), { tick: 5000, players: [p('A', 0, 0)] }],
        damages: [{ tick: 1016, attackerSteamId: 'A', victimSteamId: 'B', damage: 100, hitgroup: 'head', weaponId: 7 }],
        kills: [
          { tick: 1032, killerSteamId: 'A', victimSteamId: 'B', weaponId: 7, headshot: true },
          { tick: 1040, killerSteamId: 'ZZZ', victimSteamId: 'B', weaponId: 7 },
        ],
        utility: [{ tick: 1100, type: 'SMOKE', x: 1, y: 2, z: 3, startTick: 1100, endTick: 1900 }],
        bomb: [{ tick: 1500, event: 'bomb_planted', playerSteamId: 'B', x: 10, y: 20 }],
        duels: [
          { attackerSteamId: 'A', victimSteamId: 'B', firstSightTick: 1000, firstDamageTick: 1016, killTick: 1032, isFirstShotHit: true },
          { attackerSteamId: 'A', victimSteamId: 'B', firstSightTick: 1200, firstDamageTick: 1224, killTick: 1264, isFirstShotHit: false },
        ],
      },
      {
        roundNumber: 2,
        startTick: 3000,
        endTick: 4000,
        winnerSide: 'T',
        winReason: 'target_bombed',
        ticks: [],
        duels: [
          { attackerSteamId: 'B', victimSteamId: 'A', firstSightTick: 3000, firstDamageTick: null, killTick: null, isFirstShotHit: false },
          // anomalia: dano antes do contato visual -> descartado
          { attackerSteamId: 'B', victimSteamId: 'A', firstSightTick: 3500, firstDamageTick: 3490, killTick: null, isFirstShotHit: true },
        ],
      },
    ],
  };
}

describe('processDemoTelemetry', () => {
  it('gera um pacote que cumpre estritamente o replayDataPackageSchema', () => {
    const { packageData } = processDemoTelemetry(buildRawDemo());
    const result = replayDataPackageSchema.safeParse(packageData);
    expect(result.success).toBe(true);

    // Amostragem (a cada 4 ticks) e descarte de tick fora da janela do round
    const frames = packageData.rounds[0].frames;
    expect(frames.map((f) => f[0])).toEqual([1000, 1004, 1008]);
    // yaw normalizado para [0, 360) e tupla de 14 posições
    expect(frames[0][1][0]).toHaveLength(14);
    expect(frames[0][1][0][4]).toBe(10);
    // eventos com jogador desconhecido são descartados
    expect(packageData.rounds[0].events.kills).toHaveLength(1);
  });

  it('agrega TTD e TTK com precisão e arredondamento corretos', () => {
    const { matchRecord } = processDemoTelemetry(buildRawDemo());
    // TTD: 16t=250ms e 24t=375ms -> média 312.5 -> 313
    expect(matchRecord.global_avg_ttd_ms).toBe(313);
    // TTK: 16t=250ms e 40t=625ms -> média 437.5 -> 438
    expect(matchRecord.global_avg_ttk_ms).toBe(438);
  });

  it('monta o registo de matches com placar, hash e caminho de armazenamento', () => {
    const { matchRecord } = processDemoTelemetry(buildRawDemo());
    expect(matchRecord).toMatchObject({
      demo_hash: 'abc123hash',
      map_name: 'de_mirage',
      team_ct_name: 'FURIA',
      team_t_name: 'NAVI',
      score_ct: 1,
      score_t: 1,
      rounds_count: 2,
      replay_storage_path: 'abc123hash.json',
      is_public: false,
      uploader_id: null,
    });
  });

  it('inverte o placar por equipe a partir do round 13 (MR12)', () => {
    const raw = buildRawDemo();
    raw.rounds = [
      { ...raw.rounds[0], roundNumber: 12, winnerSide: 'CT' },
      { ...raw.rounds[1], roundNumber: 13, winnerSide: 'T' },
    ];
    const { matchRecord } = processDemoTelemetry(raw);
    // Equipe inicial CT venceu o 12 (CT) e o 13 (T pós-troca)
    expect(matchRecord.score_ct).toBe(2);
    expect(matchRecord.score_t).toBe(0);
  });

  it('rejeita mapa inválido, hash vazio e número de rounds fora de 1..60', () => {
    expect(() => processDemoTelemetry({ ...buildRawDemo(), map: 'de_cbble' })).toThrow();
    expect(() => processDemoTelemetry({ ...buildRawDemo(), demoHash: ' ' })).toThrow();
    expect(() => processDemoTelemetry({ ...buildRawDemo(), rounds: [] })).toThrow();
  });

  it('devolve null nos agregados quando não há duelos válidos', () => {
    const r = aggregateAimMetrics([], 64);
    expect(r).toEqual({ avgTtdMs: null, avgTtkMs: null, discardedDuels: 0 });
  });
});

describe('replay-storage-worker', () => {
  it('salva o pacote de telemetria localmente compactado em Gzip com nível 9', async () => {
    const { packageData } = processDemoTelemetry(buildRawDemo());
    const os = await import('node:os');
    const path = await import('node:path');
    const fs = await import('node:fs/promises');
    const zlib = await import('node:zlib');

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'replay-worker-'));
    try {
      const targetPath = path.join(tmpDir, 'replays', 'test.bin.gz');
      const savedPath = await saveReplayPackageLocally(packageData, targetPath);

      expect(savedPath).toBe(targetPath);
      const exists = await fs.stat(targetPath);
      expect(exists.size).toBeGreaterThan(0);

      // Descompacta e valida o JSON original
      const compressedBuf = await fs.readFile(targetPath);
      const decompressed = zlib.gunzipSync(compressedBuf).toString('utf8');
      expect(JSON.parse(decompressed)).toEqual(JSON.parse(JSON.stringify(packageData)));
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('rejeita caminho de destino inválido ao salvar replay local', async () => {
    const { packageData } = processDemoTelemetry(buildRawDemo());
    await expect(saveReplayPackageLocally(packageData, '')).rejects.toThrow(/destino inválido/);
  });

  it('insere em matches via PostgreSQL client e devolve o id gerado', async () => {
    const { matchRecord } = processDemoTelemetry(buildRawDemo());
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'uuid-pg-1' }] });
    const client = { query };

    const id = await persistMatchMetadata(client, matchRecord);

    expect(id).toBe('uuid-pg-1');
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, values] = query.mock.calls[0];
    expect(sql).toContain('INSERT INTO matches');
    expect(values).toContain('FURIA');
    expect(values).toContain('NAVI');
  });

  it('propaga erro de inserção no PostgreSQL', async () => {
    const { matchRecord } = processDemoTelemetry(buildRawDemo());
    const query = vi.fn().mockRejectedValue(new Error('relation matches does not exist'));
    const client = { query };
    await expect(persistMatchMetadata(client, matchRecord)).rejects.toThrow(/does not exist/);
  });
});
