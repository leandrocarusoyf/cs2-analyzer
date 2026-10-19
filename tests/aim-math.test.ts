import { describe, it, expect } from 'vitest';
import {
  calculatePreAimAngularError,
  calculateTimeToDamage,
  calculateCounterStrafingDelta,
  isTradeKill,
} from '../src/utils/aim-math.ts';

describe('Aim Math (cinemática de mira)', () => {
  describe('calculatePreAimAngularError', () => {
    it('deve resultar em ~0° quando o atacante mira exatamente na cabeça do alvo', () => {
      // Alvo ao longo de +X, mesma altura
      expect(calculatePreAimAngularError([0, 0, 0], 0, 0, [500, 0, 0])).toBeCloseTo(0, 6);
      // Alvo em diagonal 45° horizontal e 10° abaixo: yaw 45, pitch 10 (olhando para baixo)
      const pitch = 10 * (Math.PI / 180);
      const yaw = 45 * (Math.PI / 180);
      const target: [number, number, number] = [
        1000 * Math.cos(pitch) * Math.cos(yaw),
        1000 * Math.cos(pitch) * Math.sin(yaw),
        -1000 * Math.sin(pitch),
      ];
      expect(calculatePreAimAngularError([0, 0, 0], 45, 10, target)).toBeCloseTo(0, 5);
    });

    it('deve resultar em 90° exatos quando o alvo está a 90° horizontais da mira', () => {
      expect(calculatePreAimAngularError([0, 0, 0], 0, 0, [0, 300, 0])).toBeCloseTo(90, 9);
      expect(calculatePreAimAngularError([100, 100, 64], 90, 0, [400, 100, 64])).toBeCloseTo(90, 9);
    });

    it('deve devolver 180° para alvo diametralmente oposto e 0 para alvo coincidente', () => {
      expect(calculatePreAimAngularError([0, 0, 0], 0, 0, [-200, 0, 0])).toBeCloseTo(180, 9);
      expect(calculatePreAimAngularError([5, 5, 5], 30, 0, [5, 5, 5])).toBe(0);
    });
  });

  describe('calculateTimeToDamage', () => {
    it('a 64 tickrate, 16 ticks resultam em exatamente 250 ms', () => {
      expect(calculateTimeToDamage(1000, 1016, 64)).toBe(250);
    });

    it('protege contra ordem invertida de ticks', () => {
      expect(calculateTimeToDamage(1016, 1000, 64)).toBe(0);
    });
  });

  describe('calculateCounterStrafingDelta', () => {
    it('tiro 4 ticks após parar a 64 tickrate resulta em 62.5 ms', () => {
      expect(calculateCounterStrafingDelta(2000, 2004, 64)).toBe(62.5);
    });

    it('tiro antes de estabilizar resulta em valor negativo', () => {
      expect(calculateCounterStrafingDelta(2004, 2000, 64)).toBe(-62.5);
    });
  });

  describe('isTradeKill', () => {
    it('200 ticks a 64 tickrate (~3125 ms) é trade', () => {
      expect(isTradeKill(5000, 5200, 64)).toBe(true);
    });

    it('300 ticks a 64 tickrate (~4687 ms) não é trade', () => {
      expect(isTradeKill(5000, 5300, 64)).toBe(false);
    });

    it('respeita janela customizada e rejeita vingança anterior à morte', () => {
      expect(isTradeKill(5000, 5300, 64, 5000)).toBe(true);
      expect(isTradeKill(5000, 4990, 64)).toBe(false);
    });
  });
});

