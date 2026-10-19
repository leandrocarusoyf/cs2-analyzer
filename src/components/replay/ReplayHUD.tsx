'use client';

import React from 'react';
import { BombEvent, PlayerState, TacticalRoundType } from '../../types/replay';
import { formatWeaponName } from '../../lib/replay/weapons';

interface ReplayHUDProps {
  players: PlayerState[];
  selectedPlayerId?: string | number | null;
  onSelectPlayer?: (playerId: string | number) => void;
  ctRoundType?: TacticalRoundType;
  tRoundType?: TacticalRoundType;
  bombEvents?: BombEvent[];
  currentTick?: number;
  tickRate?: number;
}

export const ReplayHUD: React.FC<ReplayHUDProps> = ({
  players,
  selectedPlayerId,
  onSelectPlayer,
  ctRoundType,
  tRoundType,
  bombEvents = [],
  currentTick = 0,
  tickRate = 64,
}) => {
  const ctPlayers = players.filter((p) => p.team === 'CT');
  const tPlayers = players.filter((p) => p.team === 'T');

  const getBuyTypeBadge = (buyType?: TacticalRoundType) => {
    switch (buyType) {
      case 'full-buy':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">FULL BUY</span>;
      case 'semi-buy':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">SEMI-BUY</span>;
      case 'semi-eco':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">SEMI-ECO</span>;
      case 'eco':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-500/20 text-red-400 border border-red-500/30">ECO</span>;
      default:
        return null;
    }
  };

  const renderPlayerCard = (player: PlayerState) => {
    const isSelected = String(player.id) === String(selectedPlayerId);
    const isDead = !player.isAlive;

    // Cálculo da barra de progresso do desarme com kit (5s) ou sem kit (10s)
    let defuseProgress = 0;
    let defuseTotalSeconds = player.hasDefuser ? 5 : 10;
    if (player.isDefusing) {
      const activeDefuseEvent = [...bombEvents]
        .reverse()
        .find(
          (b) =>
            (b.type === 'begin_defuse' || b.type === 'defuse_start') &&
            b.tick <= currentTick &&
            (b.playerId === undefined || String(b.playerId) === String(player.id))
        );

      if (activeDefuseEvent) {
        const hasKit = activeDefuseEvent.hasKit ?? player.hasDefuser ?? false;
        defuseTotalSeconds = hasKit ? 5 : 10;
        const totalTicks = defuseTotalSeconds * tickRate;
        const elapsedTicks = currentTick - activeDefuseEvent.tick;
        defuseProgress = Math.min(100, Math.max(0, (elapsedTicks / totalTicks) * 100));
      } else {
        defuseProgress = 50; // fallback animado
      }
    }

    return (
      <div
        key={player.id}
        onClick={() => onSelectPlayer && onSelectPlayer(player.id)}
        className={
          'flex flex-col p-2 rounded-lg border cursor-pointer transition-all ' +
          (isSelected
            ? 'border-yellow-400 bg-slate-800/95 shadow-md shadow-yellow-500/10'
            : 'border-slate-800/80 bg-slate-900/60 hover:bg-slate-800/50') +
          (isDead ? ' opacity-40 grayscale' : ' opacity-100')
        }
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col min-w-[90px]">
            <span className="text-xs font-bold text-slate-200 truncate">
              {player.name}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">
              {'$' + (player.money || 0).toLocaleString('pt-BR')}
            </span>
          </div>

          <div className="flex flex-col items-center px-2">
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <span
                className={
                  player.hp <= 20
                    ? 'text-red-500 font-bold'
                    : player.hp <= 50
                    ? 'text-amber-400 font-semibold'
                    : 'text-slate-200 font-semibold'
                }
              >
                {player.hp} HP
              </span>
              {player.armor > 0 && (
                <span className="text-slate-400 text-[10px] flex items-center">
                  🛡️{player.armor}
                  {player.hasHelmet && <span title="Capacete">⛑️</span>}
                </span>
              )}
            </div>

            <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1 border border-slate-700/50">
              <div
                className={
                  'h-full transition-all duration-150 ' +
                  (player.hp > 50
                    ? 'bg-emerald-500'
                    : player.hp > 20
                    ? 'bg-amber-500'
                    : 'bg-red-500')
                }
                style={{ width: `${Math.max(0, Math.min(100, player.hp))}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col items-end min-w-[100px] gap-0.5">
            <span className="text-[11px] font-medium text-slate-200">
              {formatWeaponName(player.activeWeapon)}
            </span>

            <div className="flex items-center gap-1">
              {player.isScoped && (
                <span
                  title="Mira Aproximada (Zoom)"
                  className="px-1 py-0.2 bg-blue-500/20 text-blue-300 rounded text-[9px] font-mono border border-blue-500/30"
                >
                  ⌖ Scope
                </span>
              )}
              {player.flashDuration > 0 && (
                <span
                  title="Jogador Cego"
                  className="px-1 py-0.2 bg-yellow-500/20 text-yellow-300 rounded text-[9px] font-mono border border-yellow-500/30 animate-pulse"
                >
                  ⚡ Cego {player.flashDuration.toFixed(1)}s
                </span>
              )}
              {player.hasDefuser && player.team === 'CT' && (
                <span
                  title="Possui Kit de Desarme"
                  className="px-1 py-0.2 bg-sky-500/20 text-sky-300 rounded text-[9px] font-mono border border-sky-500/30"
                >
                  🧰 Kit
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Barra de Progresso de Desarme */}
        {player.isDefusing && (
          <div className="mt-2 pt-1 border-t border-slate-800">
            <div className="flex items-center justify-between text-[10px] text-emerald-400 font-mono mb-0.5">
              <span>Desarmando C4 ({defuseTotalSeconds}s)</span>
              <span>{Math.round(defuseProgress)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-100 animate-pulse"
                style={{ width: `${defuseProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-950/90 border-t border-slate-800/80 rounded-b-xl backdrop-blur-md">
      {/* Coluna CT */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-bold text-sky-400 px-1 pb-1 border-b border-sky-950/60">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>CONTRA-TERRORISTAS ({ctPlayers.filter((p) => p.isAlive).length}/5)</span>
          </div>
          {getBuyTypeBadge(ctRoundType)}
        </div>
        <div className="flex flex-col gap-1.5">
          {ctPlayers.map(renderPlayerCard)}
        </div>
      </div>

      {/* Coluna TR */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-bold text-amber-400 px-1 pb-1 border-b border-amber-950/60">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>TERRORISTAS ({tPlayers.filter((p) => p.isAlive).length}/5)</span>
          </div>
          {getBuyTypeBadge(tRoundType)}
        </div>
        <div className="flex flex-col gap-1.5">
          {tPlayers.map(renderPlayerCard)}
        </div>
      </div>
    </div>
  );
};

export default ReplayHUD;
