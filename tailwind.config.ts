import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/data/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Tactical HUD Design Tokens (HTML Gabarito)
        outline: '#849396',
        'surface-container-high': '#272a31',
        'tertiary-fixed-dim': '#ffb690',
        'tertiary-fixed': '#ffdbca',
        'surface-container-low': '#191c22',
        error: '#ffb4ab',
        'on-primary': '#00363d',
        'on-tertiary': '#552100',
        'on-surface': '#e1e2eb',
        'on-primary-fixed': '#001f24',
        tertiary: '#ffe9df',
        'on-secondary-container': '#e6ecff',
        'error-container': '#93000a',
        'on-background': '#e1e2eb',
        'tertiary-container': '#ffc4a6',
        'outline-variant': '#3b494c',
        'on-tertiary-container': '#953f00',
        'inverse-on-surface': '#2e3037',
        'secondary-fixed': '#d8e2ff',
        secondary: '#adc6ff',
        'surface-variant': '#32353c',
        'primary-fixed-dim': '#00daf3',
        'on-secondary': '#002e6a',
        'secondary-container': '#0566d9',
        'on-tertiary-fixed': '#341100',
        primary: '#c3f5ff',
        'inverse-surface': '#e1e2eb',
        'surface-container': '#1d2026',
        'secondary-fixed-dim': '#adc6ff',
        'on-surface-variant': '#bac9cc',
        'surface-container-highest': '#32353c',
        'on-tertiary-fixed-variant': '#783200',
        'on-primary-fixed-variant': '#004f58',
        'primary-container': '#00e5ff',
        'surface-container-lowest': '#0b0e14',
        'surface-bright': '#363940',
        'on-secondary-fixed-variant': '#004395',
        'surface-tint': '#00daf3',
        'on-secondary-fixed': '#001a42',
        background: '#10131a',
        surface: '#10131a',
        'on-error-container': '#ffdad6',
        'on-error': '#690005',
        'surface-dim': '#10131a',
        'on-primary-container': '#00626e',
        'inverse-primary': '#006875',
        'primary-fixed': '#9cf0ff',

        // Stitch Source of Truth Tokens (2D Tactical Map & Player Inspection Modal)
        'base-bg': 'var(--color-base-bg)',
        'surface-dark': 'var(--color-surface-dark)',
        'card-bg': 'var(--color-card-bg)',
        'surface-elevated': 'var(--color-surface-elevated)',
        'border-dark': 'var(--color-border-dark)',
        'cyan-accent': 'var(--color-cyan-accent)',
        'cyan-hover': 'var(--color-cyan-hover)',
        'cyan-dim': 'var(--color-cyan-dim)',
        'cyan-glow': 'var(--color-cyan-glow)',
        'cyan-glow-strong': 'var(--color-cyan-glow-strong)',
        'ct-blue': 'var(--color-ct-blue)',
        't-orange': 'var(--color-t-orange)',

        // Base Canvas & Surfaces (Semantic Aliases mapped to CSS Variables)
        canvas: 'var(--color-canvas)',
        'surface-card': 'var(--color-surface-card)',
        'surface-active': 'var(--color-surface-active)',

        // Structural Borders
        'border-subtle': 'var(--color-border-subtle)',
        'border-card': 'var(--color-border-card)',
        'border-muted': 'var(--color-border-muted)',

        // Primary Tactical Accent (Electric Cyan)
        accent: 'var(--color-accent)',
        'primary-glow': 'var(--color-primary-glow)',

        // Faction Colors: Counter-Terrorist (CT Sky Blue)
        ct: 'var(--color-ct)',
        'ct-hover': 'var(--color-ct-hover)',
        'ct-bg': 'var(--color-ct-bg)',
        'ct-border': 'var(--color-ct-border)',

        // Faction Colors: Terrorist (T Flame Orange)
        tr: 'var(--color-tr)',
        'tr-hover': 'var(--color-tr-hover)',
        'tr-bg': 'var(--color-tr-bg)',
        'tr-border': 'var(--color-tr-border)',

        // Typography Hierarchy
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'text-dim': 'var(--color-text-dim)',

        // Tactical Status Feedback
        'status-win': 'var(--color-status-win)',
        'status-loss': 'var(--color-status-loss)',
        'status-tie': 'var(--color-status-tie)',

        // Legacy CamelCase aliases for backwards compatibility
        borderSubtle: 'var(--color-border-subtle)',
        borderCard: 'var(--color-border-card)',
        textPrimary: 'var(--color-text-primary)',
        textSecondary: 'var(--color-text-secondary)',
      },
      spacing: {
        margin: '1rem',
        'space-lg': '1.25rem',
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        gutter: '0.75rem',
        'space-xl': '2rem',
        'space-md': '0.75rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        headline: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        label: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],

        // HTML Gabarito Font Families
        'display-xl': ['Inter', 'sans-serif'],
        'stat-mono-md': ['"JetBrains Mono"', 'monospace'],
        'benchmark-label': ['"JetBrains Mono"', 'monospace'],
        'card-header': ['Inter', 'sans-serif'],
        'screen-title': ['Inter', 'sans-serif'],
        'body-md': ['Inter', 'sans-serif'],
        'stat-display': ['"JetBrains Mono"', 'monospace'],
        'hud-timer': ['"JetBrains Mono"', 'monospace'],
        'body-sm': ['Inter', 'sans-serif'],
        chakra: ['"Chakra Petch"', 'sans-serif'],
        oxanium: ['"Oxanium"', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'stat-mono-md': ['14px', { lineHeight: '18px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'benchmark-label': ['11px', { lineHeight: '14px', fontWeight: '400' }],
        'card-header': ['13px', { lineHeight: '18px', letterSpacing: '0.02em', fontWeight: '600' }],
        'screen-title': ['18px', { lineHeight: '24px', letterSpacing: '0.05em', fontWeight: '700' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'stat-display': ['32px', { lineHeight: '36px', letterSpacing: '-0.03em', fontWeight: '700' }],
        'hud-timer': ['18px', { lineHeight: '22px', fontWeight: '700' }],
        'body-sm': ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },
      borderRadius: {
        none: '0px',
        sm: 'var(--radius-sm)',
        DEFAULT: '0.125rem',
        md: 'var(--radius-md)',
        lg: '0.25rem',
        xl: '0.5rem',
        '2xl': 'var(--radius-2xl)',
        full: '9999px',
      },
      boxShadow: {
        'cyan-glow': '0 0 15px var(--color-cyan-glow-strong)',
        'cyan-chip': '0 0 12px var(--color-cyan-glow)',
        'cyan-modal': '0 0 40px var(--color-cyan-glow)',
      },
    },
  },
  plugins: [],
};

export default config;
