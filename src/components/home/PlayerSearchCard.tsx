'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface PlayerSearchCardProps {
  popularSearches?: string[];
  onSearch?: (term: string) => void;
}

interface PopularTagStyle {
  term: string;
  colorClass: string;
}

const DEFAULT_POPULAR_SEARCHES: string[] = ['donk', 'FalleN', 'm0NESY', 'ZywOo', 'FURIA'];

const DEFAULT_TAG_STYLES: PopularTagStyle[] = [
  { term: 'donk', colorClass: 'text-primary' },
  { term: 'FalleN', colorClass: 'text-primary-container' },
  { term: 'm0NESY', colorClass: 'text-on-surface-variant' },
  { term: 'ZywOo', colorClass: 'text-on-surface-variant' },
  { term: 'FURIA', colorClass: 'text-tertiary' },
];

export function PlayerSearchCard({
  popularSearches = DEFAULT_POPULAR_SEARCHES,
  onSearch,
}: PlayerSearchCardProps) {
  const [query, setQuery] = useState<string>('');
  const router = useRouter();

  const handleSearchSubmit = (searchTerm: string) => {
    const term = searchTerm.trim();
    if (!term) return;

    if (onSearch) {
      onSearch(term);
    } else {
      router.push(`/stats/player?q=${encodeURIComponent(term)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit(query);
    }
  };

  const handleSelectPopular = (term: string) => {
    setQuery(term);
    handleSearchSubmit(term);
  };

  return (
    <div className="bg-surface-container-low rounded-xl p-space-md shadow-lg flex flex-col gap-space-sm select-none">
      <div className="flex items-center gap-space-xs">
        <span className="material-symbols-outlined text-primary-container text-[18px]">search</span>
        <h3 className="font-card-header text-card-header uppercase tracking-wider text-on-surface font-bold">
          BUSCAR JOGADOR / TIME
        </h3>
      </div>

      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-sm text-body-sm rounded-lg pl-9 pr-8 py-space-sm focus:outline-none focus:bg-surface-container transition-colors"
          placeholder="Digite nick, Steam ID ou time (ex: FalleN, donk, s1mple)..."
          type="text"
        />
        <span className="material-symbols-outlined text-outline text-[18px] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          manage_search
        </span>
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Limpar busca"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface text-[14px]"
          >
            ✕
          </button>
        )}
      </div>

      {/* Quick Suggestions */}
      <div className="flex flex-col gap-1 pt-1">
        <span className="font-benchmark-label text-benchmark-label uppercase text-outline">
          BUSCAS POPULARES:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {popularSearches.map((term) => {
            const style = DEFAULT_TAG_STYLES.find((s) => s.term.toLowerCase() === term.toLowerCase());
            const colorClass = style?.colorClass || 'text-on-surface-variant';

            return (
              <button
                key={term}
                type="button"
                onClick={() => handleSelectPopular(term)}
                className={`px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high ${colorClass} font-stat-mono-md text-benchmark-label transition`}
              >
                {term}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PlayerSearchCard;
