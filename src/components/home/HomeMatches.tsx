'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { MatchItem } from '../../types/home-data';
import { LiveMatchesCarousel } from './LiveMatchesCarousel';
import { FeaturedMatchCard } from './FeaturedMatchCard';
import { MatchDetailsModal } from './MatchDetailsModal';

export interface HomeMatchesProps {
  matches: MatchItem[];
  featuredMatch: MatchItem | null;
  news?: ReactNode;
  sidebar?: ReactNode;
}

/** One selection and one modal for every Home match entry point. */
export function HomeMatches({
  matches: initialMatches,
  featuredMatch: initialFeaturedMatch,
  news,
  sidebar,
}: HomeMatchesProps) {
  const [matches, setMatches] = useState<MatchItem[]>(initialMatches || []);
  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);

  // Sincroniza estado inicial se novas props chegarem do SSR
  useEffect(() => {
    if (initialMatches && initialMatches.length > 0) {
      setMatches(initialMatches);
    }
  }, [initialMatches]);

  // Polling em tempo real a cada 15s com fuga absoluta do cache do cliente (timestamp query + no-store)
  useEffect(() => {
    let isMounted = true;

    const fetchLiveMatches = async () => {
      try {
        const res = await fetch(`/api/home/live-matches?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });
        if (!res.ok) return;

        const payload = await res.json();
        console.log('POLLING RESULTADO:', payload);

        if (!isMounted) return;

        const incomingMatches: MatchItem[] = Array.isArray(payload) ? payload : payload?.matches;
        if (Array.isArray(incomingMatches) && incomingMatches.length > 0) {
          setMatches(incomingMatches);

          // Mantém o modal sincronizado se o usuário estiver com ele aberto
          setSelectedMatch((currentSelected) => {
            if (!currentSelected) return null;
            const updated = incomingMatches.find((m) => m.id === currentSelected.id);
            return updated || currentSelected;
          });
        }
      } catch (err) {
        console.warn('[CS2-HUD] Erro no polling de live-matches:', err);
      }
    };

    // Executa imediatamente na montagem para dados frescos instantâneos
    void fetchLiveMatches();

    const intervalId = setInterval(fetchLiveMatches, 15000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const closeModal = useCallback(() => setSelectedMatch(null), []);

  // Recalcula partida em destaque dinamicamente com base nas partidas ao vivo
  const featuredMatch =
    matches.find((m) => m.id === initialFeaturedMatch?.id) ||
    matches.find((m) => m.status === 'live') ||
    matches[0] ||
    initialFeaturedMatch;

  return (
    <>
      <LiveMatchesCarousel matches={matches} onSelectMatch={setSelectedMatch} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        <div className="lg:col-span-8 flex flex-col gap-space-lg">
          <FeaturedMatchCard match={featuredMatch} onSelectMatch={setSelectedMatch} />
          {news}
        </div>
        <div className="lg:col-span-4 flex flex-col gap-space-lg">{sidebar}</div>
      </div>
      {selectedMatch && (
        <MatchDetailsModal key={selectedMatch.id} match={selectedMatch} onClose={closeModal} />
      )}
    </>
  );
}
