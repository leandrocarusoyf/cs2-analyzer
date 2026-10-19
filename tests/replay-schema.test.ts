import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  replayDataPackageSchema,
  rawPlayerFrameSchema,
} from '../src/contracts/replay.schema.ts';
import type { ReplayDataPackage, RawPlayerFrame } from '../src/types/replay.ts';

function createValidMinimalPayload(): ReplayDataPackage {
  const validPlayerFrame: RawPlayerFrame = [
    1, // playerId
    -1200.5, // worldX
    850.25, // worldY
    64.0, // worldZ
    180.0, // yaw
    100, // hp
    100, // armor
    1, // hasHelmet
    1, // isAlive
    0, // isDefusing
    0, // isPlanting
    7, // activeWeaponId (e.g., ak47)
    0, // flashDuration
    18, // ping
  ];

  return {
    formatVersion: '1.0',
    tickrate: 64,
    samplingRate: 4,
    map: 'de_mirage',
    playersManifest: [
      {
        id: 1,
        steamId: '76561198000000001',
        name: 'fallen',
        initialTeam: 'T',
      },
      {
        id: 2,
        steamId: '76561198000000002',
        name: 'kscerato',
        initialTeam: 'CT',
      },
    ],
    weaponsManifest: [
      { id: 7, name: 'weapon_ak47' },
      { id: 16, name: 'weapon_m4a1' },
    ],
    rounds: [
      {
        roundNumber: 1,
        startTick: 1000,
        endTick: 4200,
        winnerSide: 'T',
        winReason: 'target_bombed',
        events: {
          damages: [[1500, 1, 2, 108, 'head', 7]],
          kills: [[1500, 1, 2, 7, true, false]],
          utility: [[1200, 'SMOKE', -1050.0, 500.0, 64.0, 1200, 2352]],
          bomb: [[2100, 'bomb_planted', 1, -1100.0, -250.0]],
        },
        frames: [[1000, [validPlayerFrame]]],
      },
    ],
  };
}

describe('ReplayDataPackage Schema Validation', () => {
  it('deve validar um payload mínimo válido com sucesso', () => {
    const payload = createValidMinimalPayload();
    const result = replayDataPackageSchema.safeParse(payload);

    assert.equal(result.success, true);
    assert.deepEqual(result.data, payload);
  });

  it('deve falhar quando o vetor do jogador (RawPlayerFrame) tiver 13 ou 15 itens', () => {
    const validTuple = [
      1, -1200.5, 850.25, 64.0, 180.0, 100, 100, 1, 1, 0, 0, 7, 0, 18,
    ];

    const tupleWith13Items = validTuple.slice(0, 13);
    const tupleWith15Items = [...validTuple, 999];

    assert.equal(rawPlayerFrameSchema.safeParse(tupleWith13Items).success, false);
    assert.equal(rawPlayerFrameSchema.safeParse(tupleWith15Items).success, false);

    const payload13 = createValidMinimalPayload();
    payload13.rounds[0].frames[0][1] = [tupleWith13Items as unknown as RawPlayerFrame];
    assert.equal(replayDataPackageSchema.safeParse(payload13).success, false);

    const payload15 = createValidMinimalPayload();
    payload15.rounds[0].frames[0][1] = [tupleWith15Items as unknown as RawPlayerFrame];
    assert.equal(replayDataPackageSchema.safeParse(payload15).success, false);
  });

  it('deve falhar caso o mapa não pertença à rotação competitiva oficial', () => {
    const payload = createValidMinimalPayload();
    (payload as { map: string }).map = 'de_cbble';

    const result = replayDataPackageSchema.safeParse(payload);
    assert.equal(result.success, false);
  });

  it('deve validar restrições de domínio nos campos de RawPlayerFrame (hp, yaw e flags binárias)', () => {
    const baseTuple = [
      1, -1200.5, 850.25, 64.0, 180.0, 100, 100, 1, 1, 0, 0, 7, 0, 18,
    ];

    const invalidHp = [...baseTuple];
    invalidHp[5] = 105; // hp > 100
    assert.equal(rawPlayerFrameSchema.safeParse(invalidHp).success, false);

    const invalidYaw = [...baseTuple];
    invalidYaw[4] = 361; // yaw > 360
    assert.equal(rawPlayerFrameSchema.safeParse(invalidYaw).success, false);

    const invalidFlag = [...baseTuple];
    invalidFlag[8] = 2; // isAlive != 0 | 1
    assert.equal(rawPlayerFrameSchema.safeParse(invalidFlag).success, false);
  });
});

