import { load } from 'cheerio';
import type { Dispatcher } from 'undici';

export function httpUrl(value: string | undefined, base: string): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value, base);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function isoDate(value: string | number | undefined): string | null {
  if (value === undefined || value === '') return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export function plainText(html: string): string {
  const $ = load(html);
  $('script, style, noscript').remove();
  $('br, p, div, li').prepend(' ');
  return $.root().text().replace(/\s+/g, ' ').trim();
}

/** Called inside the Next Data Cache, so failed responses are never cached. */
export async function fetchExternalText(url: string, options: { headers?: HeadersInit; dispatcher?: Dispatcher } = {}): Promise<string> {
  const headers = new Headers({
    'User-Agent': 'CS2Analyzer/1.0',
    Accept: 'application/rss+xml, application/xml, text/xml, text/html;q=0.9',
  });
  new Headers(options.headers).forEach((value, key) => headers.set(key, value));
  const response = await fetch(url, {
    ...options,
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
    headers,
  });
  if (!response.ok) throw new Error(`External source returned HTTP ${response.status}`);
  return response.text();
}
