// Hook de sincronização automática de assets (On-Demand) pós-processamento de demo
// Uso programático: import { syncMatchAssets } from './sync-match-assets.mjs'
// Uso via CLI: node scripts/sync-match-assets.mjs
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const LIQUIPEDIA_API = 'https://liquipedia.net/counterstrike/api.php';
const LIQUIPEDIA_HEADERS = {
  'User-Agent': 'CS2Analyzer/1.0 (contact@cs2analyzer.local)',
  'Accept-Encoding': 'gzip',
};

const TEAM_CDN_SLUGS = {
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
  'virtus.pro': 'virtus-pro',
  virtuspro: 'virtus-pro',
  'eternal fire': 'eternal-fire',
  'the mongolz': 'the-mongolz',
  mongolz: 'the-mongolz',
};

export function normalizeTeamSlug(teamName = '') {
  const normalized = String(teamName).trim().toLowerCase();
  if (!normalized) return 'unknown-team';
  if (normalized.includes('navi') || normalized.includes('natus')) return 'navi';
  if (normalized.includes('faze')) return 'faze';
  if (normalized.includes('liquid')) return 'liquid';
  if (normalized.includes('spirit')) return 'spirit';
  if (normalized.includes('mouz') || normalized.includes('mouse')) return 'mouz';
  if (normalized.includes('vitality')) return 'vitality';
  if (normalized.includes('g2')) return 'g2';
  if (normalized.includes('furia')) return 'furia';
  return normalized.replace(/[^a-z0-9_-]/g, '') || 'unknown-team';
}

export function normalizePlayerSlug(playerName = '') {
  const slug = String(playerName).toLowerCase().replace(/[^a-z0-9]/g, '');
  return slug || 'unknownplayer';
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extrai a lista única de jogadores (steamId + name) e as 2 equipes da partida.
 */
export function extractMatchEntities(matchData = {}) {
  const rawTeams = [
    matchData.teamCtName ?? matchData.team_ct_name,
    matchData.teamTName ?? matchData.team_t_name,
    ...(Array.isArray(matchData.teams) ? matchData.teams : []),
  ].filter((t) => typeof t === 'string' && t.trim().length > 0);

  const uniqueTeamsMap = new Map();
  for (const teamName of rawTeams) {
    const slug = normalizeTeamSlug(teamName);
    if (!uniqueTeamsMap.has(slug)) {
      uniqueTeamsMap.set(slug, { teamName: teamName.trim(), teamSlug: slug });
    }
  }

  const rawPlayers = Array.isArray(matchData.players)
    ? matchData.players
    : Array.isArray(matchData.playersManifest)
    ? matchData.playersManifest
    : [];

  const uniquePlayersMap = new Map();
  for (const p of rawPlayers) {
    const name = String(p?.name ?? p?.nickname ?? '').trim();
    if (!name) continue;
    const playerSlug = normalizePlayerSlug(name);
    const steamId = String(p?.steamId ?? p?.steam_id ?? '').trim();
    const key = steamId || playerSlug;
    if (!uniquePlayersMap.has(key)) {
      uniquePlayersMap.set(key, {
        steamId,
        name,
        playerSlug,
      });
    }
  }

  return {
    teams: [...uniqueTeamsMap.values()].slice(0, 2),
    players: [...uniquePlayersMap.values()],
  };
}

/**
 * Gera um escudo tático SVG vetorial com as iniciais da equipe.
 */
export function buildTacticalTeamSvg(teamName = 'TEAM') {
  const initials =
    String(teamName)
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 3)
      .toUpperCase() || 'TM';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <polygon points="50,6 90,22 82,70 50,94 18,70 10,22" fill="#111618" stroke="#00FFA3" stroke-width="4"/>
  <polygon points="50,14 82,27 75,66 50,86 25,66 18,27" fill="#161E22" stroke="#1B2226" stroke-width="2"/>
  <text x="50" y="57" text-anchor="middle" fill="#FFFFFF" font-family="monospace" font-weight="bold" font-size="26">${initials}</text>
</svg>\n`;
}

// Tabela CRC32 para geração de PNG válido sem dependências externas
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Mapa 5x7 simples para desenhar iniciais no PNG tático de fallback
const BITMAP_FONT = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11100, 0b10010, 0b10001, 0b10001, 0b10001, 0b10010, 0b11100],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b10010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  0: [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  1: [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  2: [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
  3: [0b11110, 0b00001, 0b00001, 0b01110, 0b00001, 0b00001, 0b11110],
  4: [0b10010, 0b10010, 0b10010, 0b11111, 0b00010, 0b00010, 0b00010],
  5: [0b11111, 0b10000, 0b10000, 0b11110, 0b00001, 0b00001, 0b11110],
  6: [0b01110, 0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  7: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  8: [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  9: [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001, 0b01110],
};

/**
 * Gera um avatar PNG tático (85x85) com fundo escuro #111618, borda #1B2226
 * e iniciais em destaque para garantir que o arquivo exista e a UI nunca quebre.
 */
export function buildTacticalPlayerPng(playerName = 'PL', width = 85, height = 85) {
  const initials =
    String(playerName)
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 2)
      .toUpperCase() || 'PL';

  const rawData = Buffer.alloc(height * (1 + width * 4));

  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    rawData[rowStart] = 0; // filtro None
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 4;
      const isBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const isAccentBar = y >= height - 3 && x >= 12 && x < width - 12;
      if (isAccentBar) {
        rawData[px] = 0x00;
        rawData[px + 1] = 0xff;
        rawData[px + 2] = 0xa3;
        rawData[px + 3] = 0xff;
      } else if (isBorder) {
        rawData[px] = 0x1b;
        rawData[px + 1] = 0x22;
        rawData[px + 2] = 0x26;
        rawData[px + 3] = 0xff;
      } else {
        rawData[px] = 0x11;
        rawData[px + 1] = 0x16;
        rawData[px + 2] = 0x18;
        rawData[px + 3] = 0xff;
      }
    }
  }

  // Renderiza as iniciais centralizadas com escala 3x
  const scale = 3;
  const charW = 5 * scale;
  const charH = 7 * scale;
  const gap = 2 * scale;
  const totalW = initials.length * charW + (initials.length - 1) * gap;
  const startX = Math.floor((width - totalW) / 2);
  const startY = Math.floor((height - charH) / 2);

  for (let c = 0; c < initials.length; c++) {
    const glyph = BITMAP_FONT[initials[c]] ?? BITMAP_FONT.P;
    const offsetX = startX + c * (charW + gap);
    for (let gy = 0; gy < 7; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        if ((glyph[gy] >> (4 - gx)) & 1) {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const py = startY + gy * scale + sy;
              const pxCoord = offsetX + gx * scale + sx;
              if (pxCoord >= 0 && pxCoord < width && py >= 0 && py < height) {
                const idx = py * (1 + width * 4) + 1 + pxCoord * 4;
                rawData[idx] = 0x9e;
                rawData[idx + 1] = 0xab;
                rawData[idx + 2] = 0xb3;
                rawData[idx + 3] = 0xff;
              }
            }
          }
        }
      }
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(rawData);
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Tenta buscar o avatar oficial de um jogador via Steam Web API (usando SteamID64)
 * ou via Liquipedia MediaWiki API (infobox image -> imageinfo).
 */
async function fetchOfficialPlayerAvatar(player, { fetchImpl, steamApiKey }) {
  const { steamId, name } = player;

  // 1. Tenta via Steam Web API se SteamID64 e chave estiverem disponíveis
  if (steamApiKey && /^7656119\d{10}$/.test(String(steamId))) {
    try {
      const steamUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${encodeURIComponent(
        steamApiKey,
      )}&steamids=${encodeURIComponent(steamId)}`;
      const res = await fetchImpl(steamUrl);
      if (res?.ok) {
        const json = await res.json();
        const avatarUrl =
          json?.response?.players?.[0]?.avatarfull ??
          json?.response?.players?.[0]?.avatarmedium;
        if (avatarUrl) {
          const imgRes = await fetchImpl(avatarUrl);
          if (imgRes?.ok) {
            const buf = Buffer.from(await imgRes.arrayBuffer());
            if (buf.length > 0) return buf;
          }
        }
      }
    } catch {
      // prossegue para o repositório de atletas
    }
  }

  // 2. Tenta via Liquipedia API (revisions -> imageinfo)
  try {
    const revParams = new URLSearchParams({
      action: 'query',
      format: 'json',
      redirects: '1',
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      titles: name,
    });
    const revRes = await fetchImpl(`${LIQUIPEDIA_API}?${revParams}`, {
      headers: LIQUIPEDIA_HEADERS,
    });
    if (revRes?.ok) {
      const revJson = await revRes.json();
      const pages = Object.values(revJson?.query?.pages ?? {});
      for (const page of pages) {
        const text = page?.revisions?.[0]?.slots?.main?.['*'] ?? '';
        const match = text.match(/\|\s*image\s*=\s*([^\n|]+)/i);
        const fileName = match?.[1]?.trim();
        if (!fileName) continue;

        const infoParams = new URLSearchParams({
          action: 'query',
          format: 'json',
          redirects: '1',
          prop: 'imageinfo',
          iiprop: 'url',
          iiurlwidth: '300',
          titles: `File:${fileName}`,
        });
        const infoRes = await fetchImpl(`${LIQUIPEDIA_API}?${infoParams}`, {
          headers: LIQUIPEDIA_HEADERS,
        });
        if (!infoRes?.ok) continue;
        const infoJson = await infoRes.json();
        const infoPages = Object.values(infoJson?.query?.pages ?? {});
        for (const infoPage of infoPages) {
          const imgUrl = infoPage?.imageinfo?.[0]?.thumburl || infoPage?.imageinfo?.[0]?.url;
          if (!imgUrl) continue;
          const imgRes = await fetchImpl(imgUrl, { headers: LIQUIPEDIA_HEADERS });
          if (imgRes?.ok) {
            const buf = Buffer.from(await imgRes.arrayBuffer());
            if (buf.length > 0) return buf;
          }
        }
      }
    }
  } catch {
    // fallback tático acionado pelo chamador
  }

  return null;
}

/**
 * Tenta buscar o escudo oficial da equipe via CDN aberta ou Liquipedia.
 */
async function fetchOfficialTeamLogo(team, { fetchImpl }) {
  const { teamName, teamSlug } = team;
  const cdnSlug = TEAM_CDN_SLUGS[teamName.trim().toLowerCase()] ?? TEAM_CDN_SLUGS[teamSlug];

  if (cdnSlug) {
    try {
      const cdnUrl = `https://cdn.jsdelivr.net/gh/lootmarket/esport-team-logos@master/csgo/${cdnSlug}/${cdnSlug}-logo.png`;
      const res = await fetchImpl(cdnUrl);
      if (res?.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 0) {
          const b64 = buf.toString('base64');
          const wrappedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">\n  <image href="data:image/png;base64,${b64}" width="100" height="100" preserveAspectRatio="xMidYMid meet"/>\n</svg>\n`;
          return { svgContent: wrappedSvg, pngBuffer: buf };
        }
      }
    } catch {
      // prossegue para fallback vetorial
    }
  }

  return null;
}

/**
 * Sincroniza os assets das equipes e jogadores envolvidos na partida:
 * - Equipes: verifica public/teams/${teamSlug}.svg (ou .png). Se ausente, baixa ou gera SVG tático.
 * - Jogadores: verifica public/players/${playerSlug}.png. Se ausente, baixa via Steam/Liquipedia ou gera fallback tático PNG com iniciais.
 */
export async function syncMatchAssets(matchData, options = {}) {
  const publicDir = options.publicDir ?? DEFAULT_PUBLIC_DIR;
  const teamsDir = path.join(publicDir, 'teams');
  const playersDir = path.join(publicDir, 'players');
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const steamApiKey = options.steamApiKey ?? process.env.STEAM_API_KEY ?? '';

  await mkdir(teamsDir, { recursive: true });
  await mkdir(playersDir, { recursive: true });

  const { teams, players } = extractMatchEntities(matchData);
  const teamResults = [];
  const playerResults = [];

  for (const team of teams) {
    const svgPath = path.join(teamsDir, `${team.teamSlug}.svg`);
    const pngPath = path.join(teamsDir, `${team.teamSlug}.png`);

    if ((await fileExists(svgPath)) || (await fileExists(pngPath))) {
      teamResults.push({
        teamName: team.teamName,
        teamSlug: team.teamSlug,
        status: 'cached',
        path: (await fileExists(svgPath)) ? svgPath : pngPath,
      });
      continue;
    }

    const remoteLogo = await fetchOfficialTeamLogo(team, { fetchImpl });
    if (remoteLogo?.svgContent) {
      await writeFile(svgPath, remoteLogo.svgContent, 'utf8');
      teamResults.push({
        teamName: team.teamName,
        teamSlug: team.teamSlug,
        status: 'downloaded',
        path: svgPath,
      });
    } else {
      const fallbackSvg = buildTacticalTeamSvg(team.teamName);
      await writeFile(svgPath, fallbackSvg, 'utf8');
      teamResults.push({
        teamName: team.teamName,
        teamSlug: team.teamSlug,
        status: 'fallback',
        path: svgPath,
      });
    }
  }

  for (const player of players) {
    const pngPath = path.join(playersDir, `${player.playerSlug}.png`);
    if (await fileExists(pngPath)) {
      playerResults.push({
        name: player.name,
        steamId: player.steamId,
        playerSlug: player.playerSlug,
        status: 'cached',
        path: pngPath,
      });
      continue;
    }

    const officialBuf = await fetchOfficialPlayerAvatar(player, {
      fetchImpl,
      steamApiKey,
    });

    if (officialBuf) {
      await writeFile(pngPath, officialBuf);
      playerResults.push({
        name: player.name,
        steamId: player.steamId,
        playerSlug: player.playerSlug,
        status: 'downloaded',
        path: pngPath,
      });
    } else {
      const fallbackPng = buildTacticalPlayerPng(player.name);
      await writeFile(pngPath, fallbackPng);
      playerResults.push({
        name: player.name,
        steamId: player.steamId,
        playerSlug: player.playerSlug,
        status: 'fallback',
        path: pngPath,
      });
    }
  }

  return {
    teams: teamResults,
    players: playerResults,
  };
}

// Execução direta via CLI: node scripts/sync-match-assets.mjs
const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const sampleMatch = {
    teamCtName: process.argv[2] || 'FURIA',
    teamTName: process.argv[3] || 'NAVI',
    players: [
      { steamId: '76561198000000001', name: 'kscerato' },
      { steamId: '76561198000000002', name: 'b1t' },
    ],
  };
  syncMatchAssets(sampleMatch)
    .then((res) => {
      console.log('Assets sincronizados:', JSON.stringify(res, null, 2));
    })
    .catch((err) => {
      console.error('Erro ao sincronizar assets:', err);
      process.exit(1);
    });
}

