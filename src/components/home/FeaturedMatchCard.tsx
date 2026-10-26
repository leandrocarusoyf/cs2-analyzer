import React from 'react';
import { MatchMvpPlaceholder } from './MatchMvpPlaceholder';
import { getMatchScores } from '../../utils/match-score';
import { getTeamRegion } from '../../utils/teamRegions';
import type {
  MatchItem,
  FeaturedMatchData,
  FeaturedMVP,
  FeaturedTeam,
  FeaturedMap,
} from '../../types/home-data';

export interface FeaturedMatchCardProps {
  match?: MatchItem | null;
  onSelectMatch?: (match: MatchItem) => void;
  matchData?: FeaturedMatchData;
  mvpOverride?: FeaturedMVP;
  team1Override?: FeaturedTeam;
  team2Override?: FeaturedTeam;
  mapsOverride?: FeaturedMap[];
}

function FuriaLogoSvg() {
  return (
    <svg className="w-full h-full text-cyan-400 drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]" viewBox="0 0 100 100" fill="currentColor">
      <path d="M88 42c-3-1-12-6-18-2-4 3-8 3-12 1-7-3-12-10-18-15-4-3-10-4-15-3-3 1-5 4-8 5-4 1-9 0-13-2-2-1-3 1-2 3 3 5 8 9 14 11 4 2 9 1 13 0 5-1 10 0 14 3 5 4 10 9 16 11 7 3 15 2 22-1 4-2 8-6 12-9 1-1 0-2-2-3zm-20 8c-4-1-8-1-12 0-3 1-6 2-9 2-4 0-7-2-11-2-5 0-9 2-13 4-2 1-2 3 0 4 3 2 7 2 11 1 5-1 10-1 15 1 4 2 8 2 12 0 3-1 6-3 8-5 1-1 0-1-1-1zm-18 14c-4 1-8 3-12 3-5 0-9-2-14-3-2 0-2 2-1 3 3 3 8 4 13 4 5 0 9-1 13-3 2-1 3-3 1-4z" />
      <circle cx="42" cy="35" r="2.5" fill="#00e5ff" />
    </svg>
  );
}

function NaviLogoSvg() {
  return (
    <svg className="w-full h-full text-yellow-400" viewBox="0 0 100 100" fill="currentColor">
      <path d="M16 74V26h14l24 32V26h14v48H54L30 42v32H16z" fill="#FFEE00" />
      <polygon points="74,26 88,26 88,74 74,74" fill="#FFEE00" opacity="0.9" />
    </svg>
  );
}

export function FeaturedMatchCard({
  match,
  onSelectMatch,
  matchData,
  mvpOverride,
  team1Override,
  team2Override,
  mapsOverride,
}: FeaturedMatchCardProps) {
  // Se match foi explicitamente passado como null e não há matchData, exibe estado vazio sem crash
  if (!match && !matchData) {
    return (
      <div className="relative bg-surface-container-low rounded-xl p-space-lg shadow-xl overflow-hidden flex flex-col gap-space-md select-none border border-outline-variant/30 text-center py-12">
        <div className="flex flex-col items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[36px] text-primary-container/70">stream</span>
          <h3 className="font-card-header text-card-header uppercase tracking-wider text-on-surface font-bold text-base">
            NENHUMA PARTIDA EM DESTAQUE NO MOMENTO
          </h3>
          <p className="font-body-sm text-outline text-xs max-w-md">
            Aguardando transmissões ao vivo ou partidas agendadas da Dust2 Brasil para alimentar a telemetria do HUD tático.
          </p>
        </div>
      </div>
    );
  }

  // Se match for fornecido dinamicamente da API da Dust2 Brasil:
  const isLive = match ? match.status === 'live' : (matchData?.is_live ?? false);
  const currentMapName = match?.current_map?.name || '';

  const team1: FeaturedTeam = team1Override || (match ? {
    name: match.team1.name.toUpperCase(),
    country: getTeamRegion(match.team1.name),
    rank_label: match.team1.rank ? `#${match.team1.rank} WRLD` : (match.team1.rank_label || 'Rank indisponível'),
    win_rate: '',
    tactical_side: '',
    side_type: 't' as const,
    logo_svg_type: match.team1.name.toLowerCase().includes('furia') ? ('furia' as const) : undefined,
  } : matchData!.team1);

  const team2: FeaturedTeam = team2Override || (match ? {
    name: match.team2.name.toUpperCase(),
    country: getTeamRegion(match.team2.name),
    rank_label: match.team2.rank ? `#${match.team2.rank} WRLD` : (match.team2.rank_label || 'Rank indisponível'),
    win_rate: '',
    tactical_side: '',
    side_type: 'ct' as const,
    logo_svg_type: match.team2.name.toLowerCase().includes('navi') ? ('navi' as const) : undefined,
  } : matchData!.team2);

  const team1Score = match ? match.team1.seriesScore : (matchData?.team1_series_score ?? 0);
  const team2Score = match ? match.team2.seriesScore : (matchData?.team2_series_score ?? 0);
  const seriesFormat = match ? (match.match_format ? `SÉRIE ${match.match_format}` : 'SÉRIE MD3 (BO3)') : (matchData?.series_format || 'SÉRIE MD3 (BO3)');

  const currentMapNumber = match?.current_map?.number ?? (isLive && match?.series_score?.match(/^\d+\s*[:-]\s*\d+$/) ? team1Score + team2Score + 1 : undefined);
  const maps: FeaturedMap[] = mapsOverride || (match ? (match.current_map && currentMapNumber !== undefined ? [{
    number: currentMapNumber, name: match.current_map.name.toUpperCase().replace(/^(?!DE_)/, 'DE_'),
    status: isLive ? 'AO VIVO' : match.status === 'finished' ? 'FINALIZADO' : 'SE NECESSÁRIO',
    score: `${match.team1.mapScore} - ${match.team2.mapScore}`,
    pick_info: '', sub_info: '', is_active: isLive,
  }] : []) : matchData?.maps || []);
  const mvp = maps.some(map => map.number === 1 && map.status === 'FINALIZADO')
    ? mvpOverride || matchData?.mvp : undefined;

  const title = match?.event_name
    ? `PARTIDA EM DESTAQUE // ${match.event_name.toUpperCase()}`
    : (matchData?.title || 'PARTIDA EM DESTAQUE // DETALHES AO VIVO');

  const statusLabel = isLive
    ? (match?.current_map ? `MAPA ${match.current_map.name.toUpperCase()} EM ANDAMENTO` : 'AO VIVO')
    : match?.status === 'finished' ? 'FINALIZADA' : 'AGENDADO';


  return (
    <div onClick={match && onSelectMatch ? () => onSelectMatch(match) : undefined} className={`relative bg-surface-container-low rounded-xl p-space-lg shadow-xl overflow-hidden flex flex-col gap-space-md select-none border border-transparent ${match && onSelectMatch ? 'cursor-pointer transition-all hover:border-cyan-500/40' : ''}`}>
      {/* Ambient subtle glow in top corner */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary-container/10 blur-3xl pointer-events-none"></div>

      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-primary-container text-[20px]">stream</span>
          <h3 className="font-card-header text-card-header uppercase tracking-wider text-on-surface font-semibold">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-space-xs">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-error animate-ping' : 'bg-primary-container'}`}></span>
          <span className={`font-benchmark-label text-benchmark-label uppercase font-bold tracking-wider ${isLive ? 'text-error' : 'text-primary-container'}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {match && onSelectMatch && <button type="button" onClick={event => { event.stopPropagation(); onSelectMatch(match); }} aria-label="Abrir detalhes da partida em destaque" className="relative self-end px-3 py-2 text-xs font-bold text-primary-container border border-outline-variant/40 hover:border-cyan-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-container">VER DETALHES</button>}
      {/* Matchup Banner Hero */}
      <div className="rounded-xl p-6 shadow-xl relative overflow-hidden border border-[#1e293b] bg-[#0a0e14] grid grid-cols-1 md:grid-cols-12 items-center gap-4">
        {/* Team 1 */}
        <div className="col-span-12 md:col-span-5 flex flex-col items-center text-center justify-center gap-2">
          <div className="flex items-center justify-center gap-2.5">
            <div className="w-12 h-12 rounded-xl bg-[#161b26] border border-[#263147] p-1.5 flex items-center justify-center shadow-md flex-shrink-0">
              {team1.logo_svg_type === 'furia' || team1.name.includes('FURIA') ? (
                <FuriaLogoSvg />
              ) : match?.team1.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={match.team1.logo_url} alt={team1.name} className="w-8 h-8 object-contain" />
              ) : (
                <span className="font-stat-mono-md text-primary font-bold">{team1.name.slice(0, 3)}</span>
              )}
            </div>
            <span className="px-2 py-0.5 rounded bg-surface-container-high border border-primary-container/30 text-primary-container font-mono text-benchmark-label font-bold tracking-wider">
              {team1.rank_label}
            </span>
          </div>

          <div className="font-chakra text-[26px] font-extrabold text-white tracking-wider uppercase text-center leading-none mt-1">
            {team1.name}
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] font-semibold text-slate-300 bg-[#161f2e] border border-[#1e293b] px-2 py-0.5 rounded">
              {team1.country}
            </span>
            <span className="font-mono text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-0.5 rounded">
              {team1.win_rate || 'Win rate indisponível'}
            </span>
          </div>

          <div>
            <span className="font-mono text-[11px] font-semibold text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2.5 py-0.5 rounded inline-flex items-center gap-1.5">
              {team1.tactical_side || 'Lado indisponível'}
            </span>
          </div>
        </div>

        {/* Center Series Score */}
        <div className="col-span-12 md:col-span-2 flex flex-col items-center justify-center">
          <div className="bg-[#111827] border border-[#1e293b] rounded-lg px-4 py-3 flex flex-col items-center gap-1.5 shadow-lg w-full max-w-[160px] mx-auto">
            <span className="font-mono text-[10px] font-bold tracking-widest text-[#94a3b8] uppercase">
              {seriesFormat}
            </span>
            <div className="flex items-center justify-center gap-2 font-mono text-3xl font-extrabold leading-none my-0.5">
              <span className="text-[#00e5ff] drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">{team1Score}</span>
              <span className="text-slate-500 text-xl font-normal select-none">-</span>
              <span className="text-white">{team2Score}</span>
            </div>
            {match && isLive && <p aria-label="Rounds do mapa atual" className="font-mono tabular-nums text-lg font-bold text-on-surface">{getMatchScores(match).mapScore}</p>}
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-950/60 border border-red-500/40">
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`}></span>
              <span className="font-mono text-[10px] font-bold text-red-400 tracking-wider uppercase">
                {isLive ? 'live' : 'vs'}
              </span>
            </div>
          </div>
        </div>

        {/* Team 2 */}
        <div className="col-span-12 md:col-span-5 flex flex-col items-center text-center justify-center gap-2">
          <div className="flex items-center justify-center gap-2.5">
            <div className="w-12 h-12 rounded-xl bg-[#161b26] border border-[#263147] p-2 flex items-center justify-center shadow-md flex-shrink-0">
              {team2.logo_svg_type === 'navi' || team2.name.includes('NAVI') || team2.name.includes('NATUS') ? (
                <NaviLogoSvg />
              ) : match?.team2.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={match.team2.logo_url} alt={team2.name} className="w-8 h-8 object-contain" />
              ) : (
                <span className="font-stat-mono-md text-yellow-400 font-bold">{team2.name.slice(0, 3)}</span>
              )}
            </div>
            <span className="px-2 py-0.5 rounded bg-surface-container-high border border-amber-500/30 text-amber-400 font-mono text-benchmark-label font-bold tracking-wider">
              {team2.rank_label}
            </span>
          </div>

          <div className="font-chakra text-[26px] font-extrabold text-white tracking-wider uppercase text-center leading-none mt-1">
            {team2.name}
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] font-semibold text-slate-300 bg-[#161f2e] border border-[#1e293b] px-2 py-0.5 rounded">
              {team2.country}
            </span>
            <span className="font-mono text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-0.5 rounded">
              {team2.win_rate || 'Win rate indisponível'}
            </span>
          </div>

          <div>
            <span className="font-mono text-[11px] font-semibold text-sky-300 bg-sky-950/40 border border-sky-500/30 px-2.5 py-0.5 rounded inline-flex items-center gap-1.5">
              {team2.tactical_side || 'Lado indisponível'}
            </span>
          </div>
        </div>
      </div>

      {/* 3 Map Pill Sequence */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
        {maps.map((map) => {
          if (map.status === 'FINALIZADO') {
            return (
              <div
                key={map.number}
                className="bg-surface-container-lowest p-space-sm rounded-lg flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-stat-mono-md text-stat-mono-md font-bold text-on-surface">
                    {map.number}. {map.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-primary-container/20 text-primary-container font-benchmark-label text-benchmark-label font-bold uppercase">
                    FINALIZADO
                  </span>
                </div>
                <div className="flex items-center justify-between font-stat-mono-md text-stat-mono-md">
                  <span className="text-on-surface-variant">Placar:</span>
                  <span className="text-primary-container font-bold">{map.score}</span>
                </div>
                <div className="text-benchmark-label font-benchmark-label text-outline mt-1 flex items-center justify-between">
                  <span>{map.pick_info}</span>
                  <span className="text-primary">{map.sub_info}</span>
                </div>
              </div>
            );
          }

          if (map.status === 'AO VIVO') {
            return (
              <div
                key={map.number}
                className="bg-surface-container-lowest p-space-sm rounded-lg flex flex-col justify-between relative border border-primary-container shadow-[0_0_12px_rgba(0,229,255,0.25)]"
              >
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary-container rounded-l"></div>
                <div className="flex items-center justify-between mb-1 pl-1">
                  <span className="font-stat-mono-md text-stat-mono-md font-bold text-primary-container">
                    {map.number}. {map.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-benchmark-label text-benchmark-label font-bold uppercase animate-pulse">
                    AO VIVO
                  </span>
                </div>
                <div className="flex items-center justify-between font-stat-mono-md text-stat-mono-md pl-1">
                  <span className="text-on-surface-variant">Placar:</span>
                  <span className="text-on-surface font-bold">
                    {map.score}
                  </span>
                </div>
                <div className="text-benchmark-label font-benchmark-label text-primary pl-1 mt-1 flex items-center justify-between">
                  <span>{map.pick_info}</span>
                  <span className="font-semibold text-tertiary-fixed">{map.sub_info}</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={map.number}
              className="bg-surface-container-lowest p-space-sm rounded-lg flex flex-col justify-between opacity-70"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-stat-mono-md text-stat-mono-md font-bold text-outline">
                  {map.number}. {map.name}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-outline font-benchmark-label text-benchmark-label uppercase">
                  SE NECESSÁRIO
                </span>
              </div>
              <div className="flex items-center justify-between font-stat-mono-md text-stat-mono-md">
                <span className="text-outline">Placar:</span>
                <span className="text-outline-variant font-bold">{map.score}</span>
              </div>
              <div className="text-benchmark-label font-benchmark-label text-outline mt-1 flex items-center justify-between">
                <span>{map.pick_info}</span>
                <span>{map.sub_info}</span>
              </div>
            </div>
          );
        })}
      </div>

      {mvp ? <section className="min-h-[172px] border border-outline-variant/30 bg-surface-container p-4">
        <h4 className="text-sm font-bold">{mvp.title}</h4><p className="mt-2 font-bold">{mvp.nickname}</p>
        <dl className="mt-4 grid grid-cols-4 gap-2 font-mono tabular-nums text-sm">{[['K-D', mvp.frags], ['K/D', mvp.kd], ['ADR', mvp.adr], ['Rating', mvp.rating]].map(([label, value]) => <div key={label}><dt className="text-xs text-on-surface-variant">{label}</dt><dd>{value}</dd></div>)}</dl>
      </section> : <MatchMvpPlaceholder/>}

    </div>
  );
}

export default FeaturedMatchCard;
