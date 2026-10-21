import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base Canvas & Surfaces
        canvas: '#0B0E0F',
        surface: '#111618',
        'surface-card': '#0E1214',
        'surface-active': '#13191B',

        // Structural Carbon Borders
        'border-subtle': '#1F2629',
        'border-card': '#1B2226',
        'border-muted': '#232B30',

        // Primary Tactical Accent (Neon Cyan-Green)
        accent: '#00FFA3',
        primary: '#00FFA3',
        'primary-glow': 'rgba(0, 255, 163, 0.14)',

        // Faction Colors: Counter-Terrorist (Cobalt)
        ct: '#2979FF',
        'ct-hover': '#3B82F6',
        'ct-bg': '#0F1E2E',
        'ct-border': '#1E3A5F',

        // Faction Colors: Terrorist (Safety Amber)
        tr: '#EAB308',
        'tr-hover': '#FACC15',
        'tr-bg': '#26160A',
        'tr-border': '#3D2411',

        // Typography Hierarchy (calibrated for WCAG AA ≥ 4.5:1 on dark surfaces)
        'text-primary': '#FFFFFF',
        'text-secondary': '#A1A1AA',
        'text-muted': '#9BA8B0',
        'text-dim': '#4B5563',

        // Tactical Status Feedback
        'status-win': '#00FFA3',
        'status-loss': '#EF4444',
        'status-tie': '#EAB308',

        // Legacy CamelCase aliases for backwards compatibility
        borderSubtle: '#1F2629',
        borderCard: '#1B2226',
        textPrimary: '#FFFFFF',
        textSecondary: '#A1A1AA',
      },
      borderRadius: {
        none: '0px',
        sm: '2px',
        DEFAULT: '2px',
        md: '2px',
        lg: '2px',
        xl: '2px',
        '2xl': '2px',
      },
    },
  },
  plugins: [],
};

export default config;
