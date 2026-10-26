---
name: Tactical Replay & Esports Analytics
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363940'
  surface-container-lowest: '#0b0e14'
  surface-container-low: '#191c22'
  surface-container: '#1d2026'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e1e2eb'
  on-surface-variant: '#bac9cc'
  inverse-surface: '#e1e2eb'
  inverse-on-surface: '#2e3037'
  outline: '#849396'
  outline-variant: '#3b494c'
  surface-tint: '#00daf3'
  primary: '#c3f5ff'
  on-primary: '#00363d'
  primary-container: '#00e5ff'
  on-primary-container: '#00626e'
  inverse-primary: '#006875'
  secondary: '#adc6ff'
  on-secondary: '#002e6a'
  secondary-container: '#0566d9'
  on-secondary-container: '#e6ecff'
  tertiary: '#ffe9df'
  on-tertiary: '#552100'
  tertiary-container: '#ffc4a6'
  on-tertiary-container: '#953f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#9cf0ff'
  primary-fixed-dim: '#00daf3'
  on-primary-fixed: '#001f24'
  on-primary-fixed-variant: '#004f58'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#ffdbca'
  tertiary-fixed-dim: '#ffb690'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#783200'
  background: '#10131a'
  on-background: '#e1e2eb'
  surface-variant: '#32353c'
typography:
  display-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  screen-title:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: 0.05em
  card-header:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  stat-display:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.03em
  stat-mono-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: -0.01em
  benchmark-label:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
  hud-timer:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 22px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Visual Design Rules

- **Master Background:** Deep slate/dark charcoal (`#0B0E14`).
- **Surfaces & Containers:** Elevated dark slate (`#151922`) with a subtle 1px border (`#222735`).
- **Primary Accent:** Electric Cyan (`#00E5FF`) for active tabs, highlighted cards, progress bars, and graph curves with dark-cyan under-glow gradients.
- **Faction Accents:** CT Sky Blue (`#3B82F6`) for CT forces and defense markers; T Flame Orange (`#F97316`) for T forces, bomb plants, and lurk metrics.
- **Typography Engine:** Strictly `Inter` for all UI labels, navigation buttons, card titles, and badges; strictly `JetBrains Mono` for all numeric stats, ratings, ADR, K/D, timers, timestamps, and data tables.

## Headers & Top Navigation (Strict Separation)

### Mode A: Match Replay Header (ONLY for "2D Tactical Map" & "In-Match Player Inspection")
- **Active Sidebar Tab:** Must strictly be highlighted as **"2D Tactical Map"** in Electric Cyan. "Player Stats" must remain muted/inactive.
- **Scoreboard Bar:** Displays match scoreboard (`NAVI 13 : 11 FAZE`), map pill (`DE_MIRAGE`), date, tournament name (`ESL PRO LEAGUE`), and tickrate tag (`128-Tick Parsed`).
- **Playback Controls:** Round switcher (`< Round 24 / 24 >`), scrubber timeline, HUD round clock, and playback speeds (`0.5x`, `1x`, `2x`, `4x`).
- **Player Inspection State:** When inspecting an individual player from the tactical roster (e.g., Aleksib), the active sidebar tab remains **"2D Tactical Map"**, showing a sub-header breadcrumb: `2D Tactical Map > Match Roster > Inspecting: Aleksib (NAVI CT)` alongside a `← Back to 2D Map` close button.

### Mode B: Global Database Header (for "Player Stats", "Maps", "Match History")
- **STRICT PROHIBITION:** NEVER render match scores, tournament tags, round counters (`Round X/Y`), tickrate badges, or replay speed buttons.
- **Active Sidebar Tab:** Must strictly be highlighted as **"Player Stats"** in Electric Cyan.
- **Global Search & Filter Bar:** 
  - Searchable player switcher dropdown (e.g., `donk // Team Spirit`) with team crest.
  - Action button: `+ Compare Player`.
  - Global scope dropdowns: `Scope: Last 3 Months`, `Pool: All Maps (Active Duty)`, `Comp: Tier 1 Pros`, and `Export Data` button.
- **Sub-Navigation Tabs:** Horizontal pill tabs: `Intro`, `Roles & Positioning`, `Weapons & Duels`, `Buy Types`, `Maps`.

## Data Visualizations & Cards

- **Charts:** Spline area charts with crisp glowing `#00E5FF` curves and vertical gradient drop fills.
- **Roster & Scoreboards:** Clean row separation with `1px solid #222735` borders, displaying health bars, weapon icons, armor tags, and currency values in tabular monospace fonts.
- **Corner Radii:** Restrained soft corner rounding across containers and interactive components to maintain a precise, modern telemetry styling.