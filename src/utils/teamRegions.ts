export const TEAM_REGIONS: Record<string, string> = {
  SINNERS: 'EUROPA', 'Eternal Fire': 'EUROPA', Sangal: 'EUROPA', Metizport: 'EUROPA',
  FURIA: 'BRASIL', 'FURIA Esports': 'BRASIL', Imperial: 'BRASIL', MIBR: 'BRASIL',
  paiN: 'BRASIL', Fluxo: 'BRASIL', Legacy: 'BRASIL', 'Turma do Pagode': 'BRASIL',
  Yawara: 'BRASIL', 'your end': 'BRASIL', 'Low Cortisol BR': 'BRASIL', Grêmio: 'BRASIL',
  'Natus Vincere': 'EUROPA', NAVI: 'EUROPA', Vitality: 'EUROPA', 'Team Vitality': 'EUROPA',
  FaZe: 'EUROPA', 'FaZe Clan': 'EUROPA', G2: 'EUROPA', 'G2 Esports': 'EUROPA',
  Spirit: 'EUROPA', 'Team Spirit': 'EUROPA', MOUZ: 'EUROPA', Astralis: 'EUROPA',
  Liquid: 'AMÉRICA DO NORTE', 'Team Liquid': 'AMÉRICA DO NORTE', M80: 'AMÉRICA DO NORTE',
  NRG: 'AMÉRICA DO NORTE', Complexity: 'AMÉRICA DO NORTE', Wildcard: 'AMÉRICA DO NORTE',
  'The MongolZ': 'ÁSIA', TYLOO: 'ÁSIA', LynnVision: 'ÁSIA',
  BESTIA: 'AMÉRICA DO SUL', '9z': 'AMÉRICA DO SUL', ShindeN: 'AMÉRICA DO SUL', Isurus: 'AMÉRICA DO SUL',
};
const normalized = new Map(Object.entries(TEAM_REGIONS).map(([name, region]) => [name.toLowerCase(), region]));
export function getTeamRegion(name: string, fallback = 'TBD'): string {
  return normalized.get(name.trim().toLowerCase()) ?? fallback;
}
