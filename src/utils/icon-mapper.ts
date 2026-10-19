/**
 * Mapa canônico de ícones SVG da Valve para armas, granadas, facas e eventos de CS2.
 * Todos os assets residem na pasta /public/icons/.
 */

export const DEFAULT_WEAPON_FALLBACK = '/icons/icon-knife.svg';
export const DEFAULT_EVENT_FALLBACK = '/icons/icon-knife.svg';

const NUMERIC_WEAPON_ID_MAP: Record<number, string> = {
  1: 'deagle',
  2: 'elite',
  3: 'fiveseven',
  4: 'glock',
  7: 'ak47',
  8: 'aug',
  9: 'awp',
  10: 'famas',
  11: 'g3sg1',
  13: 'galilar',
  14: 'm249',
  16: 'm4a1', // M4A4 no CS2
  17: 'mac10',
  19: 'p90',
  23: 'mp5sd',
  24: 'ump45',
  25: 'xm1014',
  26: 'bizon',
  27: 'mag7',
  28: 'negev',
  29: 'sawedoff',
  30: 'tec9',
  31: 'taser',
  32: 'p250',
  34: 'mp9',
  35: 'nova',
  36: 'p90',
  38: 'scar20',
  39: 'sg556',
  40: 'ssg08',
  42: 'knife',
  43: 'flashbang',
  44: 'hegrenade',
  45: 'smokegrenade',
  46: 'molotov',
  47: 'decoy',
  48: 'incgrenade',
  49: 'c4',
  60: 'm4a1_silencer',
  61: 'usp_silencer',
  63: 'cz75a',
  64: 'revolver',
};

const KNIFE_VARIANTS = new Set([
  'bayonet',
  'knife_butterfly',
  'knife_canis',
  'knife_cord',
  'knife_css',
  'knife_ct',
  'knife_falchion',
  'knife_flip',
  'knife_gut',
  'knife_gypsy_jackknife',
  'knife_karambit',
  'knife_m9_bayonet',
  'knife_push',
  'knife_stiletto',
  'knife_survival_bowie',
  'knife_t',
  'knife_tactical',
  'knife_ursus',
  'knife_widowmaker',
]);

const WEAPON_ICON_DICT: Record<string, string> = {
  // Rifles & Snipers
  ak47: 'icon-ak47.svg',
  m4a1: 'icon-m4a1.svg',
  m4a4: 'icon-m4a1.svg',
  m4a1_silencer: 'icon-m4a1_silencer.svg',
  awp: 'icon-awp.svg',
  galilar: 'icon-galilar.svg',
  famas: 'icon-famas.svg',
  aug: 'icon-aug.svg',
  sg556: 'icon-sg556.svg',
  sg552: 'icon-sg552.svg',
  ssg08: 'icon-ssg08.svg',
  scar20: 'icon-scar20.svg',
  g3sg1: 'icon-g3sg1.svg',

  // Pistolas
  deagle: 'icon-deagle.svg',
  usp_silencer: 'icon-usp_silencer.svg',
  glock: 'icon-glock.svg',
  p250: 'icon-p250.svg',
  cz75a: 'icon-cz75a.svg',
  tec9: 'icon-tec9.svg',
  fiveseven: 'icon-fiveseven.svg',
  hkp2000: 'icon-hkp2000.svg',
  elite: 'icon-elite.svg',
  revolver: 'icon-revolver.svg',
  taser: 'icon-taser.svg',

  // SMGs
  mp9: 'icon-mp9.svg',
  mac10: 'icon-mac10.svg',
  mp7: 'icon-mp7.svg',
  ump45: 'icon-ump45.svg',
  p90: 'icon-p90.svg',
  bizon: 'icon-bizon.svg',

  // Pesadas / Shotguns
  xm1014: 'icon-xm1014.svg',
  mag7: 'icon-mag7.svg',
  nova: 'icon-nova.svg',
  sawedoff: 'icon-sawedoff.svg',
  m249: 'icon-m249.svg',
  negev: 'icon-negev.svg',

  // Granadas
  flashbang: 'icon-flashbang.svg',
  smokegrenade: 'icon-smokegrenade.svg',
  hegrenade: 'icon-hegrenade.svg',
  molotov: 'icon-molotov.svg',
  incgrenade: 'icon-incgrenade.svg',
  decoy: 'icon-decoy.svg',

  // Facas
  knife: 'icon-knife.svg',
};

const KNOWN_OUTLINE_ICONS = new Set([
  'ak47',
  'aug',
  'awp',
  'bayonet',
  'bizon',
  'cz75a',
  'deagle',
  'decoy',
  'elite',
  'famas',
  'fiveseven',
  'flashbang',
  'g3sg1',
  'galilar',
  'glock',
  'hegrenade',
  'hkp2000',
  'incgrenade',
  'knife_butterfly',
  'knife_canis',
  'knife_cord',
  'knife_css',
  'knife_ct',
  'knife_falchion',
  'knife_flip',
  'knife_gut',
  'knife_karambit',
  'knife_m9_bayonet',
  'knife_push',
  'knife_survival_bowie',
  'knife_t',
  'knife_tactical',
  'knife_ursus',
  'knife_widowmaker',
  'm249',
  'm4a1',
  'm4a1_silencer',
  'mac10',
  'mag7',
  'molotov',
  'mp7',
  'mp9',
  'negev',
  'nova',
  'p250',
  'p90',
  'revolver',
  'sawedoff',
  'scar20',
  'sg552',
  'sg556',
  'ssg08',
  'taser',
  'tec9',
  'ump45',
  'usp_silencer',
  'xm1014',
]);

const EVENT_ICON_DICT: Record<string, string> = {
  headshot: '/icons/icon-headshot.svg',
  hs: '/icons/icon-headshot.svg',
  c4: '/icons/icon-c4.svg',
  bomb: '/icons/icon-c4.svg',
  planted: '/icons/icon-bomb-planted.svg',
  bomb_planted: '/icons/icon-bomb-planted.svg',
  defuser: '/icons/icon-defuser.svg',
  defuse: '/icons/icon-defuser.svg',
  defusekit: '/icons/icon-defuser.svg',
  kit: '/icons/icon-defuser.svg',
  suicide: '/icons/icon-suicide.svg',
  kevlar: '/icons/icon-armor.svg',
  armor: '/icons/icon-armor.svg',
  helmet: '/icons/icon-armor-helmet.svg',
  armor_helmet: '/icons/icon-armor-helmet.svg',
  kevlar_helmet: '/icons/icon-armor-helmet.svg',
};

/**
 * Normaliza o identificador da arma a partir de número ou string (ex: 'weapon_ak47', 'AK-47', 7).
 */
function normalizeWeaponKey(weapon: string | number): string {
  if (weapon === undefined || weapon === null || weapon === '') {
    return 'unknown';
  }

  if (typeof weapon === 'number') {
    return NUMERIC_WEAPON_ID_MAP[weapon] ?? 'unknown';
  }

  let cleaned = String(weapon).trim().toLowerCase();
  cleaned = cleaned.replace(/^weapon_/, '');
  cleaned = cleaned.replace(/[-\s]/g, '_');

  const wpnMatch = cleaned.match(/^wpn_#?(\d+)$/);
  if (wpnMatch) {
    return NUMERIC_WEAPON_ID_MAP[Number(wpnMatch[1])] ?? 'unknown';
  }

  // Aliases comuns
  if (cleaned === 'ak_47' || cleaned === 'ak') return 'ak47';
  if (cleaned === 'm4a4') return 'm4a1';
  if (cleaned === 'm4a1_s' || cleaned === 'm4a1s') return 'm4a1_silencer';
  if (cleaned === 'usp' || cleaned === 'usps' || cleaned === 'usp_s') return 'usp_silencer';
  if (cleaned === 'galil' || cleaned === 'galil_ar') return 'galilar';
  if (cleaned === 'scout' || cleaned === 'ssg_08') return 'ssg08';
  if (cleaned === 'scar_20') return 'scar20';
  if (cleaned === 'mag_7') return 'mag7';
  if (cleaned === 'mp5_sd') return 'mp5sd';
  if (cleaned === 'sawed_off') return 'sawedoff';
  if (cleaned === 'desert_eagle') return 'deagle';
  if (cleaned === 'dual_berettas' || cleaned === 'dual_elites' || cleaned === 'elites') return 'elite';
  if (cleaned === 'zeus' || cleaned === 'zeus_x27') return 'taser';
  if (cleaned === 'five_seven') return 'fiveseven';
  if (cleaned === 'cz75' || cleaned === 'cz_75') return 'cz75a';
  if (cleaned === 'tec_9') return 'tec9';
  if (cleaned === 'sg553') return 'sg556';
  if (cleaned === 'smoke') return 'smokegrenade';
  if (cleaned === 'he') return 'hegrenade';
  if (cleaned === 'flash') return 'flashbang';
  if (cleaned === 'molly') return 'molotov';

  return cleaned;
}

/**
 * Retorna o caminho relativo do SVG da arma correspondente em /icons/.
 * Se useOutline for true e o outline existir, retorna /icons/outline-icon-[arma].svg.
 * Fallback seguro: /icons/icon-knife.svg.
 */
export function getWeaponIconPath(
  weapon: string | number,
  useOutline = false,
): string {
  const key = normalizeWeaponKey(weapon);

  if (key === 'knife') {
    return DEFAULT_WEAPON_FALLBACK;
  }

  // Verificação de variantes de faca
  if (KNIFE_VARIANTS.has(key)) {
    if (useOutline) {
      if (key === 'knife_stiletto') return '/icons/outiline-icon-knife_stiletto.svg';
      if (key === 'knife_gypsy_jackknife') return '/icons/outiline-icon-knife_gypsy_jackknife.svg';
      if (KNOWN_OUTLINE_ICONS.has(key)) {
        return `/icons/outline-icon-${key}.svg`;
      }
    }
    return `/icons/icon-${key}.svg`;
  }

  // Verificação de facas com prefixo knife_
  if (key.startsWith('knife_') || key.includes('bayonet')) {
    const matched = Array.from(KNIFE_VARIANTS).find((variant) =>
      key.includes(variant),
    );
    if (matched) {
      if (useOutline) {
        if (matched === 'knife_stiletto') return '/icons/outiline-icon-knife_stiletto.svg';
        if (matched === 'knife_gypsy_jackknife') return '/icons/outiline-icon-knife_gypsy_jackknife.svg';
        if (KNOWN_OUTLINE_ICONS.has(matched)) {
          return `/icons/outline-icon-${matched}.svg`;
        }
      }
      return `/icons/icon-${matched}.svg`;
    }
    return DEFAULT_WEAPON_FALLBACK;
  }

  const baseFileName = WEAPON_ICON_DICT[key];
  if (!baseFileName) {
    return DEFAULT_WEAPON_FALLBACK;
  }

  if (useOutline && KNOWN_OUTLINE_ICONS.has(key)) {
    return `/icons/outline-icon-${key}.svg`;
  }

  return `/icons/${baseFileName}`;
}

/**
 * Retorna o caminho relativo do SVG de eventos/objetivos (headshot, c4, defuser, kevlar, helmet).
 * Fallback seguro: /icons/icon-knife.svg.
 */
export function getEventIconPath(event: string): string {
  if (!event || typeof event !== 'string') {
    return DEFAULT_EVENT_FALLBACK;
  }

  const cleaned = event.trim().toLowerCase().replace(/[-\s]/g, '_');
  return EVENT_ICON_DICT[cleaned] ?? DEFAULT_EVENT_FALLBACK;
}
