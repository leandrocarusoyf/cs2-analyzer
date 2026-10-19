# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Competitive Counter-Strike 2 analysts, esports coaches, and pro/semi-pro players performing post-match tactical deep dives, positional role auditing, and macro/micro round reviews.

## Product Purpose

CS2 Analyzer delivers high-density, millimetric tactical telemetry and spatial match replays. It exists to replace slow, manual demo inspections with fast, actionable intelligence across positioning, crosshair placement, dueling dynamics, role performance, and round economy. Success means enabling coaching staff and analysts to detect subtle opponent tendencies, diagnose failed rounds, and benchmark player efficiency within minutes of match completion.

## Positioning

Micro-tactical telemetry platform blending real-time 2D canvas radar playback with 10-axis pro role analysis (EDGE/Skybox HUD style). Unlike generic macro-stats databases (e.g. pure HLTV ratings), CS2 Analyzer connects high-level KPIs to granular, round-by-round spatial coordinates, positional anchors, dueling trades, and buy-type context.

## Operating Context

- Desktop analysis environments (dual monitors, high-resolution screens, 1280px / 1360px calibrated layouts).
- Post-scrim and tournament debriefing sessions where coaches present tactical findings to team rosters.
- Synchronized demo telemetry ingestion (CS2 `.dem` parser extraction and eventual Supabase PostgreSQL/Storage pipelines).

## Capabilities and Constraints

- **2D Radar Replayer**: Real-time canvas radar playback with timeline scrub, speed controls (0.5x to 4x), killfeed integration, grenade event trajectories, and player health/equipment badges.
- **Multidimensional Role Analytics**: 10-axis canonical CS2 radar spider charts (HLTV Rating, ADR, Opening Attempts, Opening KD, Trade Kills, KPR, KD, DPR, Traded Deaths, KAST), comparison overlays, and CT/T specific role performance tables (Anchor, Rotator, Lurker, Pack/Entry).
- **Weapons & Economy Telemetry**: Weapon usage, damage-per-dollar efficiency, buy-type breakdown (Full Buy vs Full Buy, Full Buy vs Eco/Force, Pistol rounds).
- **Pro Leaderboards**: Global pro player benchmarking filterable by tactical side and operational roles.
- **Technical Constraints**: Desktop-first layout density; strict separation of UI presentation from backend DTOs to ensure modular integration with future Supabase database models.

## Brand Commitments

- **Name**: CS2 ANALYZER
- **Aesthetic**: Tactical esports HUD inspired by military telemetry and professional broadcast tools (Skybox / EDGE design system).
- **Voice & Terminology**: Technical, precise, authoritative, and gamer-native (ADR, KAST, KPR, DPR, Opening Duels, Site Anchor, Rotator, Lurk, Pack).
- **Color Identity**: Tactical deep onyx backgrounds (`#0B0E0F`, `#111618`), structural borders (`#1F2629`, `#1B2226`), neon green highlights (`#00FFA3`), CT cobalt (`#2979FF`, `#3B82F6`), and TR safety orange (`#FF8C00`, `#F97316`).

## Evidence on Hand

- Fully functional 2D canvas demo playback engine in `src/components/replayer/`.
- Modular analytical DTOs and pro datasets (KSCERATO, NiKo, m0NESY) in `src/data/roles-mock.ts` and `src/data/leaderboards-data.ts`.
- Complete SVG icon mapping for all CS2 canonical weapons in `src/utils/icon-mapper.ts`.

## Product Principles

1. **Telemetry First, Zero Fluff**: Every visual element serves tactical analysis; omit decorative clutter that obscures raw numbers and spatial accuracy.
2. **Instant Spatial Context**: High-level metrics must always be contextualized by map, side (CT vs T), and economy phase.
3. **Millimetric HUD Precision**: Maintain high information density, tabular alignment, mono-spaced metrics, and rapid-scan contrast suitable for pro coaching environments.
4. **Architectural Modularity**: Keep analytics DTOs decoupled from components to enable instant hydration from real match demo parsers and Supabase tables.

## Accessibility & Inclusion

- High-contrast text hierarchies against dark slate surfaces for maximum readability in dimly lit team analysis rooms.
- Accessible semantic markup (`role="tablist"`, `aria-label`, data attributes) across all interactive replayer controls and analytical tables.

