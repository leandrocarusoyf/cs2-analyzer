---
name: CS2 Analyzer
description: High-density tactical telemetry flight deck and 2D replay engine for Counter-Strike 2
colors:
  primary: "#00FFA3"
  primary-glow: "rgba(0, 255, 163, 0.14)"
  canvas: "#0B0E0F"
  surface: "#111618"
  surface-card: "#0E1214"
  surface-active: "#13191B"
  border-subtle: "#1F2629"
  border-card: "#1B2226"
  border-muted: "#232B30"
  side-ct: "#2979FF"
  side-ct-hover: "#3B82F6"
  side-ct-bg: "#0F1E2E"
  side-tr: "#FF8C00"
  side-tr-hover: "#F97316"
  side-tr-bg: "#26160A"
  text-primary: "#FFFFFF"
  text-secondary: "#7E8F98"
  text-muted: "#9BA8B0"
  text-dim: "#4B5563"
typography:
  hero-metric:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "25px"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.05em"
  metric:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.05em"
  nav:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  caption:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  label:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "10px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.08em"
  micro:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "9px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
  nano:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "8px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "normal"
rounded:
  none: "0px"
  sm: "2px"
  md: "2px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  sidebar-item:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    height: "35px"
    padding: "0 14px"
  sidebar-item-active:
    backgroundColor: "{colors.surface-active}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    height: "35px"
    padding: "0 14px"
  filter-pill-ct:
    backgroundColor: "{colors.side-ct-bg}"
    textColor: "{colors.side-ct}"
    rounded: "{rounded.sm}"
    height: "26px"
    padding: "0 10px"
  filter-pill-tr:
    backgroundColor: "{colors.side-tr-bg}"
    textColor: "{colors.side-tr}"
    rounded: "{rounded.sm}"
    height: "26px"
    padding: "0 10px"
  kpi-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    height: "84px"
    padding: "12px"
---

# Design System: CS2 Analyzer

## Overview

**Creative North Star: "The Tactical Telemetry Flight Deck"**

CS2 Analyzer is an ultra-dense, military-precision esports HUD engineered for pro coaching staff, analysts, and competitive players. The interface treats match data not as decorative graphics, but as tactical instrumentation—combining the austerity of a military radar suite with the reactive feedback of a professional broadcasting system.

Surfaces are anchored in deep abyssal blacks and dark titanium slates. Visual hierarchy is established through ruthless tonal layering, hairline carbon dividers, and sparse, high-voltage neon accents that direct the analyst's eye to high-impact telemetry without visual noise.

**Key Characteristics:**
- **High-Density Cockpit Ergonomics**: Tightly locked vertical rhythms and strict horizontal bounding (1280px / 1360px max width).
- **Tabular Mono Precision**: Numeric data, coordinates, ratings, and economy delta metrics always render in monospaced, tabular numbers.
- **Micro-Bevel Restraint**: Universal 2px border radius across all cards, pills, buttons, and inputs; zero rounded pill fluff.
- **Surgical Neon Signaling**: Neon green (`#00FFA3`) reserved strictly for active tactical states, live playback, and key performance outliers.

## Colors

The palette is rooted in tactical low-visibility cockpit environments, utilizing sharp value steps and unmistakable team faction signals.

### Primary
- **Radar Neon Cyan-Green** (`#00FFA3`): High-voltage accent reserved exclusively for active navigation markers, winning match results, radar vector vertices, and primary KPI callouts. Used on <5% of the viewport.
- **Neon Radar Glow** (`rgba(0, 255, 163, 0.14)`): Translucent polygon fills and subtle active indicator backgrounds.

### Secondary (Tactical Factions)
- **Cobalt Interceptor (CT Side)** (`#2979FF` / `#3B82F6`): Identifies Counter-Terrorist metrics, anchor/rotator role tags, and defensive utility states. Background tints use `#0F1E2E` with `#1E3A5F` borders.
- **Safety Amber Flare (TR Side)** (`#FF8C00` / `#F97316`): Identifies Terrorist metrics, lurk/pack role tags, and offensive entry states. Background tints use `#26160A` with `#3D2411` borders.

### Neutral
- **Abyssal Onyx** (`#0B0E0F`): Global viewport canvas, radar background, and deep inset input fills.
- **Cockpit Titanium Slate** (`#111618`): Sidebar container background and filter bar glass surface.
- **Telemetry Card Slate** (`#0E1214`): Standard background for cards, tables, and analytical pods.
- **Active Selection Surface** (`#13191B`): Active link background in sidebar navigation.
- **Structural Carbon Border** (`#1F2629` / `#1B2226`): Hairline 1px structural framing and table cell dividers.
- **Telemetry Primary White** (`#FFFFFF`): High-emphasis titles, active ratings, and primary data values.
- **Muted Telemetry Cyan-Grey** (`#7E8F98`): Metric labels, secondary telemetry, and table column headers. Calibrated for WCAG AA contrast compliance (≥ 4.5:1 against dark surfaces).
- **Inactive Nav Slate** (`#9BA8B0`): Default sidebar navigation labels.

### Named Rules
**The Rarity of Neon Rule.** `#00FFA3` is never used for broad container backgrounds, large borders, or decorative illustrations. Its tactical impact relies entirely on its scarcity; when a green pixel appears, it signals an active state or an elite performance threshold.

## Typography

**Display Font:** Inter, system-ui, -apple-system, sans-serif  
**Body Font:** Inter, system-ui, -apple-system, sans-serif  
**Label/Mono Font:** ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace  

**Character:** Bold, italic angular display headers combined with cold, high-precision monospaced telemetry.

### Hierarchy
- **Display** (font-black italic, 25px, line-height 1, tracking -0.05em): Application logo brandmark (`CS2 ANALYZER`).
- **Metric Display** (font-bold font-mono, 24px, line-height 1, tabular-nums): High-impact ratings (1.50, 1.09), ADR, K/D, and primary scorecard numbers.
- **Headline** (font-bold, 18px–20px, line-height 1.2, tracking tight): Major panel headers and player name displays.
- **Title** (font-bold uppercase, 14px, line-height 1.3, tracking 0.05em): Section titles, group separators (`/ GAMES`, `/ STATISTICS`), and primary card headings.
- **Nav** (font-bold, 13px, line-height 1): Sidebar navigation links.
- **Body** (font-medium, 12px, line-height 1.4): Player bio details, descriptive labels, and table secondary cells.
- **Caption** (font-semibold, 11px, line-height 1.2): Tactical role filter pills, table header columns, and secondary actions.
- **Label / Tabular** (font-mono font-bold, 10px, tracking 0.08em uppercase): KPI benchmarks, radar vertices, timers, and telemetry badges.
- **Micro Badge** (font-mono font-bold, 9px, line-height 1): Faction side indicators (`CT` / `T` 18px badges), app version badge (`v0.1.0`), and card footnotes.
- **Nano Axis** (font-mono font-medium, 8px, line-height 1): Sparkline timeline date intervals and micro-coordinates.

### Named Rules
**The Tabular Precision Rule.** Every numeric data point—including ratings, ADR, K/D, percentages, round scores, and coordinates—must declare `tabular-nums` or `font-mono`. Column values must never shift horizontally as numbers change during live playback or filtering.

## Layout

The spatial model enforces dense, desktop-first command center layouts:
- **Max Width**: Centralized 1280px (`max-w-[1280px] mx-auto px-4`) on analytical dashboards and 1360px on pro leaderboards.
- **Fixed Sidebar**: Fixed 215px width (`w-[215px] min-w-[215px] min-h-screen`) ensuring zero horizontal reflow.
- **Filter Bar**: Fixed 48px height (`h-12`) continuous horizontal strip with compact 28px controls.
- **Top Row Height**: Fixed 285px (`h-[285px] flex items-stretch gap-3`) split into 56% (Player Identity + Roles), 24% (Buy Types), and 20% (HLTV Rating).
- **KPI Row Height**: Locked 84px (`h-[84px]`) cards in a 4-column grid (`grid grid-cols-4 gap-3`).
- **Role Performance Card**: Locked 530px (`h-[530px] flex gap-5`) split 60% (Radar + controls) and 40% (Comparison metrics).

## Elevation & Depth

CS2 Analyzer operates on **Strict Tonal Layering**. Surfaces are flat at rest with zero diffuse ambient drop-shadows. Elevation is established exclusively through controlled surface brightness increments and crisp 1px borders:
- Canvas base: `#0B0E0F`
- Card surface: `#0E1214` (+1% lightness)
- Header / Sidebar: `#111618` (+2% lightness)
- Inset input / radar well: `#0B0E0F` (recessed)
- Borders: 1px solid `#1F2629` or `#1B2226`

### Named Rules
**The Zero Ambient Shadow Rule.** Diffuse Gaussian blur shadows are prohibited across all cards, modals, and tables. Depth is conveyed strictly through value contrast and 1px structural borders.

## Shapes

- **Radius Strategy**: Strict 2px border radius (`rounded-[2px]`) applied to cards, pills, buttons, and inputs.
- **Sharp Hard Edges**: Equalizer bars, sparkline markers, radar web polygons, and divider lines maintain 0px radius (`rounded-none`).
- **Dividers**: 1px solid horizontal lines (`h-[1px] bg-[#232B30]` or `border-t border-[#1B2226]`).

## Components

### Buttons & Pills
- **Sidebar Nav Links**: `h-[35px] flex items-center px-3.5 my-0.5 rounded-[2px]`. Inactive: `#9BA8B0` with `hover:bg-white/5 hover:text-white`. Active: `#13191B` with 3px x 19px absolute white left indicator.
- **Tactical Side Pills**: `h-7` or `h-[26px] px-2.5 text-[11px] font-bold rounded-[2px] border`.
  - Active CT: `#2979FF` text, `#1E3A5F` border, `#0F1E2E` background.
  - Active TR: `#FF8C00` text, `#3D2411` border, `#26160A` background.
  - Inactive / Neutral: `#7E8B92` text, `#1F2629` border, `#13191C` background.

### Cards / Telemetry Containers
- **Background**: `#0E1214` with 1px border `#1B2226` and `rounded-[2px]`.
- **KPI Metric Cards**: `h-[84px] p-3 flex flex-col justify-between`. Contains metric title (10px uppercase `#6B7A82`), tabular value (24px bold mono text-white), and comparative benchmark at bottom.

### Inputs & Filters
- **Search Field**: `w-[190px] h-7 bg-[#0B0E0F] border border-[#1F2629] rounded-[2px] px-2 text-[11px] text-white placeholder-[#6B7A82] focus:border-[#00FFA3] focus:outline-none`.

### Tables
- **Headers (`<thead>`)**: `h-8 bg-[#0B0E0F] border-b border-[#1B2226]`, `text-[11px] font-bold uppercase tracking-wider text-[#6B7A82] px-2.5`.
- **Rows (`<tbody><tr>`)**: `h-10 border-b border-[#141A1D] hover:bg-[#13191D] transition-colors`. Monospaced tabular columns for ratings and rounds.

### 10-Axis Radar Chart
- **Geometry**: SVG vector web ~330px span, concentric polygon levels at 25%, 50%, 75%, 100% in 1px `#1E262A`.
- **Polygon**: `stroke="#00FFA3" strokeWidth="1.5"` with fill `rgba(0, 255, 163, 0.14)`. 4px circular vertices with white stroke.

## Do's and Don'ts

### Do:
- **Do** lock all numeric values with `tabular-nums` or `font-mono`.
- **Do** maintain a strict 2px border radius (`rounded-[2px]`) for all UI surfaces.
- **Do** use uppercase 10px-11px tracked headers with a neon slash prefix (`<span className="text-[#00FFA3] font-bold mr-1.5 font-mono">/</span>`).
- **Do** align team-specific data strictly with their faction colors (CT `#2979FF`, TR `#FF8C00`).
- **Do** preserve 1280px / 1360px centered max-width bounds on high-resolution displays.

### Don't:
- **Don't** use diffuse drop shadows, card glows, or floating elevation effects.
- **Don't** use generic rounded pills (`rounded-full`) or soft playful radiuses (`rounded-lg` / `rounded-xl`).
- **Don't** flood screens with neon green; keep `#00FFA3` strictly bounded to active states and key vector points.
- **Don't** allow tables or metric blocks to reflow dynamically based on number of digits.
- **Don't** embed hardcoded player names or un-typed mock objects inside component JSX.

