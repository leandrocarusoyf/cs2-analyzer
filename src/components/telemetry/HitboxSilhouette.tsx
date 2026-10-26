import React, { useId } from 'react';

export interface HitgroupData {
  head: number;
  chest: number;
  stomach: number;
  arms: number;
  legs: number;
}

interface HitboxSilhouetteProps {
  data: HitgroupData;
  className?: string;
  reactionTimeMs?: number;
  totalHits?: number;
}

export const HitboxSilhouette: React.FC<HitboxSilhouetteProps> = ({
  data,
  className = '',
  reactionTimeMs,
  totalHits,
}) => {
  const gradientId = useId();

  const getIntensityColor = (percentage: number) => {
    if (percentage >= 40) return { fill: 'rgba(6, 182, 212, 0.75)', stroke: '#22d3ee', glow: true };
    if (percentage >= 20) return { fill: 'rgba(6, 182, 212, 0.45)', stroke: '#06b6d4', glow: false };
    if (percentage >= 10) return { fill: 'rgba(6, 182, 212, 0.25)', stroke: '#0891b2', glow: false };
    return { fill: 'rgba(15, 23, 42, 0.6)', stroke: '#334155', glow: false };
  };

  const parts = {
    head: getIntensityColor(data.head),
    chest: getIntensityColor(data.chest),
    stomach: getIntensityColor(data.stomach),
    arms: getIntensityColor(data.arms),
    legs: getIntensityColor(data.legs),
  };

  return (
    <div className={`relative flex flex-col items-center justify-between p-4 bg-[#0a0f18]/90 border border-cyan-950/40 rounded-xl backdrop-blur-md ${className}`}>
      <div className="w-full flex items-center justify-between border-b border-cyan-900/30 pb-2 mb-3">
        <span className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase">
          Hitbox & Target Telemetry
        </span>
        {reactionTimeMs !== undefined && (
          <span className="text-xs font-mono font-medium text-slate-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/30">
            TTD: <strong className="text-cyan-400">{Math.round(reactionTimeMs)}ms</strong>
          </span>
        )}
      </div>

      <div className="relative w-full flex items-center justify-center gap-6 my-auto">
        <div className="flex flex-col gap-3 font-mono text-[11px]">
          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px] tracking-wider uppercase">Headshot</span>
            <span className="text-sm font-semibold text-cyan-300">{data.head.toFixed(1)}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px] tracking-wider uppercase">Chest</span>
            <span className="text-sm font-semibold text-slate-200">{data.chest.toFixed(1)}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px] tracking-wider uppercase">Stomach</span>
            <span className="text-sm font-semibold text-slate-200">{data.stomach.toFixed(1)}%</span>
          </div>
        </div>

        <div className="relative w-36 h-64 flex items-center justify-center">
          <svg viewBox="0 0 100 200" className="w-full h-full drop-shadow-[0_0_12px_rgba(6,182,212,0.15)]">
            <defs>
              <filter id={`${gradientId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <circle cx="50" cy="25" r="12" fill={parts.head.fill} stroke={parts.head.stroke} strokeWidth="1.5" filter={parts.head.glow ? `url(#${gradientId}-glow)` : undefined} className="transition-colors duration-300" />
            <path d="M 36 42 L 64 42 L 60 75 L 40 75 Z" fill={parts.chest.fill} stroke={parts.chest.stroke} strokeWidth="1.5" filter={parts.chest.glow ? `url(#${gradientId}-glow)` : undefined} className="transition-colors duration-300" />
            <path d="M 40 77 L 60 77 L 58 98 L 42 98 Z" fill={parts.stomach.fill} stroke={parts.stomach.stroke} strokeWidth="1.5" filter={parts.stomach.glow ? `url(#${gradientId}-glow)` : undefined} className="transition-colors duration-300" />
            <path d="M 33 44 L 23 80 L 28 82 L 36 50 Z" fill={parts.arms.fill} stroke={parts.arms.stroke} strokeWidth="1.2" className="transition-colors duration-300" />
            <path d="M 67 44 L 77 80 L 72 82 L 64 50 Z" fill={parts.arms.fill} stroke={parts.arms.stroke} strokeWidth="1.2" className="transition-colors duration-300" />
            <path d="M 41 101 L 37 150 L 33 185 L 42 185 L 47 148 L 48 101 Z" fill={parts.legs.fill} stroke={parts.legs.stroke} strokeWidth="1.5" className="transition-colors duration-300" />
            <path d="M 59 101 L 63 150 L 67 185 L 58 185 L 53 148 L 52 101 Z" fill={parts.legs.fill} stroke={parts.legs.stroke} strokeWidth="1.5" className="transition-colors duration-300" />
            <circle cx="50" cy="25" r="4" fill="none" stroke="#22d3ee" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.6" />
            <line x1="50" y1="18" x2="50" y2="32" stroke="#22d3ee" strokeWidth="0.5" opacity="0.4" />
            <line x1="43" y1="25" x2="57" y2="25" stroke="#22d3ee" strokeWidth="0.5" opacity="0.4" />
          </svg>
        </div>

        <div className="flex flex-col gap-3 font-mono text-[11px]">
          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px] tracking-wider uppercase">Arms</span>
            <span className="text-sm font-semibold text-slate-200">{data.arms.toFixed(1)}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px] tracking-wider uppercase">Legs</span>
            <span className="text-sm font-semibold text-slate-200">{data.legs.toFixed(1)}%</span>
          </div>
          {totalHits !== undefined && (
            <div className="flex flex-col border-t border-cyan-950/40 pt-2">
              <span className="text-slate-500 text-[10px] tracking-wider uppercase">Total Hits</span>
              <span className="text-xs font-semibold text-slate-300">{totalHits}</span>
            </div>
          )}
        </div>
      </div>

      <div className="w-full mt-3 pt-2 border-t border-cyan-950/40 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span>PRECISION RATING</span>
        <span className={data.head >= 20 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
          {data.head >= 20 ? 'ELITE ACCURACY' : 'BALANCED SPREAD'}
        </span>
      </div>
    </div>
  );
};
