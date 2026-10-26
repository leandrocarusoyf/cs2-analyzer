import type { ValveRegion, ValveStandingItem } from '../../types/home-data';

const RAW = 'https://raw.githubusercontent.com/ValveSoftware/counter-strike_regional_standings/main/';
const TREE = 'https://api.github.com/repos/ValveSoftware/counter-strike_regional_standings/git/trees/main?recursive=1';
const sources = { SA: 'americas', NA: 'americas', EU: 'europe', ASIA: 'asia' } as const;

async function officialFetch(url: string): Promise<Response> {
  const response = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Valve source returned HTTP ${response.status}`);
  return response;
}

export function parseValveStandings(markdown: string, region: ValveRegion): ValveStandingItem[] {
  const teams: ValveStandingItem[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const columns = line.split('|').map(value => value.trim());
    if (!/^\d+$/.test(columns[1] ?? '') || !/^\d+$/.test(columns[2] ?? '') || !columns[3]) continue;
    const name = columns[3];
    teams.push({
      rank: Number(columns[1]), points: Number(columns[2]), team_name: name, region, change: 0,
      // Legacy presentation fields keep the existing dashboard compatible.
      name, code: name.slice(0, 3).toUpperCase(), tier: '', change_type: 'neutral',
    });
  }
  if (!teams.length) throw new Error('Valve standings table unavailable');
  return teams;
}

export async function getValveRegionalStandings(): Promise<Record<ValveRegion, ValveStandingItem[]>>;
export async function getValveRegionalStandings(region: ValveRegion): Promise<ValveStandingItem[]>;
export async function getValveRegionalStandings(region?: ValveRegion): Promise<Record<ValveRegion, ValveStandingItem[]> | ValveStandingItem[]> {
  const listing: { truncated?: boolean; tree: { path: string; type: string }[] } = await (await officialFetch(TREE)).json();
  if (listing.truncated || !Array.isArray(listing.tree)) throw new Error('Incomplete Valve file listing');
  const loadRegion = async (requested: ValveRegion) => {
    const pattern = new RegExp(`^live/\\d{4}/standings_${sources[requested]}_\\d{4}_\\d{2}_\\d{2}\\.md$`);
    const path = listing.tree.filter(entry => entry.type === 'blob' && pattern.test(entry.path))
      .map(entry => entry.path).sort().at(-1);
    if (!path) throw new Error(`Valve standings not found for ${requested}`);
    return parseValveStandings(await (await officialFetch(`${RAW}${path}`)).text(), requested);
  };
  if (region) return loadRegion(region);
  const [americas, europe, asia] = await Promise.all([loadRegion('SA'), loadRegion('EU'), loadRegion('ASIA')]);
  return { SA: americas, NA: americas.map(team => ({ ...team, region: 'NA' })), EU: europe, ASIA: asia };
}
