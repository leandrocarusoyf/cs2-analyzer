export interface AimDuelEvent {
  duelId: string;
  attackerId: number;
  victimId: number;
  firstSightTick: number;
  firstDamageTick: number | null;
  killTick: number | null;
  attackerVelocityAtShot: number;
  shotTick: number;
  counterStrafingStopTick: number;
  preAimErrorDegrees: number;
  isFirstShotHit: boolean;
  weaponId: number;
}

export interface AimMetricsSummary {
  /** TTD: (firstDamageTick - firstSightTick) * (1000 / tickrate) */
  timeToDamageMs: number | null;
  /** TTK: (killTick - firstDamageTick) * (1000 / tickrate) */
  timeToKillMs: number | null;
  /** Desvio retículo-alvo (graus) no frame de contato visual */
  preAimAngularError: number;
  /** Intervalo (ms) entre desaceleração e clique de disparo */
  counterStrafingDeltaMs: number;
  /** Eliminações até 4000ms após a morte de um aliado próximo */
  tradeWindowKills: number;
}

