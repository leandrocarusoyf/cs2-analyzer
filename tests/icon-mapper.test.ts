import { describe, it, expect } from 'vitest';
import {
  getWeaponIconPath,
  getEventIconPath,
  DEFAULT_WEAPON_FALLBACK,
  DEFAULT_EVENT_FALLBACK,
} from '../src/utils/icon-mapper.ts';

describe('Valve Canonical SVG Icon Mapper (icon-mapper.ts)', () => {
  describe('getWeaponIconPath - Armas principais e modos padrão vs outline', () => {
    it('deve mapear AK-47 corretamente em modo normal e outline', () => {
      expect(getWeaponIconPath('weapon_ak47')).toBe('/icons/icon-ak47.svg');
      expect(getWeaponIconPath('ak47')).toBe('/icons/icon-ak47.svg');
      expect(getWeaponIconPath('AK-47')).toBe('/icons/icon-ak47.svg');
      expect(getWeaponIconPath(7)).toBe('/icons/icon-ak47.svg');

      // Outline
      expect(getWeaponIconPath('weapon_ak47', true)).toBe('/icons/outline-icon-ak47.svg');
      expect(getWeaponIconPath('ak47', true)).toBe('/icons/outline-icon-ak47.svg');
      expect(getWeaponIconPath(7, true)).toBe('/icons/outline-icon-ak47.svg');
    });

    it('deve mapear M4A1-S e M4A4 corretamente em modo normal e outline', () => {
      // M4A1 Silencer
      expect(getWeaponIconPath('weapon_m4a1_silencer')).toBe('/icons/icon-m4a1_silencer.svg');
      expect(getWeaponIconPath('m4a1-s')).toBe('/icons/icon-m4a1_silencer.svg');
      expect(getWeaponIconPath('M4A1-S')).toBe('/icons/icon-m4a1_silencer.svg');
      expect(getWeaponIconPath(60)).toBe('/icons/icon-m4a1_silencer.svg');
      expect(getWeaponIconPath(60, true)).toBe('/icons/outline-icon-m4a1_silencer.svg');

      // M4A4 / M4A1 Valve base
      expect(getWeaponIconPath('weapon_m4a1')).toBe('/icons/icon-m4a1.svg');
      expect(getWeaponIconPath('m4a4')).toBe('/icons/icon-m4a1.svg');
      expect(getWeaponIconPath(16)).toBe('/icons/icon-m4a1.svg');
      expect(getWeaponIconPath(16, true)).toBe('/icons/outline-icon-m4a1.svg');
    });

    it('deve mapear AWP corretamente em modo normal e outline', () => {
      expect(getWeaponIconPath('weapon_awp')).toBe('/icons/icon-awp.svg');
      expect(getWeaponIconPath('awp')).toBe('/icons/icon-awp.svg');
      expect(getWeaponIconPath('AWP')).toBe('/icons/icon-awp.svg');
      expect(getWeaponIconPath(9)).toBe('/icons/icon-awp.svg');
      expect(getWeaponIconPath(9, true)).toBe('/icons/outline-icon-awp.svg');
    });

    it('deve mapear armas secundárias e pistolas', () => {
      expect(getWeaponIconPath('deagle')).toBe('/icons/icon-deagle.svg');
      expect(getWeaponIconPath('Desert Eagle')).toBe('/icons/icon-deagle.svg');
      expect(getWeaponIconPath(1)).toBe('/icons/icon-deagle.svg');
      expect(getWeaponIconPath(1, true)).toBe('/icons/outline-icon-deagle.svg');

      expect(getWeaponIconPath('USP-S')).toBe('/icons/icon-usp_silencer.svg');
      expect(getWeaponIconPath(61)).toBe('/icons/icon-usp_silencer.svg');
      expect(getWeaponIconPath(61, true)).toBe('/icons/outline-icon-usp_silencer.svg');

      expect(getWeaponIconPath('Galil AR')).toBe('/icons/icon-galilar.svg');
      expect(getWeaponIconPath('galilar')).toBe('/icons/icon-galilar.svg');
      expect(getWeaponIconPath(13)).toBe('/icons/icon-galilar.svg');
    });

    it('deve mapear facas e utilitários', () => {
      expect(getWeaponIconPath('knife_karambit')).toBe('/icons/icon-knife_karambit.svg');
      expect(getWeaponIconPath('knife_karambit', true)).toBe('/icons/outline-icon-knife_karambit.svg');
      expect(getWeaponIconPath('knife_m9_bayonet')).toBe('/icons/icon-knife_m9_bayonet.svg');
      expect(getWeaponIconPath('smokegrenade')).toBe('/icons/icon-smokegrenade.svg');
      expect(getWeaponIconPath('flashbang')).toBe('/icons/icon-flashbang.svg');
    });

    it('deve retornar fallback seguro para armas ou IDs desconhecidos', () => {
      expect(getWeaponIconPath('unknown_alien_blaster')).toBe(DEFAULT_WEAPON_FALLBACK);
      expect(getWeaponIconPath(99999)).toBe(DEFAULT_WEAPON_FALLBACK);
      expect(getWeaponIconPath('')).toBe(DEFAULT_WEAPON_FALLBACK);
      expect(DEFAULT_WEAPON_FALLBACK).toBe('/icons/icon-knife.svg');
    });
  });

  describe('getEventIconPath - Eventos, C4 e Equipamentos', () => {
    it('deve mapear headshot e suas variações', () => {
      expect(getEventIconPath('headshot')).toBe('/icons/icon-headshot.svg');
      expect(getEventIconPath('hs')).toBe('/icons/icon-headshot.svg');
      expect(getEventIconPath('HEADSHOT')).toBe('/icons/icon-headshot.svg');
    });

    it('deve mapear eventos de bomba (C4, Planted)', () => {
      expect(getEventIconPath('c4')).toBe('/icons/icon-c4.svg');
      expect(getEventIconPath('bomb')).toBe('/icons/icon-c4.svg');
      expect(getEventIconPath('planted')).toBe('/icons/icon-bomb-planted.svg');
      expect(getEventIconPath('bomb_planted')).toBe('/icons/icon-bomb-planted.svg');
    });

    it('deve mapear defuse kit e equipamentos de armadura', () => {
      expect(getEventIconPath('defuser')).toBe('/icons/icon-defuser.svg');
      expect(getEventIconPath('defusekit')).toBe('/icons/icon-defuser.svg');
      expect(getEventIconPath('kit')).toBe('/icons/icon-defuser.svg');

      expect(getEventIconPath('armor')).toBe('/icons/icon-armor.svg');
      expect(getEventIconPath('kevlar')).toBe('/icons/icon-armor.svg');
      expect(getEventIconPath('helmet')).toBe('/icons/icon-armor-helmet.svg');
      expect(getEventIconPath('armor_helmet')).toBe('/icons/icon-armor-helmet.svg');
    });

    it('deve retornar fallback seguro para eventos desconhecidos', () => {
      expect(getEventIconPath('quantum_tunnel')).toBe(DEFAULT_EVENT_FALLBACK);
      expect(getEventIconPath('')).toBe(DEFAULT_EVENT_FALLBACK);
      expect(DEFAULT_EVENT_FALLBACK).toBe('/icons/icon-knife.svg');
    });
  });
});

