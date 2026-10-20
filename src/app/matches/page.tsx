import React from 'react';
import { getRecentMatches, type MatchWithDetails } from '../../lib/queries/matches.ts';
import { MatchesAccordion } from '../../components/matches/MatchesAccordion.tsx';

export const dynamic = 'force-dynamic';

export default async function MatchesCatalogPage() {
  let matches: MatchWithDetails[] = [];

  try {
    matches = await getRecentMatches(20);
  } catch (error) {
    console.error('[MATCHES_CATALOG_PAGE_ERROR]:', error);
  }

  return (
    <section aria-labelledby="matches-heading" className="space-y-4 select-none pb-8">
      <MatchesAccordion initialMatches={matches} />
    </section>
  );
}
