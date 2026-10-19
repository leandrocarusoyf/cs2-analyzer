'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  RADAR_SIZE,
  TELESTRATOR_AUTO_FADE_SECONDS,
  TELESTRATOR_COLORS,
} from '../../lib/replay/constants.ts';

export type TelestratorTool = 'none' | 'pen' | 'arrow' | 'zone';

export interface TelestratorPoint {
  x: number;
  y: number;
}

export interface TelestratorStroke {
  id: string;
  tool: Exclude<TelestratorTool, 'none'>;
  color: string;
  points: TelestratorPoint[];
  createdAtMs: number;
}

export interface TelestratorLayerProps {
  isPlaying?: boolean;
  className?: string;
}

const COLOR_SWATCHES = [
  { id: 'ct', label: 'Azul CT', hex: TELESTRATOR_COLORS.CT_BLUE },
  { id: 'tr', label: 'Laranja TR', hex: TELESTRATOR_COLORS.TR_ORANGE },
  { id: 'warn', label: 'Amarelo Atenção', hex: TELESTRATOR_COLORS.WARNING_YELLOW },
  { id: 'white', label: 'Branco', hex: TELESTRATOR_COLORS.WHITE },
] as const;

function safeGet2DContext(
  canvas: HTMLCanvasElement | null,
): CanvasRenderingContext2D | null {
  if (!canvas || typeof canvas.getContext !== 'function') return null;
  if (
    typeof navigator !== 'undefined' &&
    /jsdom/i.test(navigator.userAgent) &&
    !(canvas.getContext as any).mock
  ) {
    return null;
  }
  try {
    return canvas.getContext('2d');
  } catch {
    return null;
  }
}

function drawStrokeShape(
  ctx: CanvasRenderingContext2D,
  stroke: TelestratorStroke,
  opacity: number = 1,
): void {
  const { tool, color, points } = stroke;
  if (points.length === 0 || opacity <= 0) return;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (tool === 'pen') {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    if (points.length === 2) {
      ctx.lineTo(points[1].x, points[1].y);
    } else {
      // Curva de Bézier quadrática suave entre os pontos amostrados
      for (let i = 1; i < points.length - 1; i++) {
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
      }
      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);
    }
    ctx.stroke();
  } else if (tool === 'arrow' && points.length >= 2) {
    const start = points[0];
    const end = points[points.length - 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    const headLen = 16;

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Ponta da seta direcional
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLen * Math.cos(angle - Math.PI / 6),
      end.y - headLen * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      end.x - headLen * Math.cos(angle + Math.PI / 6),
      end.y - headLen * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();
  } else if (tool === 'zone' && points.length >= 2) {
    const start = points[0];
    const end = points[points.length - 1];
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const radiusX = Math.max(4, Math.abs(end.x - start.x) / 2);
    const radiusY = Math.max(4, Math.abs(end.y - start.y) / 2);

    ctx.beginPath();
    if (typeof ctx.ellipse === 'function') {
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    } else {
      ctx.arc(centerX, centerY, Math.max(radiusX, radiusY), 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.globalAlpha = opacity * 0.16;
    ctx.fill();
  }

  ctx.restore();
}

export function TelestratorLayer({
  isPlaying = false,
  className = '',
}: TelestratorLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTool, setActiveTool] = useState<TelestratorTool>('none');
  const [activeColor, setActiveColor] = useState<string>(TELESTRATOR_COLORS.CT_BLUE);
  const [autoFade, setAutoFade] = useState<boolean>(false);
  const [strokes, setStrokes] = useState<TelestratorStroke[]>([]);
  const [draftStroke, setDraftStroke] = useState<TelestratorStroke | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const handleUndo = useCallback(() => {
    setStrokes((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setStrokes([]);
    setDraftStroke(null);
  }, []);

  // Atalho de teclado Ctrl+Z para desfazer traço na prancheta tática
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (strokes.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [strokes.length, handleUndo]);

  // Loop de fade automático após 5 segundos de reprodução quando autoFade está ativo
  useEffect(() => {
    if (!autoFade || strokes.length === 0) return;
    const interval = setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      if (isPlaying) {
        const maxAgeMs = TELESTRATOR_AUTO_FADE_SECONDS * 1000;
        setStrokes((prev) =>
          prev.filter((s) => current - s.createdAtMs < maxAgeMs),
        );
      }
    }, 100);
    return () => clearInterval(interval);
  }, [autoFade, isPlaying, strokes.length]);

  // Renderização dos traços no Canvas transparente sobreposto
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = safeGet2DContext(canvas);
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, RADAR_SIZE, RADAR_SIZE);

    const maxAgeMs = TELESTRATOR_AUTO_FADE_SECONDS * 1000;
    for (const stroke of strokes) {
      let opacity = 1;
      if (autoFade && isPlaying) {
        const age = Math.max(0, nowMs - stroke.createdAtMs);
        opacity = Math.max(0, 1 - age / maxAgeMs);
      }
      drawStrokeShape(ctx, stroke, opacity);
    }

    if (draftStroke) {
      drawStrokeShape(ctx, draftStroke, 0.9);
    }
  }, [strokes, draftStroke, autoFade, isPlaying, nowMs]);

  const toCanvasCoords = (
    e: React.PointerEvent<HTMLCanvasElement>,
  ): TelestratorPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? RADAR_SIZE / rect.width : 1;
    const scaleY = rect.height > 0 ? RADAR_SIZE / rect.height : 1;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === 'none') return;
    const pt = toCanvasCoords(e);
    setDraftStroke({
      id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tool: activeTool,
      color: activeColor,
      points: [pt],
      createdAtMs: Date.now(),
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draftStroke) return;
    const pt = toCanvasCoords(e);
    setDraftStroke((prev) => {
      if (!prev) return null;
      if (prev.tool === 'pen') {
        return { ...prev, points: [...prev.points, pt] };
      }
      return { ...prev, points: [prev.points[0], pt] };
    });
  };

  const handlePointerUp = () => {
    if (!draftStroke) return;
    if (draftStroke.points.length >= 2 || draftStroke.tool === 'pen') {
      setStrokes((prev) => [
        ...prev,
        { ...draftStroke, createdAtMs: Date.now() },
      ]);
    }
    setDraftStroke(null);
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        width={RADAR_SIZE}
        height={RADAR_SIZE}
        data-testid="telestrator-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ aspectRatio: '1 / 1' }}
        className={`absolute inset-0 h-full w-full aspect-square select-none ${
          activeTool === 'none'
            ? 'pointer-events-none'
            : 'pointer-events-auto cursor-crosshair'
        } ${className}`.trim()}
      />

      {/* Barra Flutuante da Prancheta Tática (Telestrator Toolbar) */}
      <div
        data-testid="telestrator-toolbar"
        className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-[2px] border border-[#1F2629] bg-[#0B0E0F]/95 px-2 py-1 text-[10px] font-mono text-white shadow-lg backdrop-blur-sm"
      >
        <button
          type="button"
          data-testid="telestrator-tool-none"
          onClick={() => setActiveTool('none')}
          className={`h-6 px-1.5 rounded-[2px] font-bold uppercase transition-colors ${
            activeTool === 'none'
              ? 'bg-[#00FFA3] text-[#0B0E0F]'
              : 'text-[#6B7A82] hover:text-white'
          }`}
          title="Cursor Padrão"
        >
          Cursor
        </button>

        <button
          type="button"
          data-testid="telestrator-tool-pen"
          onClick={() => setActiveTool('pen')}
          className={`h-6 px-1.5 rounded-[2px] font-bold uppercase transition-colors ${
            activeTool === 'pen'
              ? 'bg-[#00FFA3] text-[#0B0E0F]'
              : 'text-[#6B7A82] hover:text-white'
          }`}
          title="Caneta Livre (Curvas Bézier)"
        >
          ✎ Caneta
        </button>

        <button
          type="button"
          data-testid="telestrator-tool-arrow"
          onClick={() => setActiveTool('arrow')}
          className={`h-6 px-1.5 rounded-[2px] font-bold uppercase transition-colors ${
            activeTool === 'arrow'
              ? 'bg-[#00FFA3] text-[#0B0E0F]'
              : 'text-[#6B7A82] hover:text-white'
          }`}
          title="Seta Direcional Tática"
        >
          ↗ Seta
        </button>

        <button
          type="button"
          data-testid="telestrator-tool-zone"
          onClick={() => setActiveTool('zone')}
          className={`h-6 px-1.5 rounded-[2px] font-bold uppercase transition-colors ${
            activeTool === 'zone'
              ? 'bg-[#00FFA3] text-[#0B0E0F]'
              : 'text-[#6B7A82] hover:text-white'
          }`}
          title="Círculo / Zona de Atenção Elíptica"
        >
          ◯ Zona
        </button>

        <span className="mx-0.5 h-3.5 w-[1px] bg-[#1F2629]" />

        {/* Paleta de Cores */}
        <div className="flex items-center gap-1" role="group" aria-label="Paleta de Cores">
          {COLOR_SWATCHES.map((swatch) => (
            <button
              key={swatch.id}
              type="button"
              aria-label={swatch.label}
              title={swatch.label}
              data-testid={`telestrator-color-${swatch.id}`}
              onClick={() => {
                setActiveColor(swatch.hex);
                if (activeTool === 'none') setActiveTool('pen');
              }}
              style={{ backgroundColor: swatch.hex }}
              className={`h-4 w-4 rounded-full border transition-transform ${
                activeColor === swatch.hex
                  ? 'scale-115 border-white ring-1 ring-white'
                  : 'border-[#1F2629] opacity-80 hover:opacity-100'
              }`}
            />
          ))}
        </div>

        <span className="mx-0.5 h-3.5 w-[1px] bg-[#1F2629]" />

        {/* Auto-Fade 5s */}
        <button
          type="button"
          data-testid="telestrator-auto-fade"
          onClick={() => setAutoFade((v) => !v)}
          className={`h-6 px-1.5 rounded-[2px] font-bold uppercase transition-colors ${
            autoFade
              ? 'bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/50'
              : 'text-[#6B7A82] hover:text-white'
          }`}
          title="Fade automático das anotações após 5 segundos de reprodução"
        >
          5s Fade
        </button>

        {/* Desfazer (Ctrl+Z) */}
        <button
          type="button"
          data-testid="telestrator-undo"
          disabled={strokes.length === 0}
          onClick={handleUndo}
          className="h-6 px-1.5 rounded-[2px] text-[#6B7A82] hover:text-white disabled:opacity-30 transition-colors"
          title="Desfazer (Ctrl+Z)"
        >
          ↶
        </button>

        {/* Limpar Prancheta */}
        <button
          type="button"
          data-testid="telestrator-clear"
          disabled={strokes.length === 0}
          onClick={handleClear}
          className="h-6 px-1.5 rounded-[2px] text-[#FF4757] hover:bg-[#FF4757]/10 disabled:opacity-30 transition-colors uppercase font-bold"
          title="Limpar Prancheta"
        >
          Limpar
        </button>
      </div>
    </>
  );
}

export default TelestratorLayer;
