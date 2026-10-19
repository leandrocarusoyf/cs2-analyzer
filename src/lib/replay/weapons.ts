export interface WeaponInfo {
  name: string;
  category: 'rifle' | 'sniper' | 'smg' | 'heavy' | 'pistol' | 'knife' | 'grenade' | 'c4';
  ptBrName: string;
}

const WEAPON_REGISTRY: Record<string, WeaponInfo> = {
  weapon_ak47: { name: 'AK-47', category: 'rifle', ptBrName: 'AK-47' },
  weapon_m4a1_silencer: { name: 'M4A1-S', category: 'rifle', ptBrName: 'M4A1-S' },
  weapon_m4a1: { name: 'M4A4', category: 'rifle', ptBrName: 'M4A4' },
  weapon_awp: { name: 'AWP', category: 'sniper', ptBrName: 'AWP' },
  weapon_galilar: { name: 'Galil AR', category: 'rifle', ptBrName: 'Galil AR' },
  weapon_famas: { name: 'FAMAS', category: 'rifle', ptBrName: 'FAMAS' },
  weapon_ssg08: { name: 'SSG 08', category: 'sniper', ptBrName: 'SSG 08' },
  weapon_sg556: { name: 'SG 553', category: 'rifle', ptBrName: 'SG 553' },
  weapon_aug: { name: 'AUG', category: 'rifle', ptBrName: 'AUG' },
  weapon_deagle: { name: 'Desert Eagle', category: 'pistol', ptBrName: 'Desert Eagle' },
  weapon_usp_silencer: { name: 'USP-S', category: 'pistol', ptBrName: 'USP-S' },
  weapon_glock: { name: 'Glock-18', category: 'pistol', ptBrName: 'Glock-18' },
  weapon_p250: { name: 'P250', category: 'pistol', ptBrName: 'P250' },
  weapon_cz75a: { name: 'CZ75-Auto', category: 'pistol', ptBrName: 'CZ75-Auto' },
  weapon_fiveseven: { name: 'Five-SeveN', category: 'pistol', ptBrName: 'Five-SeveN' },
  weapon_tec9: { name: 'Tec-9', category: 'pistol', ptBrName: 'Tec-9' },
  weapon_elite: { name: 'Dual Berettas', category: 'pistol', ptBrName: 'Dual Berettas' },
  weapon_mp9: { name: 'MP9', category: 'smg', ptBrName: 'MP9' },
  weapon_mac10: { name: 'MAC-10', category: 'smg', ptBrName: 'MAC-10' },
  weapon_mp7: { name: 'MP7', category: 'smg', ptBrName: 'MP7' },
  weapon_mp5sd: { name: 'MP5-SD', category: 'smg', ptBrName: 'MP5-SD' },
  weapon_ump45: { name: 'UMP-45', category: 'smg', ptBrName: 'UMP-45' },
  weapon_p90: { name: 'P90', category: 'smg', ptBrName: 'P90' },
  weapon_bizon: { name: 'PP-Bizon', category: 'smg', ptBrName: 'PP-Bizon' },
  weapon_flashbang: { name: 'Flashbang', category: 'grenade', ptBrName: 'Granada de Luz' },
  weapon_smokegrenade: { name: 'Smoke', category: 'grenade', ptBrName: 'Granada de Fumaça' },
  weapon_hegrenade: { name: 'HE Grenade', category: 'grenade', ptBrName: 'Granada Explosiva' },
  weapon_incgrenade: { name: 'Incendiary', category: 'grenade', ptBrName: 'Incendiária' },
  weapon_molotov: { name: 'Molotov', category: 'grenade', ptBrName: 'Molotov' },
  weapon_knife: { name: 'Knife', category: 'knife', ptBrName: 'Faca' },
  weapon_c4: { name: 'C4 Explosive', category: 'c4', ptBrName: 'Bomba C4' },
};

export function formatWeaponName(weaponCode: string | undefined): string {
  if (!weaponCode) return 'Desarmado';
  const cleanCode = weaponCode.toLowerCase().trim();
  if (cleanCode.includes('knife') || cleanCode.includes('bayonet')) return 'Faca';
  return WEAPON_REGISTRY[cleanCode]?.ptBrName || cleanCode.replace('weapon_', '').toUpperCase();
}
