import React from 'react';

export type StatBadgeTone =
  | 'default'
  | 'cyan'
  | 'win'
  | 'loss'
  | 'tie'
  | 'ct'
  | 'tr'
  | 'muted';

export type StatBadgeLayout = 'card' | 'row' | 'compact' | 'pill';

export interface StatBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Rótulo tático da métrica (exibido em uppercase monoespaçado)
   */
  label: string;
  /**
   * Valor principal da métrica (renderizado com `font-mono tabular-nums`)
   */
  value: string | number;
  /**
   * Subtítulo, delta comparativo ou benchmark (opcional)
   */
  subtext?: string;
  /**
   * Tom semântico do valor principal
   */
  tone?: StatBadgeTone;
  /**
   * Tom semântico do subtexto/delta (caso difira do valor principal)
   */
  subtextTone?: StatBadgeTone;
  /**
   * Nota de classificação tática em formato de tag (ex.: S, A+, A, B)
   */
  grade?: string;
  /**
   * Tom semântico do badge de nota (`grade`)
   */
  gradeTone?: StatBadgeTone;
  /**
   * Estrutura de disposição do componente:
   * - `card`: Bloco KPI primário com valor em destaque (`text-2xl`) e subtexto na base
   * - `row`: Linha horizontal com rótulo à esquerda, valor e nota (`grade`) à direita
   * - `compact`: Bloco denso 2x2 para telemetria de reação/mira (`text-xs`)
   * - `pill`: Tag inline compacta com borda translúcida
   */
  layout?: StatBadgeLayout;
}

const VALUE_TONE_CLASSES: Record<StatBadgeTone, string> = {
  default: 'text-on-background',
  cyan: 'text-cyan-accent',
  win: 'text-status-win',
  loss: 'text-status-loss',
  tie: 'text-status-tie',
  ct: 'text-ct-blue',
  tr: 'text-t-orange',
  muted: 'text-text-muted',
};

const SUBTEXT_TONE_CLASSES: Record<StatBadgeTone, string> = {
  default: 'text-text-secondary',
  cyan: 'text-cyan-accent',
  win: 'text-status-win',
  loss: 'text-status-loss',
  tie: 'text-status-tie',
  ct: 'text-ct-blue',
  tr: 'text-t-orange',
  muted: 'text-text-muted',
};

const GRADE_BADGE_CLASSES: Record<StatBadgeTone, string> = {
  default: 'bg-surface-elevated border border-border-dark text-on-background',
  cyan: 'bg-cyan-accent/20 border border-cyan-accent/30 text-cyan-accent',
  win: 'bg-status-win/20 border border-status-win/30 text-status-win',
  loss: 'bg-status-loss/20 border border-status-loss/30 text-status-loss',
  tie: 'bg-status-tie/20 border border-status-tie/30 text-status-tie',
  ct: 'bg-ct-bg border border-ct-border text-ct-blue',
  tr: 'bg-tr-bg border border-tr-border text-t-orange',
  muted: 'bg-surface-dark border border-border-dark text-text-secondary',
};

export function StatBadge({
  label,
  value,
  subtext,
  tone = 'default',
  subtextTone = 'muted',
  grade,
  gradeTone = 'cyan',
  layout = 'card',
  className = '',
  ...rest
}: StatBadgeProps) {
  const valueColorClass = VALUE_TONE_CLASSES[tone];
  const subtextColorClass = SUBTEXT_TONE_CLASSES[subtextTone];
  const gradeColorClass = GRADE_BADGE_CLASSES[gradeTone];

  if (layout === 'pill') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[10px] uppercase tracking-wide ${gradeColorClass} ${className}`.trim()}
        {...rest}
      >
        <span className="font-semibold">{label}:</span>
        <span className="font-bold tabular-nums" data-tabular="true">
          {value}
        </span>
      </div>
    );
  }

  if (layout === 'row') {
    return (
      <div
        className={`flex items-center justify-between p-2 rounded bg-card-bg border border-border-dark font-mono text-xs ${className}`.trim()}
        {...rest}
      >
        <span className="text-text-secondary text-[11px] uppercase tracking-wider">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`font-bold tabular-nums ${valueColorClass}`}
            data-tabular="true"
          >
            {value}
          </span>
          {subtext && (
            <span className={`text-[10px] font-normal ${subtextColorClass}`}>
              {subtext}
            </span>
          )}
          {grade && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${gradeColorClass}`}
            >
              {grade}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (layout === 'compact') {
    return (
      <div
        className={`p-2 rounded bg-card-bg border border-border-dark flex flex-col font-mono ${className}`.trim()}
        {...rest}
      >
        <span className="text-[10px] text-text-secondary uppercase tracking-wider">
          {label}
        </span>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span
            className={`text-xs font-bold tabular-nums ${valueColorClass}`}
            data-tabular="true"
          >
            {value}
          </span>
          {subtext && (
            <span className={`text-[10px] font-normal ${subtextColorClass}`}>
              {subtext}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col justify-between p-2.5 rounded-lg bg-card-bg border border-border-dark font-mono ${className}`.trim()}
      {...rest}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] text-text-secondary uppercase tracking-wider">
          {label}
        </span>
        {grade && (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${gradeColorClass}`}
          >
            {grade}
          </span>
        )}
      </div>
      <span
        className={`text-2xl font-bold tabular-nums my-1 ${valueColorClass}`}
        data-tabular="true"
      >
        {value}
      </span>
      {subtext && (
        <span className={`text-[10px] font-medium ${subtextColorClass}`}>
          {subtext}
        </span>
      )}
    </div>
  );
}

export default StatBadge;
