'use client';

import React, { useEffect, useState } from 'react';

interface DynamicTeamLogoProps {
  teamName: string;
  size?: number;
  className?: string;
}

const logoCache = new Map<string, string | null>();

export function DynamicTeamLogo({ teamName, size = 20, className = '' }: DynamicTeamLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null | undefined>(() => {
    return logoCache.get(teamName);
  });
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (logoCache.has(teamName)) {
      setLogoUrl(logoCache.get(teamName));
      return;
    }

    let isMounted = true;
    fetch(`/api/liquipedia?type=team&name=${encodeURIComponent(teamName)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch logo');
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          const url = data?.logoUrl || null;
          logoCache.set(teamName, url);
          setLogoUrl(url);
        }
      })
      .catch(() => {
        if (isMounted) {
          logoCache.set(teamName, null);
          setLogoUrl(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [teamName]);

  // If a valid logo URL was resolved dynamically from Liquipedia / CDN
  if (logoUrl && !imgFailed) {
    return (
      <img
        src={logoUrl}
        alt={`${teamName} logo`}
        width={size}
        height={size}
        onError={() => setImgFailed(true)}
        className={`object-contain shrink-0 ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    );
  }

  // Tactical custom emblem fallback matching reference screenshots
  return renderTacticalFallback(teamName, size, className);
}

function renderTacticalFallback(teamName: string, size: number, className: string) {
  const norm = teamName.trim().toLowerCase();

  // Beyond Limits (Gold / Winged Eagle insignia)
  if (norm.includes('beyond') || norm.includes('limits')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={`shrink-0 ${className}`}
        aria-label={teamName}
      >
        <path
          d="M12 3L4 9L7 12L12 7L17 12L20 9L12 3Z"
          fill="#E2B714"
          stroke="#E2B714"
          strokeWidth="1.2"
        />
        <path
          d="M12 8L6 13L9 16L12 13L15 16L18 13L12 8Z"
          fill="#FFD700"
          opacity="0.9"
        />
        <path
          d="M12 14L8 18L12 21L16 18L12 14Z"
          fill="#E2B714"
        />
      </svg>
    );
  }

  // my life be like (Red / Yellow insignia)
  if (norm.includes('life') || norm.includes('be like')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={`shrink-0 ${className}`}
        aria-label={teamName}
      >
        <circle cx="12" cy="12" r="10" fill="#201010" stroke="#FF5722" strokeWidth="1.5" />
        <path
          d="M8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16"
          stroke="#FFD700"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="2" fill="#FF5722" />
      </svg>
    );
  }

  // Zomblers (Skull emblem)
  if (norm.includes('zombler')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={`shrink-0 ${className}`}
        aria-label={teamName}
      >
        <path
          d="M6 9C6 5.686 8.686 3 12 3C15.314 3 18 5.686 18 9C18 12.04 15.71 14.54 12.78 14.94L13.5 19H10.5L11.22 14.94C8.29 14.54 6 12.04 6 9Z"
          fill="#D1D5DB"
          stroke="#9CA3AF"
          strokeWidth="1.2"
        />
        <circle cx="9.5" cy="8.5" r="1.5" fill="#111618" />
        <circle cx="14.5" cy="8.5" r="1.5" fill="#111618" />
        <path d="M11 12H13" stroke="#111618" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  // Babag (Green / White shield)
  if (norm.includes('babag')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={`shrink-0 ${className}`}
        aria-label={teamName}
      >
        <path
          d="M12 2L4 5V11C4 16.5 7.4 20.7 12 22C16.6 20.7 20 16.5 20 11V5L12 2Z"
          fill="#0B2B1B"
          stroke="#00FFA3"
          strokeWidth="1.5"
        />
        <path
          d="M12 6L7 9V12C7 15 9.1 17.5 12 18.5C14.9 17.5 17 15 17 12V9L12 6Z"
          fill="#00FFA3"
          opacity="0.8"
        />
      </svg>
    );
  }

  // Overtake Sector (Horned / Crimson crest)
  if (norm.includes('overtake')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={`shrink-0 ${className}`}
        aria-label={teamName}
      >
        <path
          d="M12 3L15 8L20 9L16 13L17 18L12 15L7 18L8 13L4 9L9 8L12 3Z"
          fill="#3B1212"
          stroke="#EF4444"
          strokeWidth="1.5"
        />
        <circle cx="12" cy="12" r="3" fill="#EF4444" />
      </svg>
    );
  }

  // Villainous (Red Devil horns)
  if (norm.includes('villain')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={`shrink-0 ${className}`}
        aria-label={teamName}
      >
        <path
          d="M4 5C5 8 7 10 9 10L7 15H17L15 10C17 10 19 8 20 5C18 7 16 8 14 8L12 4L10 8C8 8 6 7 4 5Z"
          fill="#DC2626"
          stroke="#B91C1C"
          strokeWidth="1.2"
        />
        <circle cx="10" cy="12" r="1.2" fill="#FEE2E2" />
        <circle cx="14" cy="12" r="1.2" fill="#FEE2E2" />
      </svg>
    );
  }

  // Generic fallback: Initials with procedural color
  const initials = teamName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`rounded-[2px] border border-[#1F2629] bg-[#111618] flex items-center justify-center font-mono font-bold text-[10px] text-[#00FFA3] shrink-0 select-none ${className}`}
      title={teamName}
    >
      {initials || 'CS'}
    </div>
  );
}
