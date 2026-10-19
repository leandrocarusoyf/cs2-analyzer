import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  DEFAULT_FILTER_STATE,
  parseFilterParams,
  serializeFilterParams,
} from '../src/utils/filter-params.ts';
import type { GlobalFilterState } from '../src/types/filters.ts';

describe('URL Filter Params (parseFilterParams & serializeFilterParams)', () => {
  it('deve retornar os valores default exatos quando URLSearchParams estiver vazia', () => {
    const emptyParams = new URLSearchParams();
    const state = parseFilterParams(emptyParams);

    assert.deepEqual(state, {
      targetPlayerId: null,
      selectedMap: 'all',
      tacticalSide: 'both',
      timeWindow: 'last_10',
    });
    assert.deepEqual(state, DEFAULT_FILTER_STATE);
  });

  it('deve fazer o parsing corretamente com valores customizados válidos', () => {
    const params = new URLSearchParams({
      targetPlayerId: '76561197960287930',
      selectedMap: 'de_inferno',
      tacticalSide: 'ct',
      timeWindow: 'last_20',
    });

    const state = parseFilterParams(params);

    assert.deepEqual(state, {
      targetPlayerId: '76561197960287930',
      selectedMap: 'de_inferno',
      tacticalSide: 'ct',
      timeWindow: 'last_20',
    });
  });

  it('deve aplicar fallback defensivo caso valores ilegais sejam injetados na URL', () => {
    const corruptedParams = new URLSearchParams({
      targetPlayerId: '   ',
      selectedMap: 'de_aztec',
      tacticalSide: 'sniper',
      timeWindow: 'last_999',
    });

    const state = parseFilterParams(corruptedParams);

    assert.deepEqual(state, {
      targetPlayerId: null,
      selectedMap: 'all',
      tacticalSide: 'both',
      timeWindow: 'last_10',
    });
  });

  it('deve manter paridade na serialização bidirecional (parse -> serialize -> parse) e omitir valores default da URL', () => {
    const customInput = new URLSearchParams({
      targetPlayerId: 'player_42',
      selectedMap: 'de_anubis',
      tacticalSide: 't',
      timeWindow: 'last_5',
    });

    const parsedOnce = parseFilterParams(customInput);
    const serialized = serializeFilterParams(parsedOnce);
    const parsedTwice = parseFilterParams(serialized);

    assert.deepEqual(parsedTwice, parsedOnce);
    assert.equal(
      serialized.toString(),
      'targetPlayerId=player_42&selectedMap=de_anubis&tacticalSide=t&timeWindow=last_5',
    );

    const defaultSerialized = serializeFilterParams(DEFAULT_FILTER_STATE);
    assert.equal(defaultSerialized.toString(), '');
    assert.deepEqual(parseFilterParams(defaultSerialized), DEFAULT_FILTER_STATE);

    const partialState: Partial<GlobalFilterState> = {
      selectedMap: 'de_nuke',
      tacticalSide: 'both', // valor default, deve ser omitido
    };
    const partialSerialized = serializeFilterParams(partialState);
    assert.equal(partialSerialized.toString(), 'selectedMap=de_nuke');
    assert.deepEqual(parseFilterParams(partialSerialized), {
      targetPlayerId: null,
      selectedMap: 'de_nuke',
      tacticalSide: 'both',
      timeWindow: 'last_10',
    });
  });
});

