'use client';

import React, { useEffect, useState } from 'react';

interface RolePlayerRow {
  steamId: string;
  nickname: string;
  team: string;
  rating: number;
  adr: number;
  kast: number;
  kd: number;
  ctRole: string;
  tRole: string;
}

interface RoleDetailsModalProps {
  isOpen: boolean;
  roleName: string;
  mapName?: string;
  onClose: () => void;
}

export function RoleDetailsModal({
  isOpen,
  roleName,
  mapName = 'de_inferno',
  onClose,
}: RoleDetailsModalProps) {
  const [players, setPlayers] = useState<RolePlayerRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const query = new URLSearchParams({ role: roleName, map: mapName }).toString();
    fetch(`/api/stats/roles?${query}`)
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao carregar jogadores da role');
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setPlayers(data.players || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, roleName, mapName]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-2xl bg-[#111618] border border-[#1F2629] rounded-[2px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1F2629] bg-[#0E1214]">
          <div className="flex items-center gap-2">
            <span className="text-[#00FFA3] font-mono font-bold text-sm">/</span>
            <div>
              <h2 id="role-modal-title" className="text-sm font-bold text-white uppercase tracking-wider">
                {roleName}
              </h2>
              <span className="text-[10px] font-mono text-[#6B7A82] uppercase">
                Comparativo de Atletas na Função • {mapName}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="w-7 h-7 flex items-center justify-center rounded-[2px] border border-[#1F2629] text-[#6B7A82] hover:text-white hover:border-[#6B7A82] transition-colors font-mono text-sm"
          >
            ✕
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <p className="text-xs font-mono text-[#9BA8B0] leading-relaxed">
            Atletas da base de dados que exercem a função tática <strong className="text-white">{roleName}</strong>. Comparação de desempenho lado a lado (Rating HLTV, ADR e K/D):
          </p>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#00FFA3] font-mono text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00FFA3] animate-ping" />
              <span>CONSULTANDO BANCO POSTGRESQL...</span>
            </div>
          ) : error ? (
            <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-[2px] text-xs font-mono text-[#EF4444]">
              {error}
            </div>
          ) : players.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-[#6B7A82]">
              Nenhum jogador encontrado com essa função no banco.
            </div>
          ) : (
            <div className="border border-[#1F2629] rounded-[2px] overflow-hidden">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="bg-[#0B0E0F] border-b border-[#1F2629] text-[10px] font-bold text-[#6B7A82] uppercase tracking-wider">
                    <th className="py-2 px-3 text-center w-10">#</th>
                    <th className="py-2 px-3">Atleta</th>
                    <th className="py-2 px-3 text-center">HLTV</th>
                    <th className="py-2 px-3 text-center">ADR</th>
                    <th className="py-2 px-3 text-center">K/D</th>
                    <th className="py-2 px-3 text-center">KAST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2629]/60">
                  {players.map((p, idx) => (
                    <tr
                      key={p.steamId || idx}
                      className="hover:bg-[#151C20] transition-colors h-11"
                    >
                      <td className="py-2 px-3 text-center text-[#6B7A82] font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#1A2328] border border-[#232F36] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            {p.nickname.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-white text-xs block leading-none">
                              {p.nickname}
                            </span>
                            <span className="text-[10px] text-[#6B7A82]">
                              {p.team}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-[2px] font-bold tabular-nums text-xs ${
                            p.rating >= 1.15
                              ? 'bg-[#00FFA3]/15 text-[#00FFA3] border border-[#00FFA3]/30'
                              : p.rating >= 1.0
                              ? 'bg-white/10 text-white'
                              : 'bg-[#EF4444]/10 text-[#EF4444]'
                          }`}
                        >
                          {p.rating.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center tabular-nums text-white font-semibold">
                        {p.adr.toFixed(1)}
                      </td>
                      <td className="py-2 px-3 text-center tabular-nums font-bold">
                        <span className={p.kd >= 1.0 ? 'text-[#00FFA3]' : 'text-[#EF4444]'}>
                          {p.kd.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center tabular-nums text-[#9BA8B0]">
                        {Math.round(p.kast)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer do Modal */}
        <div className="px-5 py-3 border-t border-[#1F2629] bg-[#0E1214] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-[2px] border border-[#1F2629] bg-[#111618] hover:border-[#6B7A82] text-xs font-mono font-semibold text-white transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoleDetailsModal;
