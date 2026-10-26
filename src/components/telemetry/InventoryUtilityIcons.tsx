'use client';

import React from 'react';
import type { UtilityType } from '../../types/tactical-telemetry';

/**
 * Dicionário canônico de mapeamento dinâmico para ícones físicos de SVG de CS2.
 * Atende a convenção de arquivos físicos existentes no projeto (/icons/icon-*.svg,
 * /icons/weapons/*.svg e /icons/grenades/*.svg).
 */
export const iconMap: Record<string, string> = {
  // Rifles & Snipers
  weapon_ak47: '/icons/weapons/ak47.svg',
  ak47: '/icons/weapons/ak47.svg',
  'ak-47': '/icons/weapons/ak47.svg',
  weapon_m4a1: '/icons/weapons/m4a1.svg',
  m4a1: '/icons/weapons/m4a1.svg',
  weapon_m4a4: '/icons/weapons/m4a1.svg',
  m4a4: '/icons/weapons/m4a1.svg',
  weapon_m4a1_silencer: '/icons/weapons/m4a1_silencer.svg',
  m4a1_silencer: '/icons/weapons/m4a1_silencer.svg',
  'm4a1-s': '/icons/weapons/m4a1_silencer.svg',
  m4a1s: '/icons/weapons/m4a1_silencer.svg',
  weapon_awp: '/icons/weapons/awp.svg',
  awp: '/icons/weapons/awp.svg',
  weapon_famas: '/icons/weapons/famas.svg',
  famas: '/icons/weapons/famas.svg',
  weapon_galilar: '/icons/weapons/galilar.svg',
  galilar: '/icons/weapons/galilar.svg',
  'galil ar': '/icons/weapons/galilar.svg',
  galil: '/icons/weapons/galilar.svg',
  weapon_aug: '/icons/icon-aug.svg',
  aug: '/icons/icon-aug.svg',
  weapon_sg556: '/icons/icon-sg556.svg',
  sg556: '/icons/icon-sg556.svg',
  weapon_ssg08: '/icons/icon-ssg08.svg',
  ssg08: '/icons/icon-ssg08.svg',

  // Pistolas
  weapon_deagle: '/icons/icon-deagle.svg',
  deagle: '/icons/icon-deagle.svg',
  weapon_usp_silencer: '/icons/icon-usp_silencer.svg',
  usp_silencer: '/icons/icon-usp_silencer.svg',
  'usp-s': '/icons/icon-usp_silencer.svg',
  usp: '/icons/icon-usp_silencer.svg',
  weapon_glock: '/icons/icon-glock.svg',
  glock: '/icons/icon-glock.svg',
  weapon_p250: '/icons/icon-p250.svg',
  p250: '/icons/icon-p250.svg',
  weapon_cz75a: '/icons/icon-cz75a.svg',
  cz75a: '/icons/icon-cz75a.svg',
  weapon_tec9: '/icons/icon-tec9.svg',
  tec9: '/icons/icon-tec9.svg',
  weapon_fiveseven: '/icons/icon-fiveseven.svg',
  fiveseven: '/icons/icon-fiveseven.svg',
  weapon_elite: '/icons/icon-elite.svg',
  elite: '/icons/icon-elite.svg',

  // SMGs & Shotguns
  weapon_mp9: '/icons/icon-mp9.svg',
  mp9: '/icons/icon-mp9.svg',
  weapon_mac10: '/icons/icon-mac10.svg',
  mac10: '/icons/icon-mac10.svg',
  weapon_ump45: '/icons/icon-ump45.svg',
  ump45: '/icons/icon-ump45.svg',
  weapon_p90: '/icons/icon-p90.svg',
  p90: '/icons/icon-p90.svg',
  weapon_mag7: '/icons/icon-mag7.svg',
  mag7: '/icons/icon-mag7.svg',
  weapon_xm1014: '/icons/icon-xm1014.svg',
  xm1014: '/icons/icon-xm1014.svg',

  // Granadas
  weapon_flashbang: '/icons/grenades/flashbang.svg',
  flashbang: '/icons/grenades/flashbang.svg',
  flash: '/icons/grenades/flashbang.svg',
  weapon_smokegrenade: '/icons/grenades/smokegrenade.svg',
  smokegrenade: '/icons/grenades/smokegrenade.svg',
  smoke: '/icons/grenades/smokegrenade.svg',
  weapon_hegrenade: '/icons/grenades/hegrenade.svg',
  hegrenade: '/icons/grenades/hegrenade.svg',
  he: '/icons/grenades/hegrenade.svg',
  weapon_molotov: '/icons/grenades/molotov.svg',
  molotov: '/icons/grenades/molotov.svg',
  molly: '/icons/grenades/molotov.svg',
  weapon_incgrenade: '/icons/grenades/incgrenade.svg',
  incgrenade: '/icons/grenades/incgrenade.svg',
  incendiary: '/icons/grenades/incgrenade.svg',
  weapon_decoy: '/icons/grenades/decoy.svg',
  decoy: '/icons/grenades/decoy.svg',

  // Coletes, Kit de Defuse, C4 e Facas
  defuser: '/icons/icon-defuser.svg',
  defuse_kit: '/icons/icon-defuser.svg',
  defusekit: '/icons/icon-defuser.svg',
  kit: '/icons/icon-defuser.svg',
  shield: '/icons/icon-armor.svg',
  armor: '/icons/icon-armor.svg',
  kevlar: '/icons/icon-armor.svg',
  colete: '/icons/icon-armor.svg',
  vest: '/icons/icon-armor.svg',
  helmet: '/icons/icon-armor-helmet.svg',
  armor_helmet: '/icons/icon-armor-helmet.svg',
  kevlar_helmet: '/icons/icon-armor-helmet.svg',
  c4: '/icons/icon-c4.svg',
  weapon_c4: '/icons/icon-c4.svg',
  bomb: '/icons/icon-c4.svg',
  knife: '/icons/icon-knife.svg',
  weapon_knife: '/icons/icon-knife.svg',
  taser: '/icons/icon-taser.svg',
  zeus: '/icons/icon-taser.svg',
};

/**
 * Normaliza e resolve o caminho relativo correspondente ao SVG físico.
 */
export function getWeaponOrUtilityIcon(item: string): string {
  if (!item || typeof item !== 'string') {
    return '/icons/icon-knife.svg';
  }

  const clean = item.trim().toLowerCase();
  if (iconMap[clean]) {
    return iconMap[clean];
  }

  // Tenta sem prefixo 'weapon_'
  const unprefixed = clean.replace(/^weapon_/, '');
  if (iconMap[unprefixed]) {
    return iconMap[unprefixed];
  }

  // Substituição de hífens por sublinhas
  const normalized = clean.replace(/-/g, '_');
  if (iconMap[normalized]) {
    return iconMap[normalized];
  }

  return `/icons/icon-${unprefixed}.svg`;
}

export interface WeaponIconProps {
  name: string;
  className?: string;
  alt?: string;
  title?: string;
  tint?: 'amber' | 'orange' | 'emerald' | 'cyan' | 'blue' | 'white' | 'none';
}

/**
 * Componente dinâmico que mapeia qualquer arma, granada, colete, faca ou kit
 * diretamente aos arquivos físicos de SVG do projeto, aplicando estilização HUD CS2.
 */
export function WeaponIcon({
  name,
  className = 'w-3.5 h-3.5',
  alt,
  title,
  tint,
}: WeaponIconProps) {
  const iconSrc = getWeaponOrUtilityIcon(name);
  const cleanName = name.toLowerCase();

  // Determina tint baseado no tipo caso não seja especificado
  let computedFilterClass = '';
  if (tint) {
    if (tint === 'amber') computedFilterClass = 'brightness-0 saturate-100 invert-[88%] sepia-[60%] saturate-[1200%] hue-rotate-[340deg]';
    else if (tint === 'orange') computedFilterClass = 'brightness-0 saturate-100 invert-[65%] sepia-[85%] saturate-[2500%] hue-rotate-[0deg]';
    else if (tint === 'emerald') computedFilterClass = 'brightness-0 saturate-100 invert-[75%] sepia-[60%] saturate-[1400%] hue-rotate-[90deg]';
    else if (tint === 'cyan') computedFilterClass = 'brightness-0 saturate-100 invert-[80%] sepia-[80%] saturate-[2000%] hue-rotate-[140deg]';
    else if (tint === 'blue') computedFilterClass = 'brightness-0 saturate-100 invert-[60%] sepia-[90%] saturate-[1500%] hue-rotate-[180deg]';
  } else {
    // Tint automático HUD CS2
    if (cleanName.includes('flash')) {
      computedFilterClass = 'brightness-0 saturate-100 invert-[88%] sepia-[60%] saturate-[1200%] hue-rotate-[340deg]';
    } else if (cleanName.includes('molotov') || cleanName.includes('inc')) {
      computedFilterClass = 'brightness-0 saturate-100 invert-[65%] sepia-[85%] saturate-[2500%] hue-rotate-[0deg]';
    } else if (cleanName.includes('hegrenade') || cleanName === 'he') {
      computedFilterClass = 'brightness-0 saturate-100 invert-[75%] sepia-[60%] saturate-[1400%] hue-rotate-[90deg]';
    } else if (cleanName.includes('defus') || cleanName.includes('kit')) {
      computedFilterClass = 'brightness-0 saturate-100 invert-[80%] sepia-[80%] saturate-[2000%] hue-rotate-[140deg]';
    }
  }

  return (
    <img
      src={iconSrc}
      alt={alt || name}
      title={title || name}
      className={`inline-block select-none pointer-events-none object-contain ${computedFilterClass} ${className}`}
      loading="lazy"
    />
  );
}

export interface UtilityIconProps {
  type: UtilityType | string;
  className?: string;
  title?: string;
}

/**
 * Adaptador de utilitárias para compatibilidade que delega ao WeaponIcon
 */
export function UtilityIcon({ type, className = 'w-3 h-3', title }: UtilityIconProps) {
  return <WeaponIcon name={type} className={className} title={title} />;
}

export function TeamLogoIcon({
  logoType,
  color,
  className = 'w-3.5 h-3.5',
}: {
  logoType: 'navi' | 'faze' | 'generic';
  color: string;
  className?: string;
}) {
  if (logoType === 'navi') {
    return (
      <svg className={className} style={{ fill: color }} viewBox="0 0 24 24" aria-label="NAVI Logo">
        <path d="M4 4h3.2l7.6 11.2V4H18v16h-3.2L7.2 8.8V20H4V4z" />
      </svg>
    );
  }

  if (logoType === 'faze') {
    return (
      <svg className={className} style={{ fill: color }} viewBox="0 0 24 24" aria-label="FaZe Logo">
        <path d="M4 4h16v3.2H8v3.6h9v3.2H8V20H4V4z" />
      </svg>
    );
  }

  return (
    <svg className={className} style={{ fill: color }} viewBox="0 0 24 24" aria-label="Team Logo">
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}
