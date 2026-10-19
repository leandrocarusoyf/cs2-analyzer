import { MAP_CONFIGS, type CS2Map } from '../constants/maps.ts';
import type {
  GlobalFilterState,
  TacticalSide,
  TimeWindow,
} from '../types/filters.ts';

export const DEFAULT_FILTER_STATE: Readonly<GlobalFilterState> = Object.freeze({
  targetPlayerId: null,
  selectedMap: 'all',
  tacticalSide: 'both',
  timeWindow: 'last_10',
});

const VALID_TACTICAL_SIDES = new Set<TacticalSide>(['both', 'ct', 't']);
const VALID_TIME_WINDOWS = new Set<TimeWindow>([
  'last_5',
  'last_10',
  'last_20',
  'all',
]);

function isValidCS2Map(value: string): value is CS2Map {
  return Object.hasOwn(MAP_CONFIGS, value);
}

function isValidTacticalSide(value: string): value is TacticalSide {
  return VALID_TACTICAL_SIDES.has(value as TacticalSide);
}

function isValidTimeWindow(value: string): value is TimeWindow {
  return VALID_TIME_WINDOWS.has(value as TimeWindow);
}

/**
 * Faz o parsing defensivo de URLSearchParams para GlobalFilterState,
 * aplicando valores fallback padronizados caso parâmetros estejam ausentes ou inválidos.
 */
export function parseFilterParams(params: URLSearchParams): GlobalFilterState {
  const rawPlayerId =
    params.get('targetPlayerId') ?? params.get('player') ?? null;
  const trimmedPlayerId = rawPlayerId !== null ? rawPlayerId.trim() : null;
  const targetPlayerId =
    trimmedPlayerId && trimmedPlayerId.length > 0
      ? trimmedPlayerId
      : DEFAULT_FILTER_STATE.targetPlayerId;

  const rawMap = params.get('selectedMap') ?? params.get('map');
  const selectedMap: CS2Map | 'all' =
    rawMap !== null && isValidCS2Map(rawMap)
      ? rawMap
      : DEFAULT_FILTER_STATE.selectedMap;

  const rawSide = params.get('tacticalSide') ?? params.get('side');
  const tacticalSide: TacticalSide =
    rawSide !== null && isValidTacticalSide(rawSide)
      ? rawSide
      : DEFAULT_FILTER_STATE.tacticalSide;

  const rawWindow = params.get('timeWindow') ?? params.get('window');
  const timeWindow: TimeWindow =
    rawWindow !== null && isValidTimeWindow(rawWindow)
      ? rawWindow
      : DEFAULT_FILTER_STATE.timeWindow;

  return {
    targetPlayerId,
    selectedMap,
    tacticalSide,
    timeWindow,
  };
}

/**
 * Serializa um estado parcial ou completo de filtros para URLSearchParams,
 * omitindo valores que correspondam aos defaults padronizados para manter a URL limpa.
 */
export function serializeFilterParams(
  state: Partial<GlobalFilterState>,
): URLSearchParams {
  const params = new URLSearchParams();

  const targetPlayerId =
    typeof state.targetPlayerId === 'string'
      ? state.targetPlayerId.trim()
      : null;
  if (
    targetPlayerId !== null &&
    targetPlayerId.length > 0 &&
    targetPlayerId !== DEFAULT_FILTER_STATE.targetPlayerId
  ) {
    params.set('targetPlayerId', targetPlayerId);
  }

  if (
    state.selectedMap !== undefined &&
    state.selectedMap !== DEFAULT_FILTER_STATE.selectedMap &&
    isValidCS2Map(state.selectedMap)
  ) {
    params.set('selectedMap', state.selectedMap);
  }

  if (
    state.tacticalSide !== undefined &&
    state.tacticalSide !== DEFAULT_FILTER_STATE.tacticalSide &&
    isValidTacticalSide(state.tacticalSide)
  ) {
    params.set('tacticalSide', state.tacticalSide);
  }

  if (
    state.timeWindow !== undefined &&
    state.timeWindow !== DEFAULT_FILTER_STATE.timeWindow &&
    isValidTimeWindow(state.timeWindow)
  ) {
    params.set('timeWindow', state.timeWindow);
  }

  return params;
}
