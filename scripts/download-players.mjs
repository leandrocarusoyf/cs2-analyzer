// Baixa os avatares dos titulares das 20 principais equipes para public/players/{slug}.png
// Uso: node scripts/download-players.mjs
//
// Estratégia: a API da MediaWiki da Liquipedia aceita até 50 títulos por requisição
// (prop=pageimages), então resolvemos ~100 jogadores em 2-3 chamadas respeitando o
// rate limit de 1 req / 2s. Depois baixamos cada imagem com 100ms de intervalo.
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'players');
const API = 'https://liquipedia.net/counterstrike/api.php';
const HEADERS = {
  'User-Agent': 'CS2Analyzer/1.0 (contact@cs2analyzer.local)',
  'Accept-Encoding': 'gzip',
};
const DOWNLOAD_DELAY_MS = 100;
const API_DELAY_MS = 2100;
const THUMB_SIZE = 300;

/** Nicknames no casing canônico da Liquipedia (títulos de página são case-sensitive). */
const TEAMS = {
  FURIA: ['FalleN', 'KSCERATO', 'yuurih', 'molodoy', 'YEKINDAR'],
  NaVi: ['b1t', 'iM', 'w0nderful', 'Aleksib', 'makazze'],
  Vitality: ['ZywOo', 'apEX', 'flameZ', 'mezii', 'ropz'],
  Spirit: ['donk', 'sh1ro', 'chopper', 'zont1x', 'magixx'],
  FaZe: ['karrigan', 'rain', 'frozen', 'broky', 'Twistzz'],
  MOUZ: ['torzsi', 'xertioN', 'Jimpphat', 'Brollan', 'Spinx'],
  G2: ['huNter-', 'malbsMd', 'SunPayus', 'HeavyGod', 'MATYS'],
  Liquid: ['NAF', 'EliGE', 'ultimate', 'NertZ', 'siuhy'],
  Falcons: ['NiKo', 'm0NESY', 'TeSeS', 'kyxsan', 'kyousuke'],
  'Virtus.pro': ['FL1T', 'fame', 'electroNic', 'Jame', 'n0rb3r7'],
  Astralis: ['device', 'Staehr', 'jabbi', 'Buzz', 'phzy'],
  HEROIC: ['cadiaN', 'yxngstxr', 'nilo', 'Chr1zN', 'xfl0ud'],
  'Eternal Fire': ['XANTARES', 'MAJ3R', 'Calyx', 'woxic', 'Wicadia'],
  Complexity: ['JT', 'hallzerk', 'floppy', 'Grim', 'Rainwaker'],
  'The MongolZ': ['bLitz', 'Techno4K', '910', 'mzinho', 'Senzu'],
  paiN: ['biguzera', 'nqz', 'snow', 'dav1deuS', 'lux'],
  MIBR: ['exit', 'brnz4n', 'insani', 'Lucaozy', 'saffee'],
  SAW: ['MUTiRiS', 'story', 'ewjerkz', 'rmn', 'arrow'],
  Imperial: ['fnx', 'boltz', 'VINI', 'chelo', 'noway'],
  FlyQuest: ['Lake', 'Infinite', 'Vexite', 'regali', 'jnt'],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toSlug = (nick) => nick.toLowerCase().replace(/[^a-z0-9]/g, '');

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function apiQuery(params) {
  const res = await fetch(`${API}?${new URLSearchParams({ action: 'query', format: 'json', redirects: '1', ...params })}`, {
    headers: HEADERS,
  });
  if (!res.ok) {
    console.warn(`API HTTP ${res.status}`);
    return {};
  }
  return (await res.json()).query ?? {};
}

/** Mapa título retornado -> título pedido (normalização + redirects). */
function buildBackMap(query) {
  const back = new Map();
  for (const n of query.normalized ?? []) back.set(n.to, n.from);
  for (const r of query.redirects ?? []) back.set(r.to, back.get(r.from) ?? r.from);
  return back;
}

/**
 * Resolve nick -> URL da imagem (2 etapas, lotes de 50 títulos):
 *  1. lê o campo |image= do infobox de cada página de jogador;
 *  2. resolve os "File:" para URLs de thumbnail via imageinfo.
 */
async function resolveImageUrls(nicks) {
  const nickToFile = new Map();
  for (let i = 0; i < nicks.length; i += 50) {
    const batch = nicks.slice(i, i + 50);
    const query = await apiQuery({
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      titles: batch.join('|'),
    });
    const back = buildBackMap(query);
    for (const page of Object.values(query.pages ?? {})) {
      const text = page.revisions?.[0]?.slots?.main?.['*'] ?? '';
      const match = text.match(/\|\s*image\s*=\s*([^\n|]+)/i);
      const file = match?.[1]?.trim();
      if (file) nickToFile.set(back.get(page.title) ?? page.title, file);
    }
    await sleep(API_DELAY_MS);
  }

  const files = [...new Set(nickToFile.values())];
  const fileToUrl = new Map();
  for (let i = 0; i < files.length; i += 50) {
    const batch = files.slice(i, i + 50);
    const query = await apiQuery({
      prop: 'imageinfo',
      iiprop: 'url',
      iiurlwidth: String(THUMB_SIZE),
      titles: batch.map((f) => `File:${f}`).join('|'),
    });
    const back = buildBackMap(query);
    for (const page of Object.values(query.pages ?? {})) {
      const info = page.imageinfo?.[0];
      const url = info?.thumburl || info?.url;
      if (!url) continue;
      const requested = (back.get(page.title) ?? page.title).replace(/^File:/i, '');
      fileToUrl.set(requested, url);
    }
    if (i + 50 < files.length) await sleep(API_DELAY_MS);
  }

  const result = new Map();
  for (const [nick, file] of nickToFile) {
    const url = fileToUrl.get(file) ?? fileToUrl.get(file.replace(/_/g, ' '));
    if (url) result.set(nick, url);
  }
  return result;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const entries = [];
  const seen = new Set();
  for (const [team, nicks] of Object.entries(TEAMS)) {
    for (const nick of nicks) {
      const slug = toSlug(nick);
      if (seen.has(slug)) continue; // evita duplicados entre equipes
      seen.add(slug);
      entries.push({ team, nick, slug });
    }
  }
  console.log(`${entries.length} jogadores únicos em ${Object.keys(TEAMS).length} equipes.`);

  const urls = await resolveImageUrls(entries.map((e) => e.nick));

  let ok = 0;
  const failed = [];
  for (const { nick, slug, team } of entries) {
    const file = path.join(OUT_DIR, `${slug}.png`);
    const url = urls.get(nick);
    if (!url) {
      failed.push(`${nick} (${team}): sem imagem na Liquipedia`);
      continue;
    }
    try {
      const res = await fetch(url, { headers: { ...HEADERS, Referer: 'https://liquipedia.net/' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await writeFile(file, Buffer.from(await res.arrayBuffer()));
      ok += 1;
      console.log(`✔ ${slug}.png`);
    } catch (err) {
      failed.push(`${nick} (${team}): ${err.message}`);
    }
    await sleep(DOWNLOAD_DELAY_MS);
  }

  console.log(`\nConcluído: ${ok}/${entries.length} baixados.`);
  if (failed.length) {
    console.log('Falhas (o PlayerAvatar usa fallback de iniciais):');
    for (const f of failed) console.log(`  - ${f}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
