'use client';

import React from 'react';
import { KillFeedEvent } from '@/types/replay';
import { formatWeaponName } from '@/lib/replay/weapons';

interface KillFeedProps {
  events: KillFeedEvent[];
  currentTick: number;
  durationTicks?: number;
}

export const KillFeed: React.FC<KillFeedProps> = ({
  events,
  currentTick,
  durationTicks = 320,
}) => {
  const visibleEvents = events.filter(
    (k) => currentTick >= k.tick && currentTick <= k.tick + durationTicks
  );

  return (
    <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20 pointer-events-none max-w-sm">
      {visibleEvents.map((kill, idx) => (
        <div
          key={kill.tick + '-' + kill.victimId + '-' + idx}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-[11px] shadow-lg backdrop-blur-sm animate-fade-in"
        >
          <span
            className={'font-semibold ' + (
              kill.killerTeam === 'CT' ? 'text-sky-400' : 'text-amber-400'
            )}
          >
            {kill.killerName}
          </span>

          {kill.assisterName && (
            <span className="text-slate-400 text-[10px]">
              {'+ ' + kill.assisterName}
            </span>
          )}

          <span className="text-slate-400 font-mono text-[10px] px-1 bg-slate-800 rounded">
            {formatWeaponName(kill.weapon)}
          </span>

          {kill.isThroughSmoke && <span title="Pela Fumaça">💨</span>}
          {kill.isWallbang && <span title="Varado">🧱</span>}
          {kill.isNoScope && <span title="Sem Mira">🎯</span>}
          {kill.isHeadshot && <span title="Tiro na Cabeça" className="text-red-400 font-bold">HS</span>}

          <span
            className={'font-semibold ' + (
              kill.victimTeam === 'CT' ? 'text-sky-400' : 'text-amber-400'
            )}
          >
            {kill.victimName}
          </span>
        </div>
      ))}
    </div>
  );
};
