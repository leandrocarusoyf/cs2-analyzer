'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActiveGrenade,
  BombEvent,
  BombLifecycleState,
  GrenadeEffectEvent,
  GrenadeTrajectory,
  KillEvent,
  KillFeedEvent,
  MapMetadata,
  PlayerHurtEvent,
  PlayerState,
  WeaponFireEvent,
} from '../../types/replay';
import { worldToCanvas, OFFICIAL_MAP_METADATA } from '../../lib/replay/coordinates';
import { formatWeaponName } from '../../lib/replay/weapons';

export interface ActiveShotEffect {
  id?: string;
  shooterId?: string | number;
  tick: number;
  fromX?: number;
  fromY?: number;
  toX?: number;
  toY?: number;
  team?: 'CT' | 'T';
}

export interface ActiveUtilityVisual {
  id: string | number;
  type: string;
  x: number;
  y: number;
  z?: number;
  radius?: number;
  startTick: number;
  endTick: number;
  throwTick?: number;
  color?: string;
}

export interface BombVisualState {
  state: BombLifecycleState | string;
  x: number;
  y: number;
  z?: number;
  carrierId?: string | number | null;
  defuserId?: string | number | null;
  hasKit?: boolean | null;
  plantStartTick?: number | null;
  defuseStartTick?: number | null;
  timerRemaining?: number;
}

export interface RecentDeathMarker {
  id?: string | number;
  victimId?: string | number;
  u?: number;
  v?: number;
  x?: number;
  y?: number;
  team?: 'CT' | 'T' | string;
  killTick?: number;
  tick?: number;
}

export interface ViewportCanvasProps {
  players: PlayerState[];
  mapMetadata?: MapMetadata;
  mapName?: string;
  currentTick: number;
  tickrate?: number;
  isPlaying?: boolean;
  playersManifest?: readonly any[];
  roundNumber?: number;
  activeNukeLayer?: any;
  utilities?: any[];
  bomb?: any;
  recentDeaths?: RecentDeathMarker[];
  activeShots?: ActiveShotEffect[];
  combatLines?: any[];
  playerCalloutsById?: Record<number, string>;
  playerHasC4ById?: Record<number, boolean>;
  playerDefusersById?: Record<number, boolean>;
  bombEvents?: BombEvent[];
  kills?: (KillEvent | KillFeedEvent)[];
  grenades?: (GrenadeEffectEvent | ActiveGrenade)[];
  trajectories?: GrenadeTrajectory[];
  shots?: WeaponFireEvent[];
  damages?: PlayerHurtEvent[];
  selectedPlayerId?: string | number | null;
  onSelectPlayer?: (playerId: string | number) => void;
  radarImageUrl?: string;
  className?: string;
}

export const ViewportCanvas: React.FC<ViewportCanvasProps> = ({
  players = [],
  mapMetadata: propMapMetadata,
  mapName,
  currentTick,
  tickrate = 64,
  isPlaying = false,
  playersManifest = [],
  roundNumber = 1,
  activeNukeLayer,
  utilities = [],
  bomb,
  recentDeaths = [],
  activeShots = [],
  combatLines = [],
  playerCalloutsById = {},
  playerHasC4ById = {},
  playerDefusersById = {},
  bombEvents = [],
  kills = [],
  grenades = [],
  trajectories = [],
  shots = [],
  damages = [],
  selectedPlayerId = null,
  onSelectPlayer,
  radarImageUrl,
  className = '',
}) => {
  const mapMetadata: MapMetadata =
    propMapMetadata ||
    (mapName && OFFICIAL_MAP_METADATA[mapName]) ||
    OFFICIAL_MAP_METADATA.de_inferno;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: 800,
    height: 800,
  });

  const radarImgRef = useRef<HTMLImageElement | null>(null);
  const [radarLoaded, setRadarLoaded] = useState<boolean>(false);

  const effectiveRadarUrl =
    radarImageUrl ||
    (mapMetadata?.mapName
      ? '/maps/' + mapMetadata.mapName.replace(/^de_/, '') + '_radar.png'
      : '/maps/mirage_radar.png');

  useEffect(() => {
    let isMounted = true;
    const img = new Image();
    img.src = effectiveRadarUrl;
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (isMounted) {
        radarImgRef.current = img;
        setRadarLoaded(true);
      }
    };

    img.onerror = () => {
      if (isMounted) {
        if (!effectiveRadarUrl.includes('de_')) {
          const fallbackImg = new Image();
          fallbackImg.src =
            '/maps/de_' + (mapMetadata?.mapName?.replace(/^de_/, '') || '') + '_radar.png';
          fallbackImg.onload = () => {
            if (isMounted) {
              radarImgRef.current = fallbackImg;
              setRadarLoaded(true);
            }
          };
          fallbackImg.onerror = () => {
            if (isMounted) {
              radarImgRef.current = null;
              setRadarLoaded(false);
            }
          };
        } else {
          radarImgRef.current = null;
          setRadarLoaded(false);
        }
      }
    };

    return () => {
      isMounted = false;
    };
  }, [effectiveRadarUrl, mapMetadata?.mapName]);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const minDimension = Math.floor(Math.min(rect.width, rect.height || rect.width));
      const size = Math.max(400, minDimension);

      setCanvasSize({ width: size, height: size });
    };

    handleResize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    if (ro && containerRef.current) ro.observe(containerRef.current);

    return () => {
      ro?.disconnect();
    };
  }, []);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasSize;
    ctx.clearRect(0, 0, width, height);

    // ========================================================================
    // CAMADA 0 (Fundo): Radar PNG estático (centralizado/escalado)
    // ========================================================================
    const radarImg = radarImgRef.current;
    if (radarLoaded && radarImg && radarImg.complete && radarImg.naturalWidth > 0) {
      ctx.drawImage(radarImg, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        '[Radar: ' + (mapMetadata?.displayName || mapMetadata?.mapName || 'CS2') + ']',
        width / 2,
        25
      );
    }

    if (!mapMetadata) return;

    // ========================================================================
    // CAMADA 1 (Utilitários Ativos): Smokes, Molotovs e Trajetórias
    // ========================================================================
    // 1.1 Trajetórias de granadas arremessadas recentemente
    if (trajectories && trajectories.length > 0) {
      ctx.save();
      for (const traj of trajectories) {
        const pts = traj.points || [];
        if (pts.length < 2) continue;

        const firstTick = pts[0].tick;
        const lastTick = pts[pts.length - 1].tick;
        if (currentTick < firstTick - 10 || currentTick > lastTick + 64) continue;

        ctx.beginPath();
        let started = false;
        for (const pt of pts) {
          if (pt.tick > currentTick) break;
          const { x: px, y: py } = worldToCanvas(pt.x, pt.y, mapMetadata, width, height);
          if (!started) {
            ctx.moveTo(px, py);
            started = true;
          } else {
            ctx.lineTo(px, py);
          }
        }
        if (started) {
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      ctx.restore();
    }

    // 1.2 Smokes e Molotovs ativos no tick atual
    for (const g of grenades) {
      const start = g.startTick ?? 0;
      const end = g.endTick ?? start + 1280; // ~20 segundos default
      if (currentTick >= start && currentTick <= end) {
        const { x: gx, y: gy } = worldToCanvas(g.x, g.y, mapMetadata, width, height);
        const radiusInCanvas = g.radius
          ? (g.radius / mapMetadata.scale) * (width / 1024)
          : 22;

        if (g.type === 'smoke') {
          // Smokes ativas: círculo preenchido cinza translúcido com borda suave
          ctx.beginPath();
          ctx.arc(gx, gy, radiusInCanvas, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(203, 213, 225, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Centro sutil de dispersão
          ctx.beginPath();
          ctx.arc(gx, gy, radiusInCanvas * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(226, 232, 240, 0.25)';
          ctx.fill();
        } else if (g.type === 'molotov' || (g as any).type === 'incendiary') {
          // Molotovs/Fogo: círculos alaranjados translúcidos pulsantes
          const pulse = 0.3 + 0.12 * Math.sin(Date.now() / 150);
          ctx.beginPath();
          ctx.arc(gx, gy, radiusInCanvas, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
          ctx.fill();
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.7)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Núcleo alaranjado quente
          ctx.beginPath();
          ctx.arc(gx, gy, radiusInCanvas * 0.55, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(251, 146, 60, 0.45)';
          ctx.fill();
        } else if (g.type === 'flash' && currentTick <= start + 16) {
          // Flashbang detonação efêmera
          ctx.beginPath();
          ctx.arc(gx, gy, 14, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(254, 240, 138, 0.7)';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (g.type === 'he' && currentTick <= start + 24) {
          // HE detonação efêmera
          ctx.beginPath();
          ctx.arc(gx, gy, 16, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
          ctx.fill();
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    // ========================================================================
    // CAMADA 2 (C4 e Entidades do Chão): C4 plantada ou no chão
    // ========================================================================
    for (const bomb of bombEvents) {
      if (bomb.x !== undefined && bomb.y !== undefined && bomb.tick <= currentTick) {
        const { x: bx, y: by } = worldToCanvas(bomb.x, bomb.y, mapMetadata, width, height);
        const isPlanted =
          bomb.type === 'planted' ||
          bomb.type === 'plant' ||
          bomb.type === 'begin_defuse' ||
          bomb.type === 'abort_defuse';

        if (isPlanted) {
          // Pulso vermelho animado
          const pulseRadius = 10 + 4 * Math.sin(Date.now() / 180);
          ctx.beginPath();
          ctx.arc(bx, by, pulseRadius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(bx, by, 7, 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('C4', bx, by);
        } else if (bomb.type === 'dropped') {
          // C4 solta no chão: ícone amarelo/vermelho
          ctx.fillStyle = '#eab308';
          ctx.fillRect(bx - 6, by - 4, 12, 8);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(bx - 6, by - 4, 12, 8);

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('C4', bx, by);
        }
      }
    }

    // ========================================================================
    // CAMADA 3 (Traçantes de Tiro): Linhas efêmeras saindo da posição no yaw
    // ========================================================================
    if (shots && shots.length > 0) {
      for (const shot of shots) {
        const age = currentTick - shot.tick;
        if (age >= 0 && age <= 6) {
          const alpha = 1 - age / 6;
          const { x: sx, y: sy } = worldToCanvas(shot.x, shot.y, mapMetadata, width, height);
          const rad = (-shot.yaw * Math.PI) / 180;
          const tracerLength = 50;

          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + Math.cos(rad) * tracerLength, sy + Math.sin(rad) * tracerLength);
          ctx.strokeStyle = `rgba(254, 240, 138, ${alpha * 0.85})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }

    // ========================================================================
    // CAMADA 4 (Jogadores Mortos): Marcador 'X' cinza/translúcido da equipe
    // ========================================================================
    const deadPlayers = players.filter((p) => !p.isAlive);
    for (const p of deadPlayers) {
      const { x: px, y: py } = worldToCanvas(p.x, p.y, mapMetadata, width, height);
      const isCT = p.team === 'CT';
      const color = isCT ? 'rgba(96, 165, 250, 0.45)' : 'rgba(251, 146, 60, 0.45)';

      const size = 5;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - size, py - size);
      ctx.lineTo(px + size, py + size);
      ctx.moveTo(px + size, py - size);
      ctx.lineTo(px - size, py + size);
      ctx.stroke();
    }

    // ========================================================================
    // CAMADA 5 (Jogadores Vivos): Cones de visão, mira scoped, cego, HP, C4 defuse
    // ========================================================================
    const alivePlayers = players.filter((p) => p.isAlive);
    const playerRadius = 9;

    for (let i = 0; i < alivePlayers.length; i++) {
      const p = alivePlayers[i];
      const { x: px, y: py } = worldToCanvas(p.x, p.y, mapMetadata, width, height);

      const rad = (-p.yaw * Math.PI) / 180;
      const isCT = p.team === 'CT';
      const isSelected = String(p.id) === String(selectedPlayerId);

      // 5.1 Cones de Visão (24px, 30° de abertura)
      const coneLength = 24;
      const fovAngle = (30 * Math.PI) / 180;
      const coneColor = isCT ? 'rgba(59, 130, 246, 0.22)' : 'rgba(245, 158, 11, 0.22)';

      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.arc(px, py, coneLength, rad - fovAngle / 2, rad + fovAngle / 2);
      ctx.closePath();
      ctx.fillStyle = coneColor;
      ctx.fill();

      // Linha central do cone
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(rad) * 16, py + Math.sin(rad) * 16);
      ctx.strokeStyle = isCT ? '#93c5fd' : '#fde047';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Linha guia pontilhada estendida caso isScoped === true
      if (p.isScoped) {
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.moveTo(px + Math.cos(rad) * 16, py + Math.sin(rad) * 16);
        ctx.lineTo(px + Math.cos(rad) * 75, py + Math.sin(rad) * 75);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      // 5.2 Indicador de Cego (flashDuration > 0): Anel brilhante pulsante
      if (p.flashDuration > 0) {
        const flashIntensity = Math.min(1, p.flashDuration / 2);
        ctx.beginPath();
        ctx.arc(px, py, playerRadius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(253, 224, 71, ${0.4 + 0.5 * flashIntensity})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.fillText('⚡', px + playerRadius + 4, py - playerRadius);
      }

      // 5.3 Indicador de Desarme Ativo (isDefusing) com destaque verde
      if (p.isDefusing) {
        ctx.beginPath();
        ctx.arc(px, py, playerRadius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // 5.4 Seleção de Jogador
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(px, py, playerRadius + 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 5.5 Anel Perimétrico de HP Dinâmico
      const hp = Math.max(0, Math.min(100, p.hp));
      const hpPct = hp / 100;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + Math.PI * 2 * hpPct;

      ctx.beginPath();
      ctx.arc(px, py, playerRadius + 2.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (hp > 0) {
        ctx.beginPath();
        ctx.arc(px, py, playerRadius + 2.5, startAngle, endAngle);
        ctx.strokeStyle = hp > 50 ? '#22c55e' : hp > 20 ? '#eab308' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 5.6 Círculo Oficial do Jogador CT/TR
      const teamBg = isCT ? '#2563eb' : '#d97706';
      const teamBorder = isSelected ? '#ffffff' : isCT ? '#93c5fd' : '#fde68a';

      ctx.beginPath();
      ctx.arc(px, py, playerRadius, 0, Math.PI * 2);
      ctx.fillStyle = teamBg;
      ctx.fill();
      ctx.strokeStyle = teamBorder;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Número identificador no círculo
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), px, py);

      // 5.7 Nome do Jogador e Arma Ativa
      const displayName = p.name ? p.name.slice(0, 10) : 'P' + (i + 1);
      const displayWeapon = formatWeaponName(p.activeWeapon);

      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'center';
      const labelText = `${displayName} [${displayWeapon}]`;
      const textWidth = ctx.measureText(labelText).width;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(px - textWidth / 2 - 3, py - playerRadius - 16, textWidth + 6, 12);

      ctx.fillStyle = isCT ? '#bfdbfe' : '#fed7aa';
      ctx.fillText(labelText, px, py - playerRadius - 7);
    }

    // ========================================================================
    // CAMADA 6 (Indicadores de Dano / Floating Combat Text): -XX subindo e sumindo
    // ========================================================================
    if (damages && damages.length > 0) {
      for (const dmg of damages) {
        const delta = currentTick - dmg.tick;
        if (delta >= 0 && delta <= 48) {
          // Animação de subida e desvanecimento (~48 ticks = 0.75s)
          const progress = delta / 48;
          const alpha = 1 - progress;
          const yOffset = progress * 20;

          // Encontra a posição da vítima atingida
          const victim = players.find((p) => String(p.id) === String(dmg.victimId));
          if (victim) {
            const { x: vx, y: vy } = worldToCanvas(victim.x, victim.y, mapMetadata, width, height);

            ctx.save();
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Sombra preta para alto contraste
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.9})`;
            ctx.fillText(`-${dmg.damage}`, vx + 1, vy - playerRadius - 12 - yOffset + 1);

            // Texto vermelho vibrante
            ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
            ctx.fillText(`-${dmg.damage}`, vx, vy - playerRadius - 12 - yOffset);
            ctx.restore();
          }
        }
      }
    }
  }, [
    canvasSize,
    mapMetadata,
    players,
    radarLoaded,
    selectedPlayerId,
    bombEvents,
    kills,
    grenades,
    trajectories,
    shots,
    damages,
    currentTick,
  ]);

  useEffect(() => {
    let animId: number;
    const tick = () => {
      renderCanvas();
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [renderCanvas]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onSelectPlayer || !mapMetadata) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const hitRadius = 16;
    for (const p of players) {
      if (!p.isAlive) continue;
      const { x: px, y: py } = worldToCanvas(
        p.x,
        p.y,
        mapMetadata,
        canvasSize.width,
        canvasSize.height
      );
      const dist = Math.hypot(clickX - px, clickY - py);
      if (dist <= hitRadius) {
        onSelectPlayer(p.id);
        return;
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={
        'relative flex items-center justify-center w-full h-full bg-slate-950 overflow-hidden rounded-xl shadow-2xl border border-slate-800 ' +
        className
      }
    >
      <canvas
        ref={canvasRef}
        data-testid="radar-canvas"
        width={canvasSize.width}
        height={canvasSize.height}
        onClick={handleCanvasClick}
        className="cursor-crosshair select-none block"
      />
    </div>
  );
};

export default ViewportCanvas;
