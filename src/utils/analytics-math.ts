function roundToTwoDecimals(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

/**
 * Calcula o Average Damage per Round (ADR) arredondado a duas casas decimais.
 * Devolve 0 de forma segura caso totalRounds <= 0.
 */
export function calculateADR(totalDamage: number, totalRounds: number): number {
  if (
    !Number.isFinite(totalDamage) ||
    !Number.isFinite(totalRounds) ||
    totalRounds <= 0 ||
    totalDamage <= 0
  ) {
    return 0;
  }

  return roundToTwoDecimals(totalDamage / totalRounds);
}

/**
 * Calcula o Kills per Round (KPR) arredondado a duas casas decimais.
 * Devolve 0 de forma segura caso totalRounds <= 0.
 */
export function calculateKPR(kills: number, totalRounds: number): number {
  if (
    !Number.isFinite(kills) ||
    !Number.isFinite(totalRounds) ||
    totalRounds <= 0 ||
    kills <= 0
  ) {
    return 0;
  }

  return roundToTwoDecimals(kills / totalRounds);
}

/**
 * Calcula o Deaths per Round (DPR) arredondado a duas casas decimais.
 * Devolve 0 de forma segura caso totalRounds <= 0.
 */
export function calculateDPR(deaths: number, totalRounds: number): number {
  if (
    !Number.isFinite(deaths) ||
    !Number.isFinite(totalRounds) ||
    totalRounds <= 0 ||
    deaths <= 0
  ) {
    return 0;
  }

  return roundToTwoDecimals(deaths / totalRounds);
}

/**
 * Calcula o Economy Rating (rácio de eficiência de dano causado por cada $1.000 investidos).
 * Fórmula: (damageDealt / moneySpent) * 1000
 * Devolve 0 de forma segura caso moneySpent <= 0.
 */
export function calculateEconomyRating(
  damageDealt: number,
  moneySpent: number,
): number {
  if (
    !Number.isFinite(damageDealt) ||
    !Number.isFinite(moneySpent) ||
    moneySpent <= 0 ||
    damageDealt <= 0
  ) {
    return 0;
  }

  return roundToTwoDecimals((damageDealt / moneySpent) * 1000);
}

/**
 * Normaliza uma métrica contínua para a escala [0..100] do gráfico radar (teia),
 * aplicando clamping estrito nos limites [minRef, maxRef].
 */
export function normalizeRadarMetric(
  value: number,
  minRef: number,
  maxRef: number,
): number {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(minRef) ||
    !Number.isFinite(maxRef) ||
    maxRef <= minRef
  ) {
    return 0;
  }

  const ratio = ((value - minRef) / (maxRef - minRef)) * 100;
  const clamped = Math.max(0, Math.min(100, ratio));

  return roundToTwoDecimals(clamped);
}

