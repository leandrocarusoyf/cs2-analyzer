'use client';

import React from 'react';

export interface SegmentedFilterItem<T extends string = string> {
  /**
   * Identificador único da aba ou categoria
   */
  id: T;
  /**
   * Rótulo textual exibido no botão
   */
  label: string;
  /**
   * Contador numérico opcional exibido ao lado do rótulo (ex.: `All Duels (18)`)
   */
  count?: number;
  /**
   * Desabilita a seleção do item
   */
  disabled?: boolean;
}

export type SegmentedFilterVariant = 'pill' | 'underline';
export type SegmentedFilterSize = 'sm' | 'md';

export interface SegmentedFilterProps<T extends string = string> {
  /**
   * Lista estrita de opções do seletor horizontal
   */
  items: readonly SegmentedFilterItem<T>[];
  /**
   * Identificador da aba/categoria ativa no momento
   */
  activeId: T;
  /**
   * Callback disparado ao selecionar uma opção
   */
  onChange: (id: T) => void;
  /**
   * Rótulo de acessibilidade para a barra (`role="tablist"`)
   */
  ariaLabel?: string;
  /**
   * Variante visual do seletor:
   * - `pill`: Chips arredondados com destaque em Electric Cyan (`bg-cyan-accent text-base-bg shadow-cyan-chip`)
   * - `underline`: Abas com indicador inferior sólido
   */
  variant?: SegmentedFilterVariant;
  /**
   * Dimensão dos botões seletores
   */
  size?: SegmentedFilterSize;
  className?: string;
}

export function SegmentedFilter<T extends string = string>({
  items,
  activeId,
  onChange,
  ariaLabel = 'Filtro de categorias táticas',
  variant = 'pill',
  size = 'md',
  className = '',
}: SegmentedFilterProps<T>) {
  if (variant === 'underline') {
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={`flex items-center gap-6 border-b border-border-dark ${className}`.trim()}
      >
        {items.map((item) => {
          const isSelected = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled && item.id !== activeId) {
                  onChange(item.id);
                }
              }}
              className={`pb-2 font-mono text-xs uppercase tracking-wider transition-colors border-b-2 focus-visible:outline-none ${
                isSelected
                  ? 'font-bold text-cyan-accent border-cyan-accent'
                  : 'font-medium text-text-secondary hover:text-on-background border-transparent'
              }`}
            >
              <span>{item.label}</span>
              {typeof item.count === 'number' && (
                <span className="ml-1.5 tabular-nums" data-tabular="true">
                  ({item.count})
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  const sizeClass =
    size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-[11px]';

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex items-center gap-2 flex-wrap ${className}`.trim()}
    >
      {items.map((item) => {
        const isSelected = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            disabled={item.disabled}
            onClick={() => {
              if (!item.disabled && item.id !== activeId) {
                onChange(item.id);
              }
            }}
            className={`${sizeClass} rounded-full font-mono uppercase tracking-wider transition-colors focus-visible:outline-none ${
              isSelected
                ? 'bg-cyan-accent text-base-bg font-bold shadow-cyan-chip border border-cyan-accent'
                : 'bg-card-bg hover:bg-border-dark border border-border-dark text-text-secondary hover:text-on-background font-medium'
            }`}
          >
            <span>{item.label}</span>
            {typeof item.count === 'number' && (
              <span className="ml-1 tabular-nums" data-tabular="true">
                ({item.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedFilter;
