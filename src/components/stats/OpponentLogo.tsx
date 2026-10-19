'use client';

import React, { useState } from 'react';

export interface OpponentLogoProps {
  opponentTeam: string;
  opponentSlug?: string;
  logoUrl?: string | null;
}

export function normalizeOpponentSlug(teamName: string): string {
  const normalized = teamName.trim().toLowerCase();
  if (normalized.includes('navi') || normalized.includes('natus')) return 'navi';
  if (normalized.includes('faze')) return 'faze';
  if (normalized.includes('liquid')) return 'liquid';
  if (normalized.includes('spirit')) return 'spirit';
  if (normalized.includes('mouz') || normalized.includes('mouse')) return 'mouz';
  if (normalized.includes('vitality')) return 'vitality';
  if (normalized.includes('g2')) return 'g2';
  if (normalized.includes('furia')) return 'furia';
  return normalized.replace(/[^a-z0-9_-]/g, '');
}

export function OpponentLogo({ opponentTeam, opponentSlug, logoUrl }: OpponentLogoProps) {
  const slug = opponentSlug || normalizeOpponentSlug(opponentTeam);
  const resolvedSrc = logoUrl !== undefined ? logoUrl : `/teams/${slug}.svg`;
  const [hasError, setHasError] = useState(false);

  const showImage = Boolean(resolvedSrc) && !hasError;

  return (
    <div
      title={opponentTeam}
      data-testid="opponent-logo"
      className="w-5 h-5 mx-auto mt-1 flex items-center justify-center shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform duration-150"
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedSrc as string}
          width={20}
          height={20}
          loading="lazy"
          alt={`${opponentTeam} logo`}
          className="w-5 h-5 object-contain"
          onError={() => setHasError(true)}
        />
      ) : (
        <div
          data-testid="opponent-logo-fallback"
          className="w-5 h-5 bg-[#1F2629] border border-[#2A353D] rounded-[1px] flex items-center justify-center"
        >
          <span className="text-[10px] font-mono font-bold text-[#7E8F98] leading-none">
            {opponentTeam.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}

