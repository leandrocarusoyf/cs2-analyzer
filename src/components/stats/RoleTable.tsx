'use client';

import React, { useMemo, useState } from 'react';
import type { RoleDetailRow } from '../../types/roles.ts';

export interface RoleTableProps {
  side: 'ct' | 't';
  rows: RoleDetailRow[];
  activeFilter?: string;
}

type SortColumn = 'role' | 'map' | 'hltv' | 'adr' | 'kd' | 'kpr' | 'rounds';
type SortDirection = 'asc' | 'desc';

export function RoleTable({ side, rows, activeFilter = 'All' }: RoleTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('hltv');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedRows = useMemo(() => {
    let result = [...rows];

    // Filtro por Role se não for 'All'
    if (activeFilter && activeFilter !== 'All') {
      const normalizedFilter = activeFilter.toLowerCase().replace(/^(ct|t)\s+/, '');
      const matched = result.filter(
        (r) =>
          r.role.toLowerCase() === activeFilter.toLowerCase() ||
          r.role.toLowerCase() === normalizedFilter,
      );
      // Se encontrou dados correspondentes no lado atual, filtra; caso contrário exibe todos
      if (matched.length > 0) {
        result = matched;
      }
    }

    // Ordenação
    result.sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      const numA = Number(valA);
      const numB = Number(valB);
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });

    return result;
  }, [rows, activeFilter, sortColumn, sortDirection]);

  const isCt = side === 'ct';
  const roleColor = isCt ? 'text-[#3B82F6]' : 'text-[#F97316]';

  return (
    <div className="w-full bg-surface-card border border-border-card rounded-[2px] overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="h-8 bg-canvas border-b border-border-card">
            <th
              onClick={() => handleSort('role')}
              className={`w-[130px] text-[11px] font-bold uppercase tracking-wider px-2.5 text-left cursor-pointer transition-colors ${
                sortColumn === 'role' ? 'text-white' : 'text-text-secondary'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>ROLE</span>
                {sortColumn === 'role' && (
                  <span className="text-[9px] text-accent">
                    {sortDirection === 'desc' ? '▼' : '▲'}
                  </span>
                )}
              </div>
            </th>

            <th
              onClick={() => handleSort('map')}
              className={`w-[80px] text-[11px] font-bold uppercase tracking-wider px-2 text-left cursor-pointer transition-colors ${
                sortColumn === 'map' ? 'text-white' : 'text-text-secondary'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>MAP</span>
                {sortColumn === 'map' && (
                  <span className="text-[9px] text-accent">
                    {sortDirection === 'desc' ? '▼' : '▲'}
                  </span>
                )}
              </div>
            </th>

            <th
              onClick={() => handleSort('hltv')}
              className={`w-[65px] text-[11px] font-bold uppercase tracking-wider px-2 text-left cursor-pointer transition-colors ${
                sortColumn === 'hltv' ? 'text-white' : 'text-text-secondary'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>HLTV</span>
                {sortColumn === 'hltv' && (
                  <span className="text-[9px] text-accent">
                    {sortDirection === 'desc' ? '▼' : '▲'}
                  </span>
                )}
              </div>
            </th>

            <th
              onClick={() => handleSort('adr')}
              className={`w-[60px] text-[11px] font-bold uppercase tracking-wider px-2 text-left cursor-pointer transition-colors ${
                sortColumn === 'adr' ? 'text-white' : 'text-text-secondary'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>ADR</span>
                {sortColumn === 'adr' && (
                  <span className="text-[9px] text-accent">
                    {sortDirection === 'desc' ? '▼' : '▲'}
                  </span>
                )}
              </div>
            </th>

            <th
              onClick={() => handleSort('kd')}
              className={`w-[60px] text-[11px] font-bold uppercase tracking-wider px-2 text-left cursor-pointer transition-colors ${
                sortColumn === 'kd' ? 'text-white' : 'text-text-secondary'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>K/D</span>
                {sortColumn === 'kd' && (
                  <span className="text-[9px] text-accent">
                    {sortDirection === 'desc' ? '▼' : '▲'}
                  </span>
                )}
              </div>
            </th>

            <th
              onClick={() => handleSort('kpr')}
              className={`w-[60px] text-[11px] font-bold uppercase tracking-wider px-2 text-left cursor-pointer transition-colors ${
                sortColumn === 'kpr' ? 'text-white' : 'text-text-secondary'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>KPR</span>
                {sortColumn === 'kpr' && (
                  <span className="text-[9px] text-accent">
                    {sortDirection === 'desc' ? '▼' : '▲'}
                  </span>
                )}
              </div>
            </th>

            <th
              onClick={() => handleSort('rounds')}
              className={`w-[50px] text-[11px] font-bold uppercase tracking-wider px-2.5 text-right cursor-pointer transition-colors ${
                sortColumn === 'rounds' ? 'text-white' : 'text-text-secondary'
              }`}
            >
              <div className="flex items-center justify-end gap-1">
                <span>ROUNDS</span>
                {sortColumn === 'rounds' && (
                  <span className="text-[9px] text-accent">
                    {sortDirection === 'desc' ? '▼' : '▲'}
                  </span>
                )}
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          {filteredAndSortedRows.length === 0 ? (
            <tr>
              <td colSpan={7} className="h-16 text-center text-text-secondary text-xs font-mono">
                NO ROLES TELEMETRY RECORDED FOR CURRENT FILTER
              </td>
            </tr>
          ) : (
            filteredAndSortedRows.map((row) => (
              <tr
                key={row.id}
                className="h-10 border-b border-[#141A1D] hover:bg-[#13191D] transition-colors"
              >
                {/* ROLE: w-[130px] text-xs font-bold px-2.5 flex items-center gap-1.5 h-10 com mini equalizador */}
                <td className="w-[130px] px-2.5 py-0">
                  <div
                    className={`w-[130px] text-xs font-bold flex items-center gap-1.5 h-10 ${roleColor}`}
                  >
                    {isCt ? (
                      <div className="flex items-end gap-[1.5px] h-3 mr-1 shrink-0" aria-hidden="true">
                        <div className="w-[2px] h-2 bg-[#3B82F6] rounded-none" />
                        <div className="w-[2px] h-3 bg-[#3B82F6] rounded-none" />
                        <div className="w-[2px] h-1.5 bg-[#3B82F6] rounded-none" />
                      </div>
                    ) : (
                      <div className="flex items-end gap-[1.5px] h-3 mr-1 shrink-0" aria-hidden="true">
                        <div className="w-[2px] h-1.5 bg-[#F97316] rounded-none" />
                        <div className="w-[2px] h-3 bg-[#F97316] rounded-none" />
                        <div className="w-[2px] h-2 bg-[#F97316] rounded-none" />
                      </div>
                    )}
                    <span className="truncate">{row.role}</span>
                  </div>
                </td>

                {/* MAP: w-[80px] text-xs font-medium text-white px-2 */}
                <td className="w-[80px] text-xs font-medium text-white px-2">
                  {row.map}
                </td>

                {/* HLTV: w-[65px] text-xs font-bold font-mono text-white tabular-nums px-2 */}
                <td className="w-[65px] text-xs font-bold font-mono text-white tabular-nums px-2">
                  {row.hltv.toFixed(2)}
                </td>

                {/* ADR: w-[60px] text-xs font-medium font-mono text-[#D1D5DB] tabular-nums px-2 */}
                <td className="w-[60px] text-xs font-medium font-mono text-[#D1D5DB] tabular-nums px-2">
                  {row.adr.toFixed(1)}
                </td>

                {/* K/D: w-[60px] text-xs font-medium font-mono text-[#D1D5DB] tabular-nums px-2 */}
                <td className="w-[60px] text-xs font-medium font-mono text-[#D1D5DB] tabular-nums px-2">
                  {row.kd.toFixed(2)}
                </td>

                {/* KPR: w-[60px] text-xs font-medium font-mono text-[#D1D5DB] tabular-nums px-2 */}
                <td className="w-[60px] text-xs font-medium font-mono text-[#D1D5DB] tabular-nums px-2">
                  {row.kpr.toFixed(2)}
                </td>

                {/* ROUNDS: w-[50px] text-xs font-medium font-mono text-text-secondary tabular-nums px-2.5 text-right */}
                <td className="w-[50px] text-xs font-medium font-mono text-text-secondary tabular-nums px-2.5 text-right">
                  {row.rounds}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default RoleTable;

