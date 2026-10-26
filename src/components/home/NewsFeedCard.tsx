'use client';

import React, { useState, useEffect } from 'react';
import type { NewsItem } from '../../types/home-data';

export interface NewsFeedCardProps {
  newsItems?: NewsItem[];
}

const CATEGORIES = ['TODOS', 'CAMPEONATOS', 'ATUALIZAÇÕES'] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

export function isChampionshipNews(item: NewsItem): boolean {
  const combined = `${item.category_tag || ''} ${(item.tags || []).join(' ')} ${item.title || ''} ${item.source_label || ''}`.toLowerCase();
  const championshipKeywords = [
    'campeonato',
    'major',
    'rmr',
    'tournament',
    'torneio',
    'playoff',
    'iem',
    'blast',
    'esl',
    'cct',
    'cbcs',
    'pgl',
    'qualifier',
    'qualificatório',
    'fase de grupos',
    'grande final',
    'conquista',
    'troféu',
    'vaga',
    'epl',
  ];
  return championshipKeywords.some((kw) => combined.includes(kw));
}

function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return 'há pouco';
  const timestamp = new Date(dateString).getTime();
  if (isNaN(timestamp)) return 'há pouco';
  const diffMs = Date.now() - timestamp;
  if (diffMs <= 0) return 'agora';
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) return `há ${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

export function NewsFeedCard({ newsItems }: NewsFeedCardProps) {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('TODOS');
  const [visibleCount, setVisibleCount] = useState<number>(4);
  const [items, setItems] = useState<NewsItem[]>(newsItems || []);
  const [isLoading, setIsLoading] = useState<boolean>(!newsItems);

  useEffect(() => {
    if (newsItems) {
      setItems(newsItems);
      setIsLoading(false);
    }
  }, [newsItems]);

  useEffect(() => {
    if (newsItems && newsItems.length > 0) return;

    let isMounted = true;
    setIsLoading(true);

    fetch('/api/news/feed')
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao carregar notícias');
        return res.json();
      })
      .then((data: NewsItem[]) => {
        if (isMounted) {
          setItems(Array.isArray(data) ? data : []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('[NewsFeedCard] Erro ao carregar feed de notícias:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [newsItems]);

  const filteredNews = items.filter((item) => {
    if (activeFilter === 'TODOS') return true;
    const isChamp = isChampionshipNews(item);
    if (activeFilter === 'CAMPEONATOS') return isChamp;
    if (activeFilter === 'ATUALIZAÇÕES') return !isChamp;
    return true;
  });

  const displayedNews = filteredNews.slice(0, visibleCount);

  return (
    <div className="flex flex-col gap-space-md select-none">
      {/* Feed Header & Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm">
          <span className="w-1 h-3.5 bg-primary rounded"></span>
          <h2 className="font-card-header text-card-header tracking-wider uppercase text-on-surface font-bold">
            NOTÍCIAS &amp; NOVIDADES
          </h2>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {CATEGORIES.map((category) => {
            const isActive = category === activeFilter;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveFilter(category)}
                className={`px-space-sm py-1 rounded font-benchmark-label text-benchmark-label uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Editorial News Cards */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-space-xl bg-surface-container-low rounded-xl gap-2 text-outline font-stat-mono-md text-xs">
          <span className="material-symbols-outlined animate-spin text-[24px] text-primary-container">sync</span>
          <span>Carregando notícias do cenário CS2...</span>
        </div>
      ) : displayedNews.length === 0 ? (
        <div className="bg-surface-container-low rounded-xl p-space-lg text-center text-outline font-body-md border border-outline-variant/30">
          Nenhuma notícia encontrada para esta categoria.
        </div>
      ) : (
        displayedNews.map((item, index) => {
          const isChamp = isChampionshipNews(item);
          const categoryBadgeText = isChamp ? 'Campeonato' : 'Atualização';
          const relativeTimeText = item.relative_time || formatRelativeTime(item.published_at);
          const sourceLabel = item.source_label || (isChamp ? 'MAJOR CHAMPIONSHIP' : 'PATCH NOTES // VALVE');

          return (
            <article
              key={item.id || item.source_url || `news-item-${index}`}
              className="bg-surface-container-low hover:bg-surface-container transition-all duration-200 rounded-xl overflow-hidden shadow-lg flex flex-col md:flex-row group"
            >
              {/* Cover Image or Tactical Fallback */}
              <div className="md:w-5/12 relative h-48 md:h-auto overflow-hidden flex-shrink-0">
                {item.cover_image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.cover_image_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 min-h-[190px]"
                  />
                ) : (
                  /* Fundo tático de fallback conforme Diretriz 1 e 5 */
                  <div className="w-full h-full min-h-[190px] bg-gradient-to-br from-[#161f2e] via-[#0d131a] to-[#0a0d12] flex flex-col items-center justify-center p-6 text-center border-r border-[#1e293b]/50 group-hover:scale-105 transition-transform duration-300 relative">
                    <div className="w-12 h-12 rounded-xl bg-surface-container-high/80 border border-outline-variant/30 flex items-center justify-center text-primary-container mb-2 shadow">
                      <span className="material-symbols-outlined text-[24px]">newspaper</span>
                    </div>
                    <span className="font-stat-mono-md text-xs font-bold text-on-surface uppercase tracking-wider">
                      {item.category_tag || categoryBadgeText}
                    </span>
                    <span className="font-benchmark-label text-[10px] text-outline uppercase mt-0.5">
                      INTEL REPORT // CS2
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-transparent via-surface-container-low/40 to-surface-container-low pointer-events-none"></div>

                <span className="absolute top-space-sm left-space-sm px-2 py-0.5 rounded bg-surface-container-lowest/90 backdrop-blur-sm text-primary-container font-benchmark-label text-benchmark-label font-bold uppercase flex items-center gap-1 shadow">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                  {categoryBadgeText}
                </span>
              </div>

              {/* News Content */}
              <div className="p-space-md md:p-space-lg flex flex-col justify-between flex-1">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center gap-space-sm text-outline font-benchmark-label text-benchmark-label">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">schedule</span>
                      {relativeTimeText}
                    </span>
                    <span>•</span>
                    <span className="uppercase">{sourceLabel}</span>
                  </div>

                  <h3 className="font-screen-title text-screen-title font-bold text-on-surface group-hover:text-primary-container transition-colors leading-snug">
                    {item.source_url ? (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {item.title}
                      </a>
                    ) : (
                      item.title
                    )}
                  </h3>

                  <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-space-md pt-space-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.tags && item.tags.length > 0 ? (
                      item.tags.map((tag, idx) => (
                        <span
                          key={`${item.id ?? index}-tag-${tag}-${idx}`}
                          className={`font-stat-mono-md text-benchmark-label bg-surface-container px-2 py-0.5 rounded ${
                            idx === 0 ? 'text-primary-container' : 'text-outline'
                          }`}
                        >
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </span>
                      ))
                    ) : (
                      <span className="font-stat-mono-md text-benchmark-label text-primary-container bg-surface-container px-2 py-0.5 rounded">
                        #{item.category_tag || (isChamp ? 'Major' : 'Update')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-space-md text-outline font-stat-mono-md text-benchmark-label">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">chat_bubble</span>{' '}
                      {item.comments_count ?? 84}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">share</span>{' '}
                      {item.shares_count ?? 312}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          );
        })
      )}

      {/* Read More Button */}
      {filteredNews.length > visibleCount && (
        <div className="flex justify-center mt-space-xs">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 4)}
            className="px-space-xl py-space-sm rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-card-header text-card-header uppercase tracking-wider flex items-center gap-2 transition shadow-sm"
          >
            <span>LER MAIS NOTÍCIAS</span>
            <span className="material-symbols-outlined text-[16px] text-primary-container">expand_more</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default NewsFeedCard;
