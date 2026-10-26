import React from 'react';

export type TacticalCardVariant = 'surface' | 'elevated' | 'inset' | 'modal';
export type TacticalCardPadding = 'none' | 'sm' | 'md' | 'lg';
export type TacticalCardRadius = 'DEFAULT' | 'lg' | 'xl';

export interface TacticalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Variante visual da superfície tática mapeada para os tokens globais:
   * - `surface`: Painel primário (`bg-surface-dark border border-border-dark`)
   * - `elevated`: Card interno / bloco de métrica (`bg-card-bg border border-border-dark`)
   * - `inset`: Sub-superfície profunda (`bg-base-bg border border-border-dark`)
   * - `modal`: Container flutuante de inspeção (`bg-card-bg border-2 border-cyan-accent shadow-cyan-modal`)
   */
  variant?: TacticalCardVariant;
  /**
   * Espaçamento interno padronizado do container
   */
  padding?: TacticalCardPadding;
  /**
   * Nível de arredondamento de borda baseado na escala tática Stitch
   */
  radius?: TacticalCardRadius;
  /**
   * Ativa realce sutil de borda ciano no hover (`hover:border-cyan-accent/40`)
   */
  interactive?: boolean;
  /**
   * Renderiza a linha superior luminosa de acento ciano (usada em modais e painéis de destaque)
   */
  topAccentGlow?: boolean;
  children: React.ReactNode;
}

const VARIANT_CLASSES: Record<TacticalCardVariant, string> = {
  surface: 'bg-surface-dark border border-border-dark',
  elevated: 'bg-card-bg border border-border-dark',
  inset: 'bg-base-bg border border-border-dark',
  modal: 'bg-card-bg border-2 border-cyan-accent shadow-cyan-modal',
};

const PADDING_CLASSES: Record<TacticalCardPadding, string> = {
  none: 'p-0',
  sm: 'p-2.5',
  md: 'p-4',
  lg: 'p-5',
};

const RADIUS_CLASSES: Record<TacticalCardRadius, string> = {
  DEFAULT: 'rounded',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
};

export function TacticalCard({
  variant = 'surface',
  padding = 'lg',
  radius = 'xl',
  interactive = false,
  topAccentGlow = false,
  className = '',
  children,
  ...rest
}: TacticalCardProps) {
  const variantClass = VARIANT_CLASSES[variant];
  const paddingClass = PADDING_CLASSES[padding];
  const radiusClass = RADIUS_CLASSES[radius];
  const interactiveClass = interactive
    ? 'hover:border-cyan-accent/40 transition-colors'
    : '';

  return (
    <div
      className={`relative overflow-hidden ${variantClass} ${paddingClass} ${radiusClass} ${interactiveClass} ${className}`.trim()}
      {...rest}
    >
      {topAccentGlow && (
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-accent to-transparent pointer-events-none"
        />
      )}
      {children}
    </div>
  );
}

export default TacticalCard;
