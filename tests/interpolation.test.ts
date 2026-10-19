import { describe, it, expect } from 'vitest';
import {
  lerp,
  lerpAngleDegrees,
  interpolatePlayerFrames,
  classifyPlayerFloor,
  NUKE_VERTICAL_THRESHOLD_Z,
} from '../src/lib/replay/interpolation.ts';
import type { RawPlayerFrame } from '../src/types/replay.ts';

describe('Motor Matemático de Interpolação (LERP)', () => {
  describe('lerp()', () => {
    it('deve interpolar linearmente com t = 0, t = 0.5 e t = 1', () => {
      expect(lerp(100, 200, 0)).toBe(100);
      expect(lerp(100, 200, 0.5)).toBe(150);
      expect(lerp(100, 200, 1)).toBe(200);
    });

    it('deve aplicar clamping estrito para t < 0 e t > 1', () => {
      expect(lerp(100, 200, -0.5)).toBe(100);
      expect(lerp(100, 200, 1.8)).toBe(200);
    });
  });

  describe('lerpAngleDegrees()', () => {
    it('deve interpolar de 10° para 30° com t = 0.5 resultando em 20°', () => {
      expect(lerpAngleDegrees(10, 30, 0.5)).toBe(20);
    });

    it('deve interpolar pelo menor caminho de 350° para 10° (cruzando o zero) com t = 0.5 resultando em 0° (e nunca 180°)', () => {
      const angle = lerpAngleDegrees(350, 10, 0.5);
      expect(angle).not.toBe(180);
      expect(angle % 360).toBe(0);
    });

    it('deve interpolar pelo menor caminho de 10° para 350° com t = 0.5 resultando em 0°', () => {
      const angle = lerpAngleDegrees(10, 350, 0.5);
      expect(angle).not.toBe(180);
      expect(angle % 360).toBe(0);
    });
  });

  describe('Classificação de pisos da Nuke (classifyPlayerFloor)', () => {
    it('Z = -200 deve ser classificado como upper', () => {
      expect(classifyPlayerFloor(-200, 'de_nuke')).toBe('upper');
    });

    it('Z = -600 deve ser classificado como lower', () => {
      expect(classifyPlayerFloor(-600, 'de_nuke')).toBe('lower');
    });

    it('no threshold Z = -495 deve ser classificado como upper e mapas sem andares como default', () => {
      expect(classifyPlayerFloor(NUKE_VERTICAL_THRESHOLD_Z, 'de_nuke')).toBe('upper');
      expect(classifyPlayerFloor(-600, 'de_mirage')).toBe('default');
    });
  });

  describe('interpolatePlayerFrames()', () => {
    it('deve calcular a posição percentual intermediária, rotação pelo menor caminho e preservar dados discretos do frame mais recente', () => {
      // Em de_mirage: posX = -3230, posY = 1713, scale = 5.0
      // prevPlayer em worldX = -3230, worldY = 1713 -> pixel (0, 0) -> (0%, 0%)
      // nextPlayer em worldX = 1870, worldY = -3407 -> pixel (1020, 1024) -> (99.609375%, 100%)
      // Em t = 0.5 -> pixel (510, 512) -> percentX = (510 / 1024) * 100 = 49.8046875%, percentY = 50%
      const prevPlayer: RawPlayerFrame = [
        1, // playerId
        -3230, // worldX
        1713, // worldY
        0, // worldZ
        350, // yaw
        100, // hp
        100, // armor
        1, // hasHelmet
        1, // isAlive
        0, // isDefusing
        0, // isPlanting
        7, // activeWeaponId
        0, // flashDuration
        15, // ping
      ];

      const nextPlayer: RawPlayerFrame = [
        1, // playerId
        1870, // worldX
        -3407, // worldY
        128, // worldZ
        10, // yaw
        72, // hp
        85, // armor
        1, // hasHelmet
        1, // isAlive
        1, // isDefusing
        0, // isPlanting
        16, // activeWeaponId
        1.5, // flashDuration
        16, // ping
      ];

      const state = interpolatePlayerFrames(
        prevPlayer,
        nextPlayer,
        0.5,
        'de_mirage',
      );

      expect(state.playerId).toBe(1);
      expect(state.percentX).toBeCloseTo((510 / 1024) * 100, 6);
      expect(state.percentY).toBeCloseTo(50, 6);
      expect(state.worldZ).toBe(64);
      expect(state.currentFloor).toBe('default');
      expect(state.yaw % 360).toBe(0);

      // Dados discretos preservados do frame mais recente
      expect(state.hp).toBe(72);
      expect(state.armor).toBe(85);
      expect(state.isAlive).toBe(true);
      expect(state.isDefusing).toBe(true);
      expect(state.isPlanting).toBe(false);
      expect(state.activeWeaponId).toBe(16);
    });

    it('deve classificar corretamente currentFloor como lower na Nuke com Z interpolado abaixo de -495', () => {
      const prevPlayer: RawPlayerFrame = [
        1, -3453, 2887, -650, 0, 100, 100, 1, 1, 0, 0, 7, 0, 15,
      ];
      const nextPlayer: RawPlayerFrame = [
        1, -3453, 2887, -550, 0, 100, 100, 1, 1, 0, 0, 7, 0, 15,
      ];

      // Z interpolado: -600 (< -495 -> lower)
      const state = interpolatePlayerFrames(prevPlayer, nextPlayer, 0.5, 'de_nuke');
      expect(state.worldZ).toBe(-600);
      expect(state.currentFloor).toBe('lower');
    });
  });
});
