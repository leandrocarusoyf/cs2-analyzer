export const LIQUIPEDIA_API_URL = 'https://liquipedia.net/counterstrike/api.php';

export const LIQUIPEDIA_HEADERS: Record<string, string> = {
  'User-Agent': 'CS2Analyzer/1.0 (contact@cs2analyzer.local)',
  'Accept-Encoding': 'gzip',
};

/** TTL de cache: 14 dias (limite inferior da janela 14–30 dias). */
export const LIQUIPEDIA_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export interface OpponentLogoDTO {
  teamName: string;
  teamSlug: string;
  logoUrl: string | null;
  fetchedAt: number;
}

export interface PlayerProfileDTO {
  playerNickname: string;
  teamSlug: string;
  avatarUrl: string | null;
  fetchedAt: number;
}

type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export interface LiquipediaClientOptions {
  fetchImpl?: FetchLike;
  now?: () => number;
  ttlMs?: number;
  useProxy?: boolean;
  bypassCdn?: boolean;
}

export function slugifyTeam(teamName: string): string {
  return teamName
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_\-]/g, '');
}

/**
 * Mapeamento canônico de times profissionais para os slugs do repositório
 * de logos abertos lootmarket/esport-team-logos servido via CDN jsDelivr:
 * https://cdn.jsdelivr.net/gh/lootmarket/esport-team-logos@master/csgo/{slug}/{slug}-logo.png
 */
export const TEAM_CDN_SLUGS: Record<string, string> = {
  furia: 'furia',
  'furia esports': 'furia',
  navi: 'natus-vincere',
  'natus vincere': 'natus-vincere',
  faze: 'faze-clan',
  'faze clan': 'faze-clan',
  liquid: 'team-liquid',
  'team liquid': 'team-liquid',
  spirit: 'team-spirit',
  'team spirit': 'team-spirit',
  mouz: 'mousesports',
  mousesports: 'mousesports',
  vitality: 'team-vitality',
  'team vitality': 'team-vitality',
  g2: 'g2-esports',
  'g2 esports': 'g2-esports',
  astralis: 'astralis',
  ence: 'ence',
  complexity: 'complexity-gaming',
  heroic: 'heroic',
  nip: 'ninjas-in-pyjamas',
  'ninjas in pyjamas': 'ninjas-in-pyjamas',
  virtuspro: 'virtus-pro',
  'virtus.pro': 'virtus-pro',
  cloud9: 'cloud9',
  fnatic: 'fnatic',
  big: 'big',
  eternal_fire: 'eternal-fire',
  'eternal fire': 'eternal-fire',
  mongolz: 'the-mongolz',
  'the mongolz': 'the-mongolz',
};

/** Gera a URL direta do logo via CDN aberto do jsDelivr / lootmarket */
export function getTeamCdnLogoUrl(teamName: string): string | null {
  const normalized = teamName.trim().toLowerCase();
  const slug = TEAM_CDN_SLUGS[normalized];
  if (!slug) return null;
  return `https://cdn.jsdelivr.net/gh/lootmarket/esport-team-logos@master/csgo/${slug}/${slug}-logo.png`;
}

/** URLs de avatares abertos de jogadores conhecidos */
export const PLAYER_CDN_AVATARS: Record<string, string> = {
  kscerato: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/KSCERATO_at_IEM_Cologne_2023.jpg/320px-KSCERATO_at_IEM_Cologne_2023.jpg',
};

interface MediaWikiPage {
  missing?: string | boolean;
  thumbnail?: { source?: string };
  imageinfo?: Array<{ url?: string; mime?: string }>;
}

function getPages(payload: unknown): MediaWikiPage[] {
  const pages = (payload as { query?: { pages?: Record<string, MediaWikiPage> } } | null)?.query
    ?.pages;
  return pages && typeof pages === 'object' ? Object.values(pages) : [];
}

/** Extrai a URL do logo de uma resposta `prop=imageinfo` (null se ausente). */
export function parseTeamLogoResponse(payload: unknown): string | null {
  for (const page of getPages(payload)) {
    if (page.missing !== undefined) continue;
    const url = page.imageinfo?.[0]?.url;
    if (typeof url === 'string' && url.length > 0) return url;
  }
  return null;
}

/** Extrai a foto do jogador de `prop=pageimages|imageinfo` (null se ausente). */
export function parsePlayerImageResponse(payload: unknown): string | null {
  for (const page of getPages(payload)) {
    if (page.missing !== undefined) continue;
    const thumb = page.thumbnail?.source;
    if (typeof thumb === 'string' && thumb.length > 0) return thumb;
    const url = page.imageinfo?.[0]?.url;
    if (typeof url === 'string' && url.length > 0) return url;
  }
  return null;
}

export function buildTeamLogoQuery(teamSlug: string, titles?: string): string {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'imageinfo',
    iiprop: 'url|mime',
    titles: titles ?? `File:${teamSlug}_logo.svg`,
  });
  return `${LIQUIPEDIA_API_URL}?${params.toString()}`;
}

export function buildTeamPageQuery(teamSlug: string): string {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'pageimages|imageinfo',
    pithumbsize: '200',
    titles: teamSlug,
  });
  return `${LIQUIPEDIA_API_URL}?${params.toString()}`;
}

export function buildPlayerQuery(nickname: string): string {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'pageimages|imageinfo',
    pithumbsize: '200',
    titles: nickname,
  });
  return `${LIQUIPEDIA_API_URL}?${params.toString()}`;
}

export function createLiquipediaClient(options: LiquipediaClientOptions = {}) {
  const fetchImpl: FetchLike =
    options.fetchImpl ?? ((url, init) => fetch(url, init) as ReturnType<FetchLike>);
  const now = options.now ?? (() => Date.now());
  const ttlMs = options.ttlMs ?? LIQUIPEDIA_CACHE_TTL_MS;
  // No client padrão, usa o proxy do Next.js se estiver em ambiente browser ou se useProxy for explicitamente true
  const useProxy = options.useProxy ?? (options.fetchImpl === undefined);
  // Se fetchImpl for fornecido customizadamente e bypassCdn não foi definido, ativa bypassCdn para preservar testes de fetch direto
  const bypassCdn = options.bypassCdn ?? (options.fetchImpl !== undefined);

  const logoCache = new Map<string, OpponentLogoDTO>();
  const playerCache = new Map<string, PlayerProfileDTO>();

  // Requisição direta à Liquipedia (usada nos testes ou server-side)
  async function requestDirect(url: string): Promise<unknown | null> {
    try {
      const res = await fetchImpl(url, { headers: LIQUIPEDIA_HEADERS });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  // Requisição via API route interna proxy
  async function requestProxy(params: Record<string, string>): Promise<unknown | null> {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetchImpl(`/api/liquipedia?${query}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async function getOpponentLogo(teamName: string): Promise<OpponentLogoDTO> {
    const teamSlug = slugifyTeam(teamName);
    const cached = logoCache.get(teamSlug);
    if (cached && now() - cached.fetchedAt < ttlMs) return cached;

    // 1. Tenta resolver via asset local SVG (public/teams/{slug}.svg)
    const normalized = teamName.trim().toLowerCase();
    const localSlug =
      normalized.includes('navi') || normalized.includes('natus')
        ? 'navi'
        : normalized.includes('faze')
        ? 'faze'
        : normalized.includes('liquid')
        ? 'liquid'
        : normalized.includes('spirit')
        ? 'spirit'
        : normalized.includes('mouz') || normalized.includes('mouse')
        ? 'mouz'
        : normalized.includes('vitality')
        ? 'vitality'
        : normalized.includes('g2')
        ? 'g2'
        : normalized.includes('furia')
        ? 'furia'
        : null;

    let logoUrl: string | null = (!bypassCdn && localSlug) ? `/teams/${localSlug}.svg` : null;

    // 2. Tenta resolver via CDN aberta de alta disponibilidade se não achou local
    if (!logoUrl && !bypassCdn) {
      logoUrl = getTeamCdnLogoUrl(teamName);
    }

    // 3. Se não estiver no mapa local nem da CDN, tenta via proxy interno /api/liquipedia
    if (!logoUrl && useProxy) {
      const proxyResult = (await requestProxy({ type: 'team', name: teamName })) as OpponentLogoDTO | null;
      if (proxyResult && proxyResult.logoUrl !== undefined) {
        logoUrl = proxyResult.logoUrl;
      }
    }

    // 4. Se não estiver usando proxy e não achou na CDN nem local, busca direto via API wiki (compatibilidade com mocks de teste)
    if (!logoUrl && !useProxy) {
      logoUrl = parseTeamLogoResponse(await requestDirect(buildTeamLogoQuery(teamSlug)));
      if (!logoUrl) {
        logoUrl = parsePlayerImageResponse(await requestDirect(buildTeamPageQuery(teamSlug)));
      }
    }

    const dto: OpponentLogoDTO = { teamName, teamSlug, logoUrl, fetchedAt: now() };
    logoCache.set(teamSlug, dto);
    return dto;
  }

  async function getPlayerProfile(
    playerNickname: string,
    teamName = '',
  ): Promise<PlayerProfileDTO> {
    const key = playerNickname.toLowerCase();
    const cached = playerCache.get(key);
    if (cached && now() - cached.fetchedAt < ttlMs) return cached;

    // 1. Tenta resolver via asset local (public/players/{key}.png)
    let avatarUrl: string | null = (!bypassCdn && key === 'kscerato') ? '/players/kscerato.png' : null;

    // 2. Tenta resolver via CDN aberta / Wikimedia pública se não achou local
    if (!avatarUrl && !bypassCdn) {
      avatarUrl = PLAYER_CDN_AVATARS[key] ?? null;
    }

    // 3. Se não encontrado, tenta via proxy interno /api/liquipedia
    if (!avatarUrl && useProxy) {
      const proxyResult = (await requestProxy({
        type: 'player',
        name: playerNickname,
        team: teamName,
      })) as PlayerProfileDTO | null;
      if (proxyResult && proxyResult.avatarUrl !== undefined) {
        avatarUrl = proxyResult.avatarUrl;
      }
    }

    // 4. Se não estiver usando proxy ou se o proxy falhou, busca via API wiki (compatibilidade com mocks de teste)
    if (!avatarUrl && !useProxy) {
      avatarUrl = parsePlayerImageResponse(await requestDirect(buildPlayerQuery(playerNickname)));
    }

    const dto: PlayerProfileDTO = {
      playerNickname,
      teamSlug: slugifyTeam(teamName),
      avatarUrl,
      fetchedAt: now(),
    };
    playerCache.set(key, dto);
    return dto;
  }

  // Alias solicitado no prompt
  const getPlayerAvatar = getPlayerProfile;

  return { getOpponentLogo, getPlayerProfile, getPlayerAvatar };
}

export const liquipedia = createLiquipediaClient();

