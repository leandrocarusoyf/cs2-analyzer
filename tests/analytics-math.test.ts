import { describe, it, expect } from 'vitest';
import {
  calculateADR,
  calculateKPR,
  calculateDPR,
  calculateEconomyRating,
  normalizeRadarMetric,
} from '../src/utils/analytics-math.ts';

describe('Analytics Math Functions (Player Stats Aggregation)', () => {
  describe('calculateADR, calculateKPR, calculateDPR', () => {
    it('deve calcular ADR, KPR e DPR com exatidão e arredondamento a duas casas decimais', () => {
      // 1955 de dano em 23 rounds = 85.00
      expect(calculateADR(1955, 23)).toBe(85);
      // 2000 de dano em 24 rounds = 83.3333... -> 83.33
      expect(calculateADR(2000, 24)).toBe(83.33);

      // 19 kills em 24 rounds = 0.79166... -> 0.79
      expect(calculateKPR(19, 24)).toBe(0.79);
      // 18 kills em 20 rounds = 0.9
      expect(calculateKPR(18, 20)).toBe(0.9);

      // 15 deaths em 24 rounds = 0.625 -> 0.63
      expect(calculateDPR(15, 24)).toBe(0.63);
    });

    it('deve devolver 0 de forma segura em divisões por zero ou entradas negativas', () => {
      expect(calculateADR(1500, 0)).toBe(0);
      expect(calculateADR(1500, -5)).toBe(0);
      expect(calculateADR(0, 20)).toBe(0);

      expect(calculateKPR(15, 0)).toBe(0);
      expect(calculateKPR(-2, 20)).toBe(0);

      expect(calculateDPR(14, 0)).toBe(0);
      expect(calculateDPR(0, 0)).toBe(0);
    });
  });

  describe('calculateEconomyRating()', () => {
    it('deve calcular o rácio de dano por cada $1.000 investidos com precisão de duas casas decimais', () => {
      // 290 de dano com $2,900 investidos = 100.00 de dano por $1,000
      expect(calculateEconomyRating(290, 2900)).toBe(100);

      // 450 de dano com $4,750 investidos = 94.7368... -> 94.74
      expect(calculateEconomyRating(450, 4750)).toBe(94.74);

      // Divisão segura quando moneySpent <= 0
      expect(calculateEconomyRating(300, 0)).toBe(0);
      expect(calculateEconomyRating(300, -1000)).toBe(0);
    });
  });

  describe('normalizeRadarMetric()', () => {
    it('deve projetar proporcionalmente para [0..100] e aplicar clamping estrito nos limites minRef e maxRef', () => {
      // Ponto médio exato: ADR 75 entre [50, 100] -> 50
      expect(normalizeRadarMetric(75, 50, 100)).toBe(50);

      // Quarto superior: Rating 1.25 entre [0.5, 1.5] -> 75
      expect(normalizeRadarMetric(1.25, 0.5, 1.5)).toBe(75);

      // Clamping abaixo de minRef -> 0
      expect(normalizeRadarMetric(30, 50, 100)).toBe(0);
      expect(normalizeRadarMetric(-10, 0, 100)).toBe(0);

      // Clamping acima de maxRef -> 100
      expect(normalizeRadarMetric(135, 50, 100)).toBe(100);

      // Caso degenerado (maxRef <= minRef) -> 0 seguro
      expect(normalizeRadarMetric(80, 100, 100)).toBe(0);
      expect(normalizeRadarMetric(80, 100, 50)).toBe(0);
    });
  });
});

