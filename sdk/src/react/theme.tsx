import { createContext, useContext, ReactNode, CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Theme token interface
// ---------------------------------------------------------------------------

export interface TtTheme {
  /** Component background */
  bg: string;
  /** Alternative background (slightly lighter/darker than bg) */
  bgAlt: string;
  /** Deep background (darkest layer, behind bg) */
  bgDeep: string;
  /** Elevated surface (rows, cards) */
  surface: string;
  /** Border color */
  border: string;
  /** Border width in px */
  borderWidth: number;
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
  /** Accent: primary UI highlight (buttons, active states) */
  accent: string;
  /** Accent muted: softer version for backgrounds/borders */
  accentMuted: string;
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
  /** Shadow color (used in box-shadow) */
  shadowColor: string;
  /** Shadow blur radius (px) */
  shadowBlur: number;
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
    bgAlt: '#161f2e',
    bgDeep: '#080d14',
    surface: '#0d1117',
    border: '#374151',
    borderWidth: 1,
    divider: '#1f2937',
    text: '#f3f4f6',
    muted: '#9ca3af',
    faint: '#4b5563',
    cpu: '#4ade80',
    mem: '#60a5fa',
    net: '#f50be9ff',
    disk: '#fb923c',
    load: '#a78bfa',
    accent: '#4ade80',
    accentMuted: '#4ade8022',
    ok: '#22c55e',
    warn: '#f59e0b',
    crit: '#ef4444',
    btnBg: '#1f2937',
    btnText: '#9ca3af',
    font: '"JetBrains Mono", "Fira Code", monospace',
    radius: 4,
    shadowColor: '#000000',
    shadowBlur: 8,
  },

  /** Modern dark — VS Code / GitHub Dark style */
  dark: {
    bg: '#1e1e2e',
    bgAlt: '#232336',
    bgDeep: '#13131f',
    surface: '#181825',
    border: '#313244',
    borderWidth: 1,
    divider: '#2a2a3d',
    text: '#cdd6f4',
    muted: '#a6adc8',
    faint: '#585b70',
    cpu: '#a6e3a1',
    mem: '#89b4fa',
    net: '#fab387',
    disk: '#f9e2af',
    load: '#cba6f7',
    accent: '#89b4fa',
    accentMuted: '#89b4fa22',
    ok: '#a6e3a1',
    warn: '#f9e2af',
    crit: '#f38ba8',
    btnBg: '#313244',
    btnText: '#a6adc8',
    font: '"Inter", "Segoe UI", system-ui, sans-serif',
    radius: 6,
    shadowColor: '#000000',
    shadowBlur: 12,
  },

  /** Light — clean minimal */
  light: {
    bg: '#ffffff',
    bgAlt: '#f8fafc',
    bgDeep: '#f1f5f9',
    surface: '#f8fafc',
    border: '#e2e8f0',
    borderWidth: 1,
    divider: '#f1f5f9',
    text: '#0f172a',
    muted: '#64748b',
    faint: '#cbd5e1',
    cpu: '#16a34a',
    mem: '#2563eb',
    net: '#d97706',
    disk: '#ea580c',
    load: '#7c3aed',
    accent: '#2563eb',
    accentMuted: '#2563eb18',
    ok: '#16a34a',
    warn: '#d97706',
    crit: '#dc2626',
    btnBg: '#f1f5f9',
    btnText: '#475569',
    font: '"Inter", "Segoe UI", system-ui, sans-serif',
    radius: 6,
    shadowColor: '#94a3b8',
    shadowBlur: 8,
  },

  /** Material — Google Material Design 3 tones */
  material: {
    bg: '#1c1b1f',
    bgAlt: '#211f26',
    bgDeep: '#111014',
    surface: '#141218',
    border: '#49454f',
    borderWidth: 1,
    divider: '#2b2930',
    text: '#e6e1e5',
    muted: '#cac4d0',
    faint: '#49454f',
    cpu: '#79dd72',
    mem: '#7fcfff',
    net: '#ffb77c',
    disk: '#ffb4ab',
    load: '#d0bcff',
    accent: '#d0bcff',
    accentMuted: '#d0bcff22',
    ok: '#79dd72',
    warn: '#ffb77c',
    crit: '#ffb4ab',
    btnBg: '#2b2930',
    btnText: '#cac4d0',
    font: '"Roboto", "Google Sans", system-ui, sans-serif',
    radius: 12,
    shadowColor: '#000000',
    shadowBlur: 16,
  },

  /** Dracula — classic Dracula color scheme */
  dracula: {
    bg: '#282a36',
    bgAlt: '#2e3040',
    bgDeep: '#1e2029',
    surface: '#21222c',
    border: '#44475a',
    borderWidth: 1,
    divider: '#343746',
    text: '#f8f8f2',
    muted: '#6272a4',
    faint: '#44475a',
    cpu: '#50fa7b',
    mem: '#8be9fd',
    net: '#ffb86c',
    disk: '#ff79c6',
    load: '#bd93f9',
    accent: '#bd93f9',
    accentMuted: '#bd93f922',
    ok: '#50fa7b',
    warn: '#ffb86c',
    crit: '#ff5555',
    btnBg: '#44475a',
    btnText: '#f8f8f2',
    font: '"Fira Code", "JetBrains Mono", monospace',
    radius: 4,
    shadowColor: '#000000',
    shadowBlur: 10,
  },

  /**
   * HeroUI — inspired by NextUI/HeroUI design system.
   * Deep navy background, violet/indigo accents, smooth rounded corners,
   * glassmorphism-style surfaces with subtle borders.
   */
  heroui: {
    bg: '#0f0f1a',
    bgAlt: '#141428',
    bgDeep: '#08080f',
    surface: '#16162a',
    border: '#2d2d52',
    borderWidth: 1,
    divider: '#1e1e38',
    text: '#e2e8f0',
    muted: '#94a3b8',
    faint: '#334155',
    cpu: '#7c3aed',
    mem: '#06b6d4',
    net: '#10b981',
    disk: '#f59e0b',
    load: '#8b5cf6',
    accent: '#7c3aed',
    accentMuted: '#7c3aed22',
    ok: '#10b981',
    warn: '#f59e0b',
    crit: '#f43f5e',
    btnBg: '#1e1e38',
    btnText: '#c4b5fd',
    font: '"Inter", "SF Pro Display", system-ui, sans-serif',
    radius: 12,
    shadowColor: '#7c3aed',
    shadowBlur: 20,
    glow: '0 0 12px rgba(124,58,237,0.25)',
    transition: 'all 0.2s ease',
  },
};

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

/**
 * Parse a hex color string (#rgb, #rrggbb, #rrggbbaa) into [r, g, b] 0–255.
 * Returns [128, 128, 128] as fallback for invalid input.
 */
function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ];
  }
  if (h.length >= 6) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  return [128, 128, 128];
}

/**
 * Returns a contrasting color for the given hex color.
 * Uses relative luminance to decide between a light and dark contrast color.
 *
 * @param hex - Input color in #rgb or #rrggbb format.
 * @param light - Color to return when input is dark (default: '#f3f4f6').
 * @param dark  - Color to return when input is light (default: '#111827').
 */
export function invertColor(hex: string, light = '#f3f4f6', dark = '#111827'): string {
  const [r, g, b] = parseHex(hex);
  // Relative luminance (WCAG 2.1)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? dark : light;
}

/**
 * Blends a color toward a background color to produce a muted/dim variant.
 * Useful for bar fill characters that should hint at the metric color without
 * competing with the value text.
 *
 * @param hex    - Metric color in #rrggbb format.
 * @param bg     - Background color to blend toward (from theme).
 * @param amount - Blend factor 0–1: 0 = original, 1 = fully bg. Default 0.62.
 */
export function dimColor(hex: string, bg: string, amount = 0.62): string {
  const [r1, g1, b1] = parseHex(hex);
  const [r2, g2, b2] = parseHex(bg);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * amount);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(r1, r2))}${toHex(mix(g1, g2))}${toHex(mix(b1, b2))}`;
}

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
