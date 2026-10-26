import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import Parser from 'rss-parser';
import { unstable_cache } from 'next/cache';
import type { NewsItem } from '../../types/home-data';
import { fetchExternalText, httpUrl, isoDate, plainText } from './external-data';

interface MediaField { $?: { url?: string; type?: string; medium?: string } }
interface NewsFields {
  'content:encoded'?: string;
  'media:content'?: MediaField;
  'media:thumbnail'?: MediaField;
}

const parser = new Parser<Record<string, never>, NewsFields>({
  customFields: { item: ['content:encoded', 'media:content', 'media:thumbnail'] },
});

// Dust2 Brasil covers Counter-Strike exclusively. Add only verified RSS URLs here.
const NEWS_FEEDS = ['https://www.dust2.com.br/rss'];

export function categorizeNews(title: string, summary: string): NewsItem['category_tag'] {
  const text = `${title} ${summary}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return /campeonato|circuit|major|playoffs|classifica|fase\s+final|grupo/.test(text)
    ? 'Campeonatos' : 'Atualizações';
}

export function mapNewsItem(item: Parser.Item & NewsFields, feedUrl: string): NewsItem | null {
  const sourceUrl = httpUrl(item.link || (/^https?:\/\//i.test(item.guid ?? '') ? item.guid : undefined), feedUrl);
  const title = plainText(item.title ?? '');
  if (!sourceUrl || !title) return null;
  const canonical = new URL(sourceUrl);
  canonical.hash = '';
  const body = item['content:encoded'] || item.content || item.summary || '';
  const summary = plainText(item.contentSnippet || item.summary || body);
  const $ = load(body);
  const image = $('img').first();
  const enclosure = !item.enclosure?.type || item.enclosure.type.startsWith('image/') ? item.enclosure?.url : undefined;
  const media = item['media:content']?.$;
  const candidates = [
    enclosure,
    media?.medium === 'image' || media?.type?.startsWith('image/') || (!media?.type && !media?.medium) ? media?.url : undefined,
    item['media:thumbnail']?.$?.url,
    image.attr('src'),
    image.attr('data-src'),
  ];
  return {
    id: createHash('sha256').update(canonical.href).digest('hex'),
    title,
    summary: summary.slice(0, 320),
    cover_image_url: candidates.map((url) => httpUrl(url, sourceUrl)).find((url) => url !== null) ?? null,
    published_at: isoDate(item.isoDate) ?? isoDate(item.pubDate),
    source_url: canonical.href,
    category_tag: categorizeNews(title, summary),
  };
}

async function loadNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(NEWS_FEEDS.map(async (url) => {
    const feed = await parser.parseString(await fetchExternalText(url));
    return feed.items.map((item) => mapNewsItem(item, url)).filter((item): item is NewsItem => item !== null);
  }));
  const items: NewsItem[] = [];
  let successfulFeeds = 0;
  for (const result of results) {
    if (result.status === 'fulfilled') {
      successfulFeeds++;
      items.push(...result.value);
    } else {
      console.warn('[news/feed] RSS source unavailable', result.reason instanceof Error ? result.reason.message : 'Unknown error');
    }
  }
  // Throw rather than poisoning the Data Cache with an outage disguised as [].
  if (successfulFeeds === 0) throw new Error('All CS2 RSS sources are unavailable');
  return [...new Map(items.map((item) => [item.id, item])).values()]
    .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''));
}

export const getNewsFeed = unstable_cache(loadNews, ['home-cs2-news-v2'], { revalidate: 1800 });
