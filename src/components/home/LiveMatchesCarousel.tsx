'use client';

import React, { useState } from 'react';
import { getMatchScores } from '../../utils/match-score';
import { getTeamRegion } from '../../utils/teamRegions';
import type { MatchItem } from '../../types/home-data';

export interface LiveMatchesCarouselProps {
  matches?: MatchItem[];
  onSelectMatch?: (match: MatchItem) => void;
}

function formatMatchTime(dateString?: string | null): string {
  if (!dateString) return 'A DEFINIR';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return isToday ? `HOJE, ${timeStr}` : `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, ${timeStr}`;
}

export function LiveMatchesCarousel({ matches = [], onSelectMatch }: LiveMatchesCarouselProps) {
  const [isMatchesExpanded, setIsMatchesExpanded] = useState(false);
  const liveCount = matches.filter((m) => m.status === 'live').length;

  return (
    <section className="flex flex-col gap-space-sm mb-space-lg select-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-space-sm">
          <span className="w-1 h-3.5 bg-primary-container rounded"></span>
          <h2 className="font-card-header text-card-header tracking-wider uppercase text-on-surface font-semibold">
            LIVE &amp; UPCOMING MATCHES
          </h2>
          <span className="px-1.5 py-0.5 rounded-full bg-error-container text-on-error-container font-benchmark-label text-benchmark-label font-bold">
            {liveCount} LIVE
          </span>
        </div>
        <button
          type="button"
          aria-expanded={isMatchesExpanded}
          aria-controls="home-match-list"
          onClick={() => setIsMatchesExpanded(value => !value)}
          className="group flex items-center gap-1 font-benchmark-label text-benchmark-label uppercase text-primary-container hover:text-primary transition-colors tracking-widest"
        >
          <span>{isMatchesExpanded ? 'VER MENOS' : 'VER TODOS'}</span>
          <span className="material-symbols-outlined text-[14px] group-hover:translate-x-0.5 transition-transform">
            arrow_forward
          </span>
        </button>
      </div>

      <div id="home-match-list" className={isMatchesExpanded ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-space-md" : "flex gap-space-md overflow-hidden"}>
        {matches.length === 0 ? (
          <div className="col-span-1 md:col-span-3 bg-surface-container-low rounded-xl p-space-lg text-center border border-outline-variant/30 flex flex-col items-center justify-center gap-2 py-8">
            <span className="material-symbols-outlined text-[32px] text-primary-container/80">sports_esports</span>
            <span className="font-card-header text-card-header text-on-surface font-bold uppercase tracking-wider">
              Nenhuma partida no momento
            </span>
            <span className="font-body-sm text-outline text-xs max-w-md">
              Aguardando próximas transmissões ao vivo ou atualizações da agenda de partidas via Dust2 Brasil.
            </span>
          </div>
        ) : (
          (isMatchesExpanded ? matches : matches.slice(0, 4)).map((match, index) => {
            const isLive = match.status === 'live';
            const team1Code = match.team1.code || match.team1.name.slice(0, 3).toUpperCase();
            const team2Code = match.team2.code || match.team2.name.slice(0, 3).toUpperCase();
            const team1Flag = match.team1.flag || '🌐';
            const team2Flag = match.team2.flag || '🌐';
            const team1Rank = match.team1.rank_label || (match.team1.rank ? `#${match.team1.rank} WRLD` : '#-');
            const team2Rank = match.team2.rank_label || (match.team2.rank ? `#${match.team2.rank} WRLD` : '#-');
            const { seriesScore, mapScore } = getMatchScores(match);

            // Top highlight line styling
            let topBarClass = 'bg-surface-container-highest';
            if (isLive) {
              topBarClass =
                index === 0
                  ? 'bg-gradient-to-r from-error via-primary-container to-transparent opacity-80'
                  : 'bg-error opacity-80';
            }

            return (
              <button
                type="button"
                onClick={() => onSelectMatch?.(match)}
                aria-label={`Ver detalhes de ${match.team1.name} contra ${match.team2.name}`}
                key={match.id || `${match.team1.name}-${match.team2.name}-${index}`}
                className={`text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-container ${isMatchesExpanded ? 'min-w-0' : 'shrink-0 w-[min(88vw,380px)]'} relative group bg-surface-container-low hover:bg-surface-container transition-all duration-200 rounded-xl p-space-md shadow-md flex flex-col justify-between overflow-hidden`}
              >
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${topBarClass}`}></div>

                {/* Card Header: Tournament & Status */}
                <div className="flex items-center justify-between mb-space-sm">
                  <span className="font-benchmark-label text-benchmark-label text-on-surface-variant uppercase tracking-wider truncate max-w-[140px]">
                    {match.event_name}
                  </span>

                  {isLive ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-error-container text-on-error-container font-stat-mono-md text-benchmark-label font-bold uppercase shadow-[0_0_10px_rgba(239,68,68,0.35)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span>
                      LIVE
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-high text-primary font-stat-mono-md text-benchmark-label font-bold uppercase">
                      <span className="material-symbols-outlined text-[12px]">schedule</span>
                      {match.scheduled_label || formatMatchTime(match.scheduled_at)}
                    </span>
                  )}
                </div>

                {/* Teams & Center Score / VS */}
                <div className="flex items-center justify-between py-space-xs">
                  {/* Team 1 */}
                  <div className="flex items-center gap-space-sm flex-1 min-w-0">
                    <div className="w-9 h-9 rounded bg-surface-container-highest flex items-center justify-center font-stat-mono-md text-stat-mono-md font-bold text-on-surface shadow-inner relative flex-shrink-0 overflow-hidden">
                      {match.team1.logo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={match.team1.logo_url} alt={match.team1.name} className="w-6 h-6 object-contain" />
                      ) : (
                        <span className={match.team1.code_color_class || 'text-on-surface'}>{team1Code}</span>
                      )}
                      <span className="absolute -bottom-1 -right-1 text-[10px]">{team1Flag}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-card-header text-card-header text-on-surface truncate font-bold">
                        {match.team1.name}
                      </span>
                      <span className="font-benchmark-label text-benchmark-label text-outline">{getTeamRegion(match.team1.name)} · {team1Rank}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center px-2 shrink-0">
                    {isLive ? (
                      <div className="flex flex-col items-center justify-center" aria-label="Placar do mapa e da série">
                        <span className="text-xs text-slate-400 font-mono tracking-wider tabular-nums">
                          {seriesScore}
                        </span>
                        <span className="text-sm sm:text-base font-bold text-white font-mono tabular-nums">
                          {mapScore}
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono tabular-nums text-sm font-bold text-on-surface" aria-label="Horário da partida">
                        {match.scheduled_label || formatMatchTime(match.scheduled_at)}
                      </span>
                    )}
                    {match.match_format && <span className="text-xs text-on-surface-variant">{match.match_format}</span>}
                  </div>

                  {/* Team 2 */}
                  <div className="flex items-center gap-space-sm flex-1 justify-end min-w-0">
                    <div className="flex flex-col items-end min-w-0">
                      <span className="font-card-header text-card-header text-on-surface truncate font-bold">
                        {match.team2.name}
                      </span>
                      <span className="font-benchmark-label text-benchmark-label text-outline">{getTeamRegion(match.team2.name)} · {team2Rank}</span>
                    </div>
                    <div className="w-9 h-9 rounded bg-surface-container-highest flex items-center justify-center font-stat-mono-md text-stat-mono-md font-bold shadow-inner relative flex-shrink-0 overflow-hidden">
                      {match.team2.logo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={match.team2.logo_url} alt={match.team2.name} className="w-6 h-6 object-contain" />
                      ) : (
                        <span className={match.team2.code_color_class || 'text-on-surface'}>{team2Code}</span>
                      )}
                      <span className="absolute -bottom-1 -right-1 text-[10px]">{team2Flag}</span>
                    </div>
                  </div>
                </div>

                {/* Sub Breakdown / Veto Forecast */}
                <div className="mt-space-sm pt-space-xs flex items-center justify-between font-stat-mono-md text-benchmark-label bg-surface-container-lowest/70 px-space-sm py-1 rounded">
                  {isLive ? (
                    <>
                      <div className="flex items-center gap-1.5 text-on-surface-variant truncate">
                        {match.current_map ? (
                          <>
                            <span className="text-outline">Mapa {match.current_map.name}:</span>
                            <span className="text-primary font-bold">
                              {match.current_map.team1_rounds ?? 0} - {match.current_map.team2_rounds ?? 0}
                            </span>
                          </>
                        ) : match.breakdown_text ? (
                          <span className="truncate">{match.breakdown_text}</span>
                        ) : (
                          <span className="text-tertiary-fixed-dim font-semibold animate-pulse">Partida em andamento</span>
                        )}
                      </div>
                      <span className="material-symbols-outlined text-primary-container text-[14px]">
                        {match.breakdown_icon || 'sensors'}
                      </span>
                    </>
                  ) : (
                    <span className="text-on-surface-variant truncate">
                      {match.veto_forecast || `Horário agendado: ${formatMatchTime(match.scheduled_at)}`}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

export default LiveMatchesCarousel;
