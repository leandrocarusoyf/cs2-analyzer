import { NextRequest, NextResponse } from 'next/server';
import {
  LIQUIPEDIA_HEADERS,
  slugifyTeam,
  getTeamCdnLogoUrl,
  PLAYER_CDN_AVATARS,
  buildTeamLogoQuery,
  buildTeamPageQuery,
  buildPlayerQuery,
  parseTeamLogoResponse,
  parsePlayerImageResponse,
} from '../../../lib/liquipedia.ts';

// Cache em memória do servidor
const serverCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas no servidor

async function fetchFromLiquipedia(url: string) {
  const cached = serverCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const res = await fetch(url, {
      headers: LIQUIPEDIA_HEADERS,
      next: { revalidate: 86400 }, // 24h
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    serverCache.set(url, { data, timestamp: Date.now() });
    return data;
  } catch (err) {
    console.error('Error fetching from Liquipedia:', err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const name = searchParams.get('name');

  if (!type || !name) {
    return NextResponse.json(
      { error: 'Parâmetros "type" e "name" são obrigatórios' },
      { status: 400 },
    );
  }

  if (type === 'team') {
    const teamSlug = slugifyTeam(name);
    const normalized = name.trim().toLowerCase();
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

    // 1. Tenta resolver via asset local SVG
    let logoUrl: string | null = localSlug ? `/teams/${localSlug}.svg` : null;

    // 2. Tenta resolver via CDN aberta de logos
    if (!logoUrl) {
      logoUrl = getTeamCdnLogoUrl(name);
    }

    // 3. Se não estiver no catálogo da CDN nem local, consulta a API da Liquipedia via servidor
    if (!logoUrl) {
      let payload = await fetchFromLiquipedia(buildTeamLogoQuery(teamSlug));
      logoUrl = parseTeamLogoResponse(payload);

      if (!logoUrl) {
        payload = await fetchFromLiquipedia(buildTeamPageQuery(teamSlug));
        logoUrl = parsePlayerImageResponse(payload);
      }
    }

    return NextResponse.json(
      {
        teamName: name,
        teamSlug,
        logoUrl: logoUrl ?? null,
        fetchedAt: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        },
      },
    );
  }

  if (type === 'player') {
    const teamName = searchParams.get('team') || '';
    const key = name.toLowerCase();

    // 1. Tenta resolver via asset local
    let avatarUrl: string | null = key === 'kscerato' ? '/players/kscerato.png' : null;

    // 2. Tenta resolver via CDN aberta / Wikimedia pública
    if (!avatarUrl) {
      avatarUrl = PLAYER_CDN_AVATARS[key] ?? null;
    }

    // 3. Se não estiver mapeado, consulta a API da Liquipedia via servidor
    if (!avatarUrl) {
      const payload = await fetchFromLiquipedia(buildPlayerQuery(name));
      avatarUrl = parsePlayerImageResponse(payload);
    }

    return NextResponse.json(
      {
        playerNickname: name,
        teamSlug: slugifyTeam(teamName),
        avatarUrl: avatarUrl ?? null,
        fetchedAt: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        },
      },
    );
  }

  return NextResponse.json({ error: `Tipo desconhecido: ${type}` }, { status: 400 });
}
