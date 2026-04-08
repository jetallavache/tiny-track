import { createContext, useContext, ReactNode, CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Theme token interface
// ---------------------------------------------------------------------------

export interface TtTheme {
  /** Component background */
  bg: string;
  /** Elevated surface (rows, cards) */
  surface: string;
  /** Border color */
  border: string;
  /** Divider / subtle separator */
  divider: string;
  /** Primary text */
  text: string;
  /** Secondary / muted text */
  muted: string;
  /** Faint / disabled text */
  faint: string;
  /** Accent colors per metric */
  cpu: string;
  mem: string;
  net: string;
  disk: string;
  load: string;
  /** Status colors */
  ok: string;
  warn: string;
  crit: string;
  /** UI chrome */
  btnBg: string;
  btnText: string;
  /** Font family */
  font: string;
  /** Border radius (px) */
  radius: number;
  /** Optional glow/shadow for accents (CSS box-shadow value or empty string) */
  glow?: string;
  /** Transition for animated values */
  transition?: string;
}

// ---------------------------------------------------------------------------
// Built-in presets
// ---------------------------------------------------------------------------

export type ThemePreset = 'terminal' | 'dark' | 'light' | 'material' | 'dracula' | 'heroui';

export const THEMES: Record<ThemePreset, TtTheme> = {
  /** Classic TUI — monospace, green-on-dark */
  terminal: {
    bg: '#111827',
    surface: '#0d1117',
    border: '#374151',
    divider: '#1f2937',
    text: '#f3f4f6',
    muted: '#9ca3af',
    faint: '#4b5563',
    cpu: '#4ade80',
    mem: '#60a5fa',
    net: '#f50be9ff',
    disk: '#fb923c',
    load: '#a78bfa',
    ok: '#22c55e',
    warn: '#f59e0b',
    crit: '#ef4444',
    btnBg: '#1f2937',
    btnText: '#9ca3af',
    font: '"JetBrains Mono", "Fira Code", monospace',
    radius: 4,
  },

  /** Modern dark — VS Code / GitHub Dark style */
  dark: {
    bg: '#1e1e2e',
    surface: '#181825',
    border: '#313244',
    divider: '#2a2a3d',
    text: '#cdd6f4',
    muted: '#a6adc8',
    faint: '#585b70',
    cpu: '#a6e3a1',
    mem: '#89b4fa',
    net: '#fab387',
    disk: '#f9e2af',
    load: '#cba6f7',
    ok: '#a6e3a1',
    warn: '#f9e2af',
    crit: '#f38ba8',
    btnBg: '#313244',
    btnText: '#a6adc8',
    font: '"Inter", "Segoe UI", system-ui, sans-serif',
    radius: 6,
  },

  /** Light — clean minimal */
  light: {
    bg: '#ffffff',
    surface: '#f8fafc',
    border: '#e2e8f0',
    divider: '#f1f5f9',
    text: '#0f172a',
    muted: '#64748b',
    faint: '#cbd5e1',
    cpu: '#16a34a',
    mem: '#2563eb',
    net: '#d97706',
    disk: '#ea580c',
    load: '#7c3aed',
    ok: '#16a34a',
    warn: '#d97706',
    crit: '#dc2626',
    btnBg: '#f1f5f9',
    btnText: '#475569',
    font: '"Inter", "Segoe UI", system-ui, sans-serif',
    radius: 6,
  },

  /** Material — Google Material Design 3 tones */
  material: {
    bg: '#1c1b1f',
    surface: '#141218',
    border: '#49454f',
    divider: '#2b2930',
    text: '#e6e1e5',
    muted: '#cac4d0',
    faint: '#49454f',
    cpu: '#79dd72',
    mem: '#7fcfff',
    net: '#ffb77c',
    disk: '#ffb4ab',
    load: '#d0bcff',
    ok: '#79dd72',
    warn: '#ffb77c',
    crit: '#ffb4ab',
    btnBg: '#2b2930',
    btnText: '#cac4d0',
    font: '"Roboto", "Google Sans", system-ui, sans-serif',
    radius: 12,
  },

  /** Dracula — classic Dracula color scheme */
  dracula: {
    bg: '#282a36',
    surface: '#21222c',
    border: '#44475a',
    divider: '#343746',
    text: '#f8f8f2',
    muted: '#6272a4',
    faint: '#44475a',
    cpu: '#50fa7b',
    mem: '#8be9fd',
    net: '#ffb86c',
    disk: '#ff79c6',
    load: '#bd93f9',
    ok: '#50fa7b',
    warn: '#ffb86c',
    crit: '#ff5555',
    btnBg: '#44475a',
    btnText: '#f8f8f2',
    font: '"Fira Code", "JetBrains Mono", monospace',
    radius: 4,
  },

  /**
   * HeroUI — inspired by NextUI/HeroUI design system.
   * Deep navy background, violet/indigo accents, smooth rounded corners,
   * glassmorphism-style surfaces with subtle borders.
   */
  heroui: {
    bg: '#0f0f1a',
    surface: '#16162a',
    border: '#2d2d52',
    divider: '#1e1e38',
    text: '#e2e8f0',
    muted: '#94a3b8',
    faint: '#334155',
    cpu: '#7c3aed',
    mem: '#06b6d4',
    net: '#10b981',
    disk: '#f59e0b',
    load: '#8b5cf6',
    ok: '#10b981',
    warn: '#f59e0b',
    crit: '#f43f5e',
    btnBg: '#1e1e38',
    btnText: '#c4b5fd',
    font: '"Inter", "SF Pro Display", system-ui, sans-serif',
    radius: 12,
    glow: '0 0 12px rgba(124,58,237,0.25)',
    transition: 'all 0.2s ease',
  },
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext<TtTheme>(THEMES.terminal);

export function useTheme(): TtTheme {
  return useContext(ThemeContext);
}

// ---------------------------------------------------------------------------
// ThemeProvider
// ---------------------------------------------------------------------------

export interface ThemeProviderProps {
  /** Built-in preset name. Default: 'terminal' */
  preset?: ThemePreset;
  /** Override individual tokens on top of the preset */
  theme?: Partial<TtTheme>;
  children: ReactNode;
}

export function ThemeProvider({ preset = 'terminal', theme, children }: ThemeProviderProps) {
  const resolved: TtTheme = theme ? { ...THEMES[preset], ...theme } : THEMES[preset];
  return <ThemeContext.Provider value={resolved}>{children}</ThemeContext.Provider>;
}

// ---------------------------------------------------------------------------
// Helper: build common inline style objects from theme tokens
// ---------------------------------------------------------------------------

export function themeStyles(t: TtTheme) {
  return {
    root: {
      fontFamily: t.font,
      fontSize: 12,
      background: t.bg,
      color: t.text,
      border: `1px solid ${t.border}`,
      borderRadius: t.radius,
      padding: '6px 10px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 4,
      boxSizing: 'border-box' as const,
      boxShadow: t.glow,
      transition: t.transition,
    } satisfies CSSProperties,
    divider: { height: 1, background: t.divider, margin: '2px 0' } satisfies CSSProperties,
    label: { color: t.muted, whiteSpace: 'nowrap' as const } satisfies CSSProperties,
    value: {
      color: t.text,
      whiteSpace: 'nowrap' as const,
      minWidth: 48,
      display: 'inline-block',
    } satisfies CSSProperties,
    numval: {
      color: t.text,
      whiteSpace: 'nowrap' as const,
      minWidth: 52,
      display: 'inline-block',
      fontVariantNumeric: 'tabular-nums',
    } satisfies CSSProperties,
    btn: {
      fontSize: 10,
      padding: '2px 8px',
      background: t.btnBg,
      border: `1px solid ${t.border}`,
      borderRadius: t.radius,
      color: t.btnText,
      cursor: 'pointer',
      transition: t.transition,
      fontFamily: t.font,
    } satisfies CSSProperties,
    select: {
      fontSize: 11,
      background: t.btnBg,
      border: `1px solid ${t.border}`,
      borderRadius: t.radius,
      color: t.text,
      padding: '2px 6px',
      cursor: 'pointer',
      fontFamily: t.font,
    } satisfies CSSProperties,
    badge: (color: string): CSSProperties => ({ fontSize: 10, color, fontWeight: 600, minWidth: 48 }),
    alert: (level: 'warn' | 'crit' | 'ok'): CSSProperties => ({
      fontSize: 10,
      padding: '1px 6px',
      borderRadius: t.radius,
      background: level === 'crit' ? t.crit + '33' : level === 'ok' ? t.ok + '33' : t.warn + '33',
      color: level === 'crit' ? t.crit : level === 'ok' ? t.ok : t.warn,
      whiteSpace: 'nowrap',
    }),
  };
}
