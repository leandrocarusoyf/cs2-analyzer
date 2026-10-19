import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FilterBar } from '../src/components/shell/FilterBar.tsx';

const pushMock = vi.fn();
let currentSearchParams = new URLSearchParams();
let currentPathname = '/stats/player';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
  }),
  usePathname: () => currentPathname,
  useSearchParams: () => currentSearchParams,
}));

describe('FilterBar Component Integration', () => {
  beforeEach(() => {
    pushMock.mockReset();
    currentSearchParams = new URLSearchParams();
    currentPathname = '/stats/player';
  });

  afterEach(() => {
    cleanup();
  });

  it('deve renderizar os seletores com os valores padrão corretos (all, both, last_10)', () => {
    render(<FilterBar />);

    const mapSelect = screen.getByLabelText('Mapa') as HTMLSelectElement;
    const sideSelect = screen.getByLabelText('Lado Tático') as HTMLSelectElement;
    const windowSelect = screen.getByLabelText(
      'Janela Temporal',
    ) as HTMLSelectElement;

    expect(mapSelect.value).toBe('all');
    expect(sideSelect.value).toBe('both');
    expect(windowSelect.value).toBe('last_10');
  });

  it('deve disparar roteamento e callback com os parâmetros esperados ao alterar o lado tático de both para ct', () => {
    const onFilterChange = vi.fn();
    render(<FilterBar onFilterChange={onFilterChange} />);

    const sideSelect = screen.getByLabelText('Lado Tático') as HTMLSelectElement;
    fireEvent.change(sideSelect, { target: { value: 'ct' } });

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/stats/player?tacticalSide=ct');

    expect(onFilterChange).toHaveBeenCalledTimes(1);
    expect(onFilterChange).toHaveBeenCalledWith(
      {
        targetPlayerId: null,
        selectedMap: 'all',
        tacticalSide: 'ct',
        timeWindow: 'last_10',
      },
      '/stats/player?tacticalSide=ct',
    );
  });

  it('deve renderizar os botões pill de lado tático (Both, CT, T) e disparar reset de filtros', () => {
    const onFilterChange = vi.fn();
    render(<FilterBar onFilterChange={onFilterChange} />);

    // Verifica presença dos botões pills de lado tático
    const ctPill = screen.getByRole('button', { name: 'CT' });
    const tPill = screen.getByRole('button', { name: 'T' });
    const bothPill = screen.getByRole('button', { name: 'Both sides' });

    expect(ctPill.getAttribute('data-side')).toBe('ct');
    expect(tPill.getAttribute('data-side')).toBe('tr');
    expect(bothPill.getAttribute('data-side')).toBe('both');

    // Clica no pill CT
    fireEvent.click(ctPill);
    expect(pushMock).toHaveBeenCalledWith('/stats/player?tacticalSide=ct');

    // Clica no botão Limpar Filtros
    const resetBtn = screen.getByTestId('filter-reset-button');
    fireEvent.click(resetBtn);
    expect(pushMock).toHaveBeenCalledWith('/stats/player');
  });

  it('deve preservar a aba ativa (?tab=weapons) ao alterar o lado tático para ct ou t', () => {
    currentSearchParams = new URLSearchParams('tab=weapons');
    render(<FilterBar />);

    const ctPill = screen.getByRole('button', { name: 'CT' });
    fireEvent.click(ctPill);

    expect(pushMock).toHaveBeenCalledWith(
      '/stats/player?tacticalSide=ct&tab=weapons',
    );
  });
});


