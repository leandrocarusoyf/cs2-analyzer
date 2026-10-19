import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center space-y-4 select-none">
      <div className="flex items-center gap-2">
        <span className="text-[#00FFA3] font-mono font-bold text-lg">/</span>
        <h2 className="text-2xl font-black italic text-white uppercase">404 — Rota Não Encontrada</h2>
      </div>
      <p className="text-xs font-mono text-[#6B7A82]">
        A coordenada tática ou demo solicitada não foi localizada.
      </p>
      <Link
        href="/stats/player"
        className="rounded-[2px] border border-[#1F2629] bg-[#111618] px-4 py-2 text-xs font-mono font-bold text-[#00FFA3] hover:border-[#00FFA3] transition-colors"
      >
        ← Voltar ao Dashboard Analítico
      </Link>
    </div>
  );
}

