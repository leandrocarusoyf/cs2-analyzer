'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MatchItem } from '../../types/home-data';
import type { MatchDetails, MatchMvp, MatchPlayerStats, MatchRound } from '../../types/match-details';
import { MatchMvpPlaceholder } from './MatchMvpPlaceholder';
import { getTeamRegion } from '../../utils/teamRegions';

export interface MatchDetailsModalProps {
  match: MatchItem;
  onClose: () => void;
}

const metric = (value: number | null, decimals = 1) => value === null ? '—' : value.toFixed(decimals);

function resolvePlayerTeamName(
  player: { id?: string; name?: string },
  team1Players: MatchPlayerStats[],
  team2Players: MatchPlayerStats[],
  team1Name: string,
  team2Name: string,
): string | undefined {
  if (team1Players.some(p => p.id === player.id || p.name === player.name)) return team1Name;
  if (team2Players.some(p => p.id === player.id || p.name === player.name)) return team2Name;
  return undefined;
}

export function MatchMvpCard({ mvp }: { mvp: MatchMvp }) {
  return (
    <section className="min-h-[172px] border border-primary-container/30 bg-surface-container p-4 rounded-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-xs font-semibold text-primary-container uppercase tracking-wider">
          DESTAQUE MAPA {mvp.mapNumber} ({mvp.mapName})
        </h3>
        {mvp.teamName && (
          <span className="text-xs font-mono font-bold text-primary-container px-2 py-0.5 rounded bg-surface-container-high border border-primary-container/20">
            {mvp.teamName}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-3 flex-wrap">
        <p className="text-xl sm:text-2xl font-bold text-white tracking-wide">
          {mvp.fullName || mvp.name}
        </p>
        {mvp.teamName && (
          <span className="text-sm font-semibold text-on-surface-variant">
            {mvp.teamName}
          </span>
        )}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 font-mono tabular-nums">
        {([
          ['K-D', `${mvp.kills ?? '—'}-${mvp.deaths ?? '—'}`],
          ['K/D Ratio', mvp.kills !== null && mvp.deaths ? (mvp.kills / mvp.deaths).toFixed(2) : '—'],
          ['ADR', metric(mvp.adr)],
          [`Rating${mvp.ratingVersion ? ` ${mvp.ratingVersion}` : ''}`, metric(mvp.rating, 2)],
        ] as const).map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-on-surface-variant">{label}</dt>
            <dd className="mt-1 text-lg font-bold text-on-surface">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function StatsTable({ name, players, upcoming }: { name: string; players: MatchPlayerStats[]; upcoming: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-right whitespace-nowrap font-mono tabular-nums">
        <caption className="text-left py-3 font-sans font-bold">
          {name} <span className="text-xs font-normal text-on-surface-variant">{getTeamRegion(name)}</span>
        </caption>
        <thead className="bg-surface-container-high text-on-surface-variant text-xs">
          <tr>
            {['Jogador', 'K-D', '+/-', 'ADR', 'KAST', 'Rating'].map(label => (
              <th scope="col" key={label} className="px-3 py-2 first:text-left">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map(player => (
            <tr key={player.id} className="border-b border-outline-variant/30">
              <th scope="row" className="p-3 text-left font-medium">{player.name}</th>
              <td className="px-3">{player.kills ?? '—'}-{player.deaths ?? '—'}</td>
              <td className="px-3">{player.difference === undefined || player.difference === null ? '—' : `${player.difference > 0 ? '+' : ''}${player.difference}`}</td>
              <td className="px-3">{metric(player.adr)}</td>
              <td className="px-3">{player.kast === null ? '—' : `${player.kast.toFixed(1)}%`}</td>
              <td className="px-3 font-bold">{metric(player.rating, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!players.length && (
        <p className="py-5 text-sm text-on-surface-variant">
          {upcoming ? 'Estatísticas indisponíveis antes do início da partida' : 'Estatísticas ainda não publicadas para este mapa.'}
        </p>
      )}
    </div>
  );
}

function RoundIcon({ reason }: { reason: MatchRound['reason'] }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      {reason === 'bomb' ? (
        <>
          <rect x="5" y="8" width="14" height="13" rx="2" />
          <path d="M9 8V4h6v4M8 12h8M9 16h2m2 0h2" />
        </>
      ) : (
        <>
          <path d="M7 17v-2a8 8 0 1 1 10 0v2l-2 1v3H9v-3Z" />
          <circle cx="9" cy="10" r="1" />
          <circle cx="15" cy="10" r="1" />
          <path d="m11 15 1-2 1 2" />
        </>
      )}
    </svg>
  );
}

export function RoundTimeline({ rounds, match }: { rounds: MatchRound[]; match: MatchItem }) {
  const halves = [...new Set(rounds.map(round => round.half))];
  return (
    <section>
      <h3 className="font-bold text-sm mb-3">Histórico de rounds</h3>
      <p className="text-xs mb-3">
        <span className="text-orange-300">TR · laranja</span>
        <span className="text-blue-300 ml-3">CT · azul</span>
      </p>
      <div className="flex gap-6 overflow-x-auto pb-3">
        {halves.map(half => (
          <div key={half} className="shrink-0">
            <p className="text-xs text-on-surface-variant mb-2">
              {half <= 2 ? `${half}ª metade` : `Prorrogação ${half - 2}`}
            </p>
            <ol className="flex gap-1">
              {rounds.filter(round => round.half === half).map(round => (
                <li
                  key={round.number}
                  title={`Round ${round.number}: ${match[round.winner].name} · ${round.side} · ${round.reason === 'bomb' ? 'C4' : 'Eliminação'}`}
                  className={`flex w-8 flex-col items-center gap-2 py-2 border ${
                    round.side === 'TR'
                      ? 'text-orange-300 bg-orange-500/10 border-orange-500/30'
                      : 'text-blue-300 bg-blue-500/10 border-blue-500/30'
                  }`}
                >
                  <span className="sr-only">
                    {match[round.winner].name} · {round.side} · {round.reason === 'bomb' ? 'C4' : 'Eliminação'}
                  </span>
                  <RoundIcon reason={round.reason} />
                  <span className="font-mono text-xs">{round.number}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      {!rounds.length && <p className="text-sm text-on-surface-variant">Nenhum round registrado neste mapa.</p>}
    </section>
  );
}

export function MatchDetailsModal({ match, onClose }: MatchDetailsModalProps) {
  const [details, setDetails] = useState<MatchDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [activeMap, setActiveMap] = useState<number>();

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    setDetails(null);
    setActiveMap(undefined);

    async function loadDetails() {
      try {
        const response = await fetch(`/api/match-details?url=${encodeURIComponent(match.source_url ?? match.id)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Não foi possível carregar os detalhes da partida.');
        const data: MatchDetails = await response.json();
        if (!Array.isArray(data.maps) || !Array.isArray(data.team1Stats) || !Array.isArray(data.team2Stats)) {
          throw new Error('Resposta de partida inválida.');
        }
        if (controller.signal.aborted) return;
        setDetails(data);
        setActiveMap(data.maps[0]?.number);
      } catch {
        if (!controller.signal.aborted) setError('Não foi possível carregar os detalhes da partida. Tente novamente.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadDetails();
    return () => controller.abort();
  }, [match.id, match.source_url, attempt]);

  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  const selected = details?.maps.find(map => map.number === activeMap) ?? details?.maps[0];

  const currentTeam1Players = selected
    ? (selected.team1.length ? selected.team1 : (details?.maps.length === 1 || selected.number === 1 ? (details?.team1Stats ?? []) : []))
    : (details?.team1Stats ?? []);

  const currentTeam2Players = selected
    ? (selected.team2.length ? selected.team2 : (details?.maps.length === 1 || selected.number === 1 ? (details?.team2Stats ?? []) : []))
    : (details?.team2Stats ?? []);

  const allActivePlayers = [...currentTeam1Players, ...currentTeam2Players];

  // Identificar MVP do backend para o mapa selecionado (se presente)
  const isBackendMvpForThisMap = details?.mvp && selected && details.mvp.mapNumber === selected.number;

  let displayMvp: MatchMvp | null = null;

  if (isBackendMvpForThisMap && details?.mvp) {
    const teamName = resolvePlayerTeamName(
      details.mvp,
      currentTeam1Players,
      currentTeam2Players,
      match.team1.name,
      match.team2.name,
    );
    displayMvp = { ...details.mvp, teamName: details.mvp.teamName || teamName };
  } else if (allActivePlayers.length > 0) {
    // Cálculo inteligente local: reúne os jogadores das duas equipes e seleciona o atleta com maior rating
    const rated = allActivePlayers.filter(
      (p): p is MatchPlayerStats & { rating: number } => p.rating !== null && p.rating !== undefined && !isNaN(p.rating),
    );
    rated.sort((a, b) => b.rating - a.rating);
    const topPlayer = rated[0] ?? allActivePlayers[0];
    if (topPlayer) {
      const teamName = resolvePlayerTeamName(
        topPlayer,
        currentTeam1Players,
        currentTeam2Players,
        match.team1.name,
        match.team2.name,
      );
      displayMvp = {
        ...topPlayer,
        fullName: topPlayer.fullName || topPlayer.name,
        mapNumber: selected?.number ?? 1,
        mapName: selected?.name ?? 'DE_MAP',
        ratingVersion: topPlayer.ratingVersion ?? null,
        teamName,
      };
    }
  }

  const isLiveMapWithoutStats = selected?.status === 'live' && allActivePlayers.length === 0;

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const root = panel.current;
    root?.querySelector<HTMLButtonElement>('button')?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !root) return;
      const elements = Array.from(root.querySelectorAll<HTMLElement>('button, [href], [tabindex="0"]'));
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', handleKey);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-5xl max-h-[90dvh] overflow-y-auto bg-surface-container-low text-on-surface border border-outline-variant/50 rounded-sm"
      >
        <header className="p-5 sm:p-6 border-b border-outline-variant/30">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-sm font-bold uppercase tracking-wide">
              {match.event_name} · Detalhes da partida
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar detalhes da partida"
              className="px-3 py-2 hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-container"
            >
              Fechar ×
            </button>
          </div>
          <p id={descriptionId} className="text-xs text-on-surface-variant mt-2">
            Estatísticas da Dust2 Brasil com detalhamento por mapa e telemetria de performance.
          </p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mt-6">
            <div>
              <p className="font-bold text-lg sm:text-2xl break-words">{match.team1.name}</p>
              <p className="text-xs mt-1 text-on-surface-variant">{getTeamRegion(match.team1.name)}</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-2xl sm:text-4xl font-bold tabular-nums">
                {match.team1.seriesScore} : {match.team2.seriesScore}
              </p>
              <p className="text-xs mt-2 text-on-surface-variant">
                {match.match_format ?? 'BO3'} · {match.status === 'live' ? 'AO VIVO' : match.status === 'finished' ? 'FINALIZADA' : 'AGENDADA'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg sm:text-2xl break-words">{match.team2.name}</p>
              <p className="text-xs mt-1 text-on-surface-variant">{getTeamRegion(match.team2.name)}</p>
            </div>
          </div>
        </header>

        <div className="p-5 sm:p-6 space-y-6" aria-busy={isLoading}>
          {isLoading ? (
            <div role="status" className="py-12 flex items-center justify-center gap-3 text-sm text-on-surface-variant">
              <span
                aria-hidden="true"
                className="h-5 w-5 rounded-full border-2 border-outline-variant border-t-primary-container animate-spin motion-reduce:animate-none"
              />
              Carregando detalhes da partida...
            </div>
          ) : error ? (
            <div role="alert" className="py-8 text-center">
              <p className="text-sm text-on-surface-variant">{error}</p>
              <button
                type="button"
                className="mt-4 px-4 py-2 border border-outline-variant text-sm text-primary-container"
                onClick={() => setAttempt(value => value + 1)}
              >
                Tentar novamente
              </button>
            </div>
          ) : details && (
            <>
              {/* Sequência de Mapas Interativa */}
              <div role="group" aria-label="Seleção de mapa" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {details.maps.map(map => {
                  const isActive = map.number === (activeMap ?? details.maps[0]?.number);
                  return (
                    <button
                      type="button"
                      key={map.number}
                      aria-pressed={isActive}
                      onClick={() => setActiveMap(map.number)}
                      className={`text-left p-3 border focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-container transition-all ${
                        isActive
                          ? 'border-cyan-400 bg-cyan-400/5 text-cyan-200 ring-1 ring-cyan-400/40'
                          : map.status === 'live'
                          ? 'border-cyan-400/50 text-on-surface hover:bg-surface-container'
                          : map.status === 'finished'
                          ? 'border-outline-variant/50 text-on-surface hover:bg-surface-container'
                          : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      <span className="flex flex-wrap justify-between items-center gap-2">
                        <span className={`font-mono text-sm font-bold ${map.status === 'upcoming' ? 'opacity-60' : ''}`}>
                          {map.number}. {map.name}
                        </span>
                        {map.status === 'live' && (
                          <span className="px-1.5 py-0.5 bg-red-500/20 text-red-300 text-xs font-bold">
                            AO VIVO
                          </span>
                        )}
                      </span>
                      <span className="block mt-2 text-xs font-mono tabular-nums text-on-surface-variant">
                        {map.status === 'upcoming'
                          ? 'A jogar / Próximo'
                          : `${map.score?.replace(/\s*[:–-]\s*/, ' - ') ?? 'Placar indisponível'} · ${
                              map.status === 'finished' ? 'Finalizado' : 'Em andamento'
                            }`}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Card de Destaque / MVP */}
              {displayMvp ? (
                <MatchMvpCard mvp={displayMvp} />
              ) : isLiveMapWithoutStats ? (
                <MatchMvpPlaceholder message="Aguardando término do mapa para definir o Destaque" />
              ) : selected?.status === 'upcoming' ? (
                <MatchMvpPlaceholder message="Aguardando início do mapa para definir o Destaque" />
              ) : (
                <MatchMvpPlaceholder />
              )}

              {/* Tabelas de Estatísticas do Mapa Ativo */}
              {selected ? (
                <>
                  <section aria-label={`Estatísticas ${selected.name}`} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <StatsTable
                      name={match.team1.name}
                      players={currentTeam1Players}
                      upcoming={selected.status === 'upcoming' || match.status === 'upcoming'}
                    />
                    <StatsTable
                      name={match.team2.name}
                      players={currentTeam2Players}
                      upcoming={selected.status === 'upcoming' || match.status === 'upcoming'}
                    />
                  </section>
                  <RoundTimeline rounds={selected.rounds} match={match} />
                </>
              ) : (
                <>
                  <p className="text-sm text-on-surface-variant">Mapas ainda não disponíveis.</p>
                  <section aria-label="Estatísticas gerais" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <StatsTable
                      name={match.team1.name}
                      players={details.team1Stats}
                      upcoming={match.status === 'upcoming'}
                    />
                    <StatsTable
                      name={match.team2.name}
                      players={details.team2Stats}
                      upcoming={match.status === 'upcoming'}
                    />
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
