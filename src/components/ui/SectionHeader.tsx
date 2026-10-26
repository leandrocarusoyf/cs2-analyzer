import React from 'react';

export type SectionHeaderHeadingLevel = 'h1' | 'h2' | 'h3' | 'h4';

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Título principal da seção tática (renderizado em caixa alta com espaçamento de letras)
   */
  title: string;
  /**
   * Subtítulo opcional ou contexto complementar
   */
  subtitle?: string;
  /**
   * Ícone ou elemento gráfico posicionado à esquerda do título (renderizado em Electric Cyan)
   */
  icon?: React.ReactNode;
  /**
   * Texto para a tag técnica à direita (ex.: `6-AXIS RADAR`, `2D ANATOMY REGISTRATION`)
   */
  badgeText?: string;
  /**
   * Slot de ação customizada à direita (ex.: `SegmentedFilter`, botões de ação)
   */
  actionSlot?: React.ReactNode;
  /**
   * Exibe o prefixo tático `/` em ciano quando nenhum ícone é fornecido
   */
  showSlashPrefix?: boolean;
  /**
   * Renderiza a linha divisória horizontal inferior (`border-b border-border-dark`)
   */
  divider?: boolean;
  /**
   * Elemento semântico de cabeçalho HTML
   */
  as?: SectionHeaderHeadingLevel;
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  badgeText,
  actionSlot,
  showSlashPrefix = false,
  divider = true,
  as: HeadingTag = 'h2',
  className = '',
  ...rest
}: SectionHeaderProps) {
  const dividerClass = divider ? 'border-b border-border-dark pb-3 mb-3' : '';

  return (
    <div
      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${dividerClass} ${className}`.trim()}
      {...rest}
    >
      <div className="flex items-center gap-2 min-w-0">
        {icon ? (
          <span className="text-cyan-accent flex items-center justify-center shrink-0">
            {icon}
          </span>
        ) : showSlashPrefix ? (
          <span
            aria-hidden="true"
            className="text-cyan-accent font-mono font-bold text-xs shrink-0"
          >
            /
          </span>
        ) : null}

        <div className="flex flex-col min-w-0">
          <HeadingTag className="font-sans font-bold text-xs uppercase tracking-wider text-on-background truncate">
            {title}
          </HeadingTag>
          {subtitle && (
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider truncate">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {(badgeText || actionSlot) && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {badgeText && (
            <span className="px-2 py-0.5 rounded bg-card-bg border border-border-dark text-cyan-accent font-mono text-[10px] uppercase font-semibold tracking-wider">
              {badgeText}
            </span>
          )}
          {actionSlot}
        </div>
      )}
    </div>
  );
}

export default SectionHeader;
