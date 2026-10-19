'use client';

import React, { useEffect, useRef } from 'react';
import type {
  BombLifecycleState,
  CombatLineEvent,
  CS2Map,
  PlayerManifestEntry,
  TeamSide,
} from '../../types/replay.ts';
import type { NukeLayer } from '../../types/replayer-engine.ts';
import {
  C4_DEFUSE_WITHOUT_KIT_SECONDS,
  C4_DEFUSE_WITH_KIT_SECONDS,
  C4_PLANT_DURATION_SECONDS,
  FOV_CONE_ANGLE_DEG,
  FOV_CONE_REACH_PX,
  PLAYER_RADIUS_PX,
  RADAR_SIZE,
  SMOKE_WORLD_RADIUS,
  TEAM_CANONICAL_COLORS,
} from '../../lib/replay/constants.ts';
import {
  getMapCalibration,
  worldRadiusToCanvasPixels,
  worldToRadarUV,
} from '../../lib/replay/coordinates.ts';
import type { TacticalInterpolatedPlayer } from '../../lib/replay/interpolation.ts';

export interface ActiveUtilityVisual {
  id: string;
  type: 'smoke' | 'molotov' | 'incendiary' | 'flashbang' | 'he' | 'decoy';
  x: number;
  y: number;
  z: number;
  throwTick?: number;
  startTick: number;
  endTick: number;
  trajectory?: Array<[number, number, number]>;
  polygonHull?: Array<[number, number]>;
}

export interface BombVisualState {
  x: number;
  y: number;
  z?: number;
  state: BombLifecycleState;
  carrierId?: number | null;
  defuserId?: number | null;
  plantStartTick?: number | null;
  defuseStartTick?: number | null;
  hasKit?: boolean;
  timerRemaining: number;
}

export interface RecentDeathMarker {
  victimId: number;
  u: number;
  v: number;
  team: TeamSide;
  killTick: number;
}

export interface ActiveShotEffect {
  shooterId: number;
  tick: number;
}

export interface ViewportCanvasProps {
  mapName: CS2Map | string;
  currentTick: number;
  tickrate: number;
  isPlaying?: boolean;
  players: ReadonlyArray<TacticalInterpolatedPlayer>;
  playersManifest: ReadonlyArray<PlayerManifestEntry>;
  roundNumber: number;
  utilities: ReadonlyArray<ActiveUtilityVisual>;
  bomb: BombVisualState | null;
  recentDeaths?: ReadonlyArray<RecentDeathMarker>;
  activeShots?: ReadonlyArray<ActiveShotEffect>;
  combatLines?: ReadonlyArray<CombatLineEvent>;
  playerCalloutsById?: Readonly<Record<number, string>>;
  playerHasC4ById?: Readonly<Record<number, boolean>>;
  playerDefusersById?: Readonly<Record<number, boolean>>;
  activeNukeLayer?: NukeLayer;
  className?: string;
}

function safeGet2DContext(
  canvas: HTMLCanvasElement | null,
): CanvasRenderingContext2D | null {
  if (!canvas || typeof canvas.getContext !== 'function') return null;
  try {
    return canvas.getContext('2d');
  } catch {
    return null;
  }
}

function resolveCoordinateUV(
  rawX: number,
  rawY: number,
  mapName: string,
): { u: number; v: number } {
  if (mapName === 'test' && rawX >= 0 && rawX <= 1024 && rawY >= 0 && rawY <= 1024) {
    return { u: rawX, v: rawY };
  }
  return worldToRadarUV(rawX, rawY, mapName);
}

function getHpRingColor(hp: number): string {
  if (hp > 60) return '#22C55E';
  if (hp > 25) return '#F59E0B';
  return '#EF4444';
}

export function ViewportCanvas({
  mapName,
  currentTick,
  tickrate = 64,
  isPlaying = false,
  players,
  playersManifest,
  roundNumber,
  utilities,
  bomb,
  combatLines = [],
  playerDefusersById,
  activeNukeLayer = 'upper',
  className = '',
}: ViewportCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const mapConfig = getMapCalibration(String(mapName));
  const upperSrc = mapConfig.upperRadar ?? `/maps/${mapName}_radar.png`;
  const lowerSrc = mapConfig.lowerRadar ?? `/maps/${mapName}_lower_radar.png`;
  const activeRadarSrc = activeNukeLayer === 'lower' && mapConfig.splitZ !== undefined ? lowerSrc : upperSrc;

  // Função central de desenho: O Canvas agora é 100% transparente e fica POR CIMA do PNG
  const drawFrame = () => {
    const canvas = canvasRef.current;
    const ctx = safeGet2DContext(canvas);
    if (!canvas || !ctx) return;

    // 1. Limpa apenas o canvas dinâmico (o PNG do mapa está na tag <img> por baixo)
    ctx.clearRect(0, 0, RADAR_SIZE, RADAR_SIZE);

    // 2. Mapeamento dos Jogadores pelo Manifesto (CTs: 1..5, Ts: 6..10)
    const isPostHalftime = roundNumber >= 13;
    const manifestById = new Map<number, { name: string; side: TeamSide; number: number }>();

    const ctList: PlayerManifestEntry[] = [];
    const tList: PlayerManifestEntry[] = [];
    playersManifest.forEach((m) => {
      const side: TeamSide = isPostHalftime
        ? m.initialTeam === 'CT' ? 'T' : 'CT'
        : m.initialTeam;
      if (side === 'CT') ctList.push(m);
      else tList.push(m);
    });

    ctList.forEach((m, idx) => {
      manifestById.set(m.id, { name: m.name, side: 'CT', number: idx + 1 });
    });
    tList.forEach((m, idx) => {
      manifestById.set(m.id, { name: m.name, side: 'T', number: idx + 6 });
    });

    // 3. Utilitários (Smokes e Molotovs)
    const smokeRadiusPx = Math.max(
      24,
      worldRadiusToCanvasPixels(SMOKE_WORLD_RADIUS, String(mapName)),
    );

    for (const util of utilities) {
      const { u, v } = resolveCoordinateUV(util.x, util.y, String(mapName));
      ctx.save();

      if (util.type === 'smoke') {
        ctx.beginPath();
        ctx.arc(u, v, smokeRadiusPx, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.65)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.9)';
        ctx.stroke();
      } else if (util.type === 'molotov' || util.type === 'incendiary') {
        ctx.beginPath();
        ctx.arc(u, v, smokeRadiusPx * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.95)';
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. Bomba C4 (Planted, Defusing, Dropped)
    let bombCanvasPos: { u: number; v: number } | null = null;
    if (bomb && bomb.state !== 'carried') {
      bombCanvasPos = resolveCoordinateUV(bomb.x, bomb.y, String(mapName));
      const { u: bu, v: bv } = bombCanvasPos;

      ctx.save();
      if (bomb.state === 'planted' || bomb.state === 'defusing') {
        const blink = Math.floor(currentTick / 8) % 2 === 0;
        ctx.fillStyle = blink ? '#EF4444' : '#991B1B';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(bu - 7, bv - 7, 14, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('C4', bu, bv);
      } else if (bomb.state === 'dropped') {
        ctx.fillStyle = '#FACC15';
        ctx.strokeStyle = '#090D12';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(bu - 5, bv - 4, 10, 8);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    // 5. Linhas de Combate (Traçantes de tiro)
    for (const cl of combatLines) {
      if (
        cl.attackerX !== undefined &&
        cl.attackerY !== undefined &&
        cl.victimX !== undefined &&
        cl.victimY !== undefined
      ) {
        const attPos = resolveCoordinateUV(cl.attackerX, cl.attackerY, String(mapName));
        const vicPos = resolveCoordinateUV(cl.victimX, cl.victimY, String(mapName));

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(attPos.u, attPos.v);
        ctx.lineTo(vicPos.u, vicPos.v);
        ctx.strokeStyle = cl.isKill ? '#EF4444' : 'rgba(250, 204, 21, 0.85)';
        ctx.lineWidth = cl.isKill ? 2.2 : 1.5;
        ctx.setLineDash([4, 2]);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(vicPos.u, vicPos.v, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#EF4444';
        ctx.fill();
        ctx.restore();
      }
    }

    // 6. Desenho dos 10 Jogadores (Renderizados na camada visível por cima)
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const pid = Number(p.id ?? p.playerId);
      const meta = manifestById.get(pid);
      const side: TeamSide = meta?.side ?? (pid <= 5 ? 'CT' : 'T');
      const playerNumber = meta?.number ?? ((i % 10) + 1);
      const nickname = meta?.name ?? `P${playerNumber}`;
      const teamColor = side === 'CT' ? TEAM_CANONICAL_COLORS.CT : TEAM_CANONICAL_COLORS.TERRORIST;

      // Resolução segura de coordenadas de tela (Pixels 0..1024)
      let u = p.u;
      let v = p.v;

      // Se u/v vierem em escala normalizada [0..1], converte para pixels
      if (typeof u === 'number' && typeof v === 'number' && u >= 0 && u <= 1 && v >= 0 && v <= 1) {
        u *= RADAR_SIZE;
        v *= RADAR_SIZE;
      }

      // Se u/v forem inválidos ou 0, recalcula pelas coordenadas de mundo
      if (!Number.isFinite(u) || !Number.isFinite(v) || (u === 0 && v === 0)) {
        if (Number.isFinite(p.percentX) && Number.isFinite(p.percentY) && (p.percentX !== 0 || p.percentY !== 0)) {
          u = (p.percentX / 100) * RADAR_SIZE;
          v = (p.percentY / 100) * RADAR_SIZE;
        } else {
          const rawX = p.x ?? (p as any).xWorld ?? 0;
          const rawY = p.y ?? (p as any).yWorld ?? 0;
          const coords = resolveCoordinateUV(rawX, rawY, String(mapName));
          u = coords.u <= 1 && coords.v <= 1 && (coords.u !== 0 || coords.v !== 0) ? coords.u * RADAR_SIZE : coords.u;
          v = coords.u <= 1 && coords.v <= 1 && (coords.u !== 0 || coords.v !== 0) ? coords.v * RADAR_SIZE : coords.v;
        }
      }

      // Marcador de Jogador Abatido (Caveira / X vermelho)
      if (!p.isAlive) {
        ctx.save();
        ctx.strokeStyle = teamColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(u, v, PLAYER_RADIUS_PX * 0.75, 0, Math.PI * 2);
        ctx.stroke();

        const c = 5;
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(u - c, v - c);
        ctx.lineTo(u + c, v + c);
        ctx.moveTo(u + c, v - c);
        ctx.lineTo(u - c, v + c);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      ctx.save();

      // Cabo de Defuse se o CT estiver desarmando a bomba
      const isDefusing = p.isDefusing || (bomb?.state === 'defusing' && bomb.defuserId === pid);
      if (isDefusing && bombCanvasPos) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(u, v);
        ctx.lineTo(bombCanvasPos.u, bombCanvasPos.v);
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.restore();

        const hasKit = playerDefusersById?.[pid] ?? p.hasDefuser ?? bomb?.hasKit ?? false;
        const defuseTotalTicks = (hasKit ? C4_DEFUSE_WITH_KIT_SECONDS : C4_DEFUSE_WITHOUT_KIT_SECONDS) * tickrate;
        const defuseElapsed = bomb?.defuseStartTick ? Math.max(0, currentTick - bomb.defuseStartTick) : (currentTick % defuseTotalTicks);
        const defuseProgress = Math.min(1, defuseElapsed / Math.max(1, defuseTotalTicks));

        ctx.beginPath();
        ctx.arc(u, v, PLAYER_RADIUS_PX + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * defuseProgress);
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Barra de progresso circular se o TR estiver plantando
      const isPlanting = p.isPlanting || (bomb?.state === 'planting' && bomb.carrierId === pid);
      if (isPlanting) {
        const plantTotalTicks = C4_PLANT_DURATION_SECONDS * tickrate;
        const plantElapsed = bomb?.plantStartTick ? Math.max(0, currentTick - bomb.plantStartTick) : (currentTick % plantTotalTicks);
        const plantProgress = Math.min(1, plantElapsed / Math.max(1, plantTotalTicks));

        ctx.beginPath();
        ctx.arc(u, v, PLAYER_RADIUS_PX + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * plantProgress);
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Cone de Visão (FOV 90° e 25px de alcance)
      const yawRad = (-p.yaw * Math.PI) / 180;
      const halfConeRad = ((FOV_CONE_ANGLE_DEG / 2) * Math.PI) / 180;

      ctx.beginPath();
      ctx.moveTo(u, v);
      ctx.arc(u, v, FOV_CONE_REACH_PX, yawRad - halfConeRad, yawRad + halfConeRad);
      ctx.closePath();
      ctx.fillStyle = side === 'CT' ? 'rgba(37, 99, 235, 0.28)' : 'rgba(234, 88, 12, 0.28)';
      ctx.fill();

      // Vetor / Linha Central de Mira
      const tipX = u + Math.cos(yawRad) * (FOV_CONE_REACH_PX - 2);
      const tipY = v + Math.sin(yawRad) * (FOV_CONE_REACH_PX - 2);
      ctx.beginPath();
      ctx.moveTo(u, v);
      ctx.lineTo(tipX, tipY);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Círculo Principal do Jogador (Raio 12px)
      ctx.beginPath();
      ctx.arc(u, v, PLAYER_RADIUS_PX, 0, Math.PI * 2);
      ctx.fillStyle = teamColor;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#090D12';
      ctx.stroke();

      // Anel Circular de Vida (HP)
      const hpRatio = Math.max(0, Math.min(1, p.hp / 100));
      ctx.beginPath();
      ctx.arc(u, v, PLAYER_RADIUS_PX + 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpRatio);
      ctx.strokeStyle = getHpRingColor(p.hp);
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Número da Camisa (Centralizado no círculo)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px Inter, monospace, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(playerNumber), u, v);

      // Nickname do Atleta (Pill com fundo escuro semi-transparente)
      const labelY = v - PLAYER_RADIUS_PX - 10;
      const textWidth = Math.max(28, nickname.length * 5.8 + 8);
      ctx.fillStyle = 'rgba(9, 13, 18, 0.85)';
      ctx.fillRect(u - textWidth / 2, labelY - 6, textWidth, 12);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 9px Inter, system-ui, sans-serif';
      ctx.fillText(nickname, u, labelY);

      ctx.restore();
    }
  };

  useEffect(() => {
    drawFrame();

    if (!isPlaying) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    let running = true;
    const loop = () => {
      if (!running) return;
      drawFrame();
      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [
    mapName,
    currentTick,
    tickrate,
    isPlaying,
    players,
    playersManifest,
    roundNumber,
    utilities,
    bomb,
    combatLines,
    playerDefusersById,
    activeNukeLayer,
  ]);

  return (
    <div
      data-testid="viewport-radar-container"
      style={{ aspectRatio: '1 / 1' }}
      className={`relative w-full h-full max-w-full max-h-full aspect-square rounded-[2px] border border-[#1F2629] bg-[#0B0E0F] overflow-hidden select-none ${className}`.trim()}
    >
      {/* CAMADA 0 (Fundo, Z-Index 0): Imagem estática do radar acelerada por GPU */}
      <img
        key={`${mapName}-${activeNukeLayer}`}
        src={activeRadarSrc}
        alt={`Radar do mapa ${mapName}`}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-0"
        onError={(e) => {
          (e.target as HTMLElement).style.display = 'none';
        }}
      />

      {/* CAMADA 1 (Frente, Z-Index 10): Canvas 100% transparente para entidades dinâmicas */}
      <canvas
        ref={canvasRef}
        width={RADAR_SIZE}
        height={RADAR_SIZE}
        data-testid="radar-canvas"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
      />
    </div>
  );
}

export default ViewportCanvas;