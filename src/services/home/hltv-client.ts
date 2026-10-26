import { HLTV } from 'hltv';
import { ProxyAgent } from 'undici';
import { fetchExternalText } from './external-data.ts';

export const HLTV_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  Referer: 'https://www.hltv.org/',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,pt-BR;q=0.8',
};

let proxy: { url: string; agent: ProxyAgent } | undefined;

function getProxyAgent(): ProxyAgent | undefined {
  const url = process.env.HLTV_PROXY_URL?.trim();
  if (!url) return undefined;
  if (proxy?.url === url) return proxy.agent;
  try {
    if (!['http:', 'https:'].includes(new URL(url).protocol)) throw new Error();
  } catch {
    // Do not expose proxy credentials in error messages.
    throw new Error('HLTV_PROXY_URL deve ser uma URL de proxy HTTP ou HTTPS válida.');
  }
  const agent = new ProxyAgent(url);
  if (proxy) void proxy.agent.close().catch(() => {});
  proxy = { url, agent };
  return agent;
}

/** hltv exposes loadPage rather than a headers option; apply headers and proxy there. */
export function createHltvClient(onPage: (html: string) => void = () => {}) {
  return HLTV.createInstance({
    loadPage: async url => {
      const html = await fetchExternalText(url, { headers: HLTV_HEADERS, dispatcher: getProxyAgent() });
      onPage(html);
      return html;
    },
  });
}
