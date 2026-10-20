import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { RoleDetailsModal } from '../src/components/stats/RoleDetailsModal.tsx';
import { TabIntro } from '../src/components/stats/TabIntro.tsx';

describe('RoleDetailsModal & Role Interactivity', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('1. MODAL DINÂMICO DE ROLES: busca e renderiza jogadores da role lado a lado', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        role: 'Inferno A Rotation',
        map: 'de_inferno',
        count: 2,
        players: [
          {
            steamId: '76561198855375325',
            nickname: 'Jimpphat',
            team: 'Aurora',
            rating: 1.46,
            adr: 116.5,
            kast: 85.0,
            kd: 1.67,
            ctRole: 'Inferno A Rotation',
            tRole: 'Mirage B Lurk',
          },
          {
            steamId: '76561198058500492',
            nickname: 'KSCERATO',
            team: 'FURIA',
            rating: 1.22,
            adr: 113.7,
            kast: 65.2,
            kd: 1.23,
            ctRole: 'Inferno A Rotation',
            tRole: 'Inferno Banana Control',
          },
        ],
      }),
    });

    render(
      <RoleDetailsModal
        isOpen={true}
        roleName="Inferno A Rotation"
        mapName="de_inferno"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Jimpphat')).toBeTruthy();
      expect(screen.getByText('KSCERATO')).toBeTruthy();
      expect(screen.getByText('1.46')).toBeTruthy();
      expect(screen.getByText('1.22')).toBeTruthy();
    });
  });

  it('2. INTERATIVIDADE NAS ROLES (TABINTRO): clicar no card de Role #1 abre o modal', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        role: 'Inferno A Rotation',
        map: 'de_inferno',
        count: 1,
        players: [
          {
            steamId: '76561198855375325',
            nickname: 'Jimpphat',
            team: 'Aurora',
            rating: 1.46,
            adr: 116.5,
            kast: 85.0,
            kd: 1.67,
            ctRole: 'Inferno A Rotation',
            tRole: 'Mirage B Lurk',
          },
        ],
      }),
    });

    render(<TabIntro />);

    const roleBtn = screen.getByLabelText(/Inspecionar detalhes da função Inferno A Rotation/i);
    fireEvent.click(roleBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByText(/Comparativo de Atletas na Função • de_inferno/i)).toBeTruthy();
    });
  });
});
