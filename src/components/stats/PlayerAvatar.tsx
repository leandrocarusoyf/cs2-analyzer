'use client';

import React, { useState } from 'react';
import Image from 'next/image';

export interface PlayerAvatarProps {
  playerName: string;
  playerSlug?: string;
  avatarUrl?: string | null;
}

export function PlayerAvatar({ playerName, playerSlug, avatarUrl }: PlayerAvatarProps) {
  const safeName = playerName ?? '';
  const slug = playerSlug || safeName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const resolvedSrc = avatarUrl !== undefined ? avatarUrl : slug ? `/players/${slug}.png` : null;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const showImage = Boolean(resolvedSrc) && failedSrc !== resolvedSrc;

  return (
    <div
      data-testid="player-avatar"
      className="w-[85px] h-[85px] shrink-0 bg-[#0B0E0F] border border-[#1B2226] rounded-[2px] overflow-hidden relative select-none mr-4"
    >
      {showImage ? (
        <Image
          src={resolvedSrc as string}
          width={85}
          height={85}
          loading="lazy"
          className="w-full h-full object-cover object-top"
          alt={`${playerName} profile picture`}
          onError={() => setFailedSrc(resolvedSrc)}
        />
      ) : (
        <div
          data-testid="player-avatar-fallback"
          className="bg-[#111618] border border-[#1B2226] flex items-center justify-center w-full h-full"
        >
          <span className="text-sm font-bold font-mono text-text-secondary">
            {safeName.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}

