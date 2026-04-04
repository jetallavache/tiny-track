import { useState } from 'react';
import { useTheme, ThemeProvider, MetricsBar, THEMES } from 'tinytsdk/react';
import type { ThemePreset } from 'tinytsdk/react';
import { PageTitle, PageSection, CodeBlock, Divider, PropsTable } from '../components.js';

const PRESETS: ThemePreset[] = ['terminal', 'dark', 'light', 'material', 'dracula', 'heroui'];

const PRESET_DESC: Record<ThemePreset, string> = {
  terminal: 'Classic TUI — monospace font, green-on-dark, minimal chrome',
  dark: 'Modern dark — Catppuccin Mocha palette, Inter font',
  light: 'Clean light — Tailwind slate colors, system font',
  material: 'Material Design 3 — Google tones, Roboto font, large radius',
  dracula: 'Dracula — classic purple/pink palette, Fira Code',
  heroui: 'HeroUI-inspired — deep navy, violet accents, glow effects, smooth transitions',
};

export function Themes() {
  const t = useTheme();
  const [active, setActive] = useState<ThemePreset>('terminal');

  return (
    <div>
      <PageTitle
        title="Themes"
        desc="TinyTrack SDK ships with 6 built-in themes and a fully customisable token system. Wrap your app in ThemeProvider to apply a theme globally, or pass a theme prop to individual components."
      />

      <PageSection title="ThemeProvider">
        <CodeBlock
          code={`import { ThemeProvider } from 'tinytsdk/react';

// Apply globally
<ThemeProvider preset="heroui">
  <App />
</ThemeProvider>

// Override individual tokens
<ThemeProvider preset="dark" theme={{ radius: 2, font: '"Fira Code", monospace' }}>
  <App />
</ThemeProvider>`}
        />
      </PageSection>

      <Divider />

      <PageSection title="Built-in presets">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setActive(p)}
              style={{
                fontSize: 12,
                padding: '5px 14px',
                border: `1px solid ${active === p ? t.cpu : t.border}`,
                borderRadius: 99,
                cursor: 'pointer',
                fontFamily: t.font,
                background: active === p ? t.cpu + '22' : t.surface,
                color: active === p ? t.cpu : t.muted,
                transition: t.transition,
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Preview in selected theme */}
        <ThemeProvider preset={active}>
          <PreviewCard preset={active} />
        </ThemeProvider>
      </PageSection>

      <Divider />

      <PageSection title="Theme tokens">
        <PropsTable
          rows={[
            { name: 'bg', type: 'string', description: 'Component background color' },
            { name: 'surface', type: 'string', description: 'Elevated surface (inner panels, code blocks)' },
            { name: 'border', type: 'string', description: 'Border color' },
            { name: 'divider', type: 'string', description: 'Subtle separator line color' },
            { name: 'text', type: 'string', description: 'Primary text color' },
            { name: 'muted', type: 'string', description: 'Secondary / label text color' },
            { name: 'faint', type: 'string', description: 'Disabled / placeholder text color' },
            { name: 'cpu', type: 'string', description: 'CPU metric accent color' },
            { name: 'mem', type: 'string', description: 'Memory metric accent color' },
            { name: 'net', type: 'string', description: 'Network metric accent color' },
            { name: 'disk', type: 'string', description: 'Disk metric accent color' },
            { name: 'load', type: 'string', description: 'Load average accent color' },
            { name: 'ok', type: 'string', description: 'Success / connected status color' },
            { name: 'warn', type: 'string', description: 'Warning alert color' },
            { name: 'crit', type: 'string', description: 'Critical alert color' },
            { name: 'btnBg', type: 'string', description: 'Button / select background' },
            { name: 'btnText', type: 'string', description: 'Button text color' },
            { name: 'font', type: 'string', description: 'CSS font-family string' },
            { name: 'radius', type: 'number', description: 'Border radius in px' },
            { name: 'glow', type: 'string?', description: 'Optional CSS box-shadow for accent glow' },
            { name: 'transition', type: 'string?', description: 'CSS transition for animated elements' },
          ]}
        />
      </PageSection>

      <Divider />

      <PageSection title="Custom theme example">
        <CodeBlock
          code={`import { ThemeProvider } from 'tinytsdk/react';
import type { TtTheme } from 'tinytsdk/react';

const myTheme: Partial<TtTheme> = {
  bg:      '#0a0a0a',
  surface: '#111111',
  border:  '#222222',
  cpu:     '#00ff88',
  mem:     '#0088ff',
  font:    '"Berkeley Mono", monospace',
  radius:  2,
};

<ThemeProvider preset="terminal" theme={myTheme}>
  <App />
</ThemeProvider>`}
        />
      </PageSection>

      <PageSection title="Per-component theme override">
        <CodeBlock
          code={`// Override theme on a single component without ThemeProvider
<Dashboard theme={{ bg: '#000', cpu: '#ff0', radius: 0 }} />

// Mix: global theme + local override
<ThemeProvider preset="dark">
  <MetricsBar theme={{ font: '"Fira Code", monospace' }} />
</ThemeProvider>`}
        />
      </PageSection>
    </div>
  );
}

function PreviewCard({ preset }: { preset: ThemePreset }) {
  const t = useTheme();
  const theme = THEMES[preset];
  return (
    <div
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        padding: 20,
        boxShadow: t.glow,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: t.font }}>{preset}</span>
        <span style={{ fontSize: 11, color: t.muted, fontFamily: t.font }}>{PRESET_DESC[preset]}</span>
      </div>
      {/* Color swatches */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['cpu', 'mem', 'net', 'disk', 'load', 'ok', 'warn', 'crit'] as const).map((k) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: t.radius,
                background: theme[k],
                border: `1px solid ${t.border}`,
              }}
            />
            <span style={{ fontSize: 9, color: t.faint, fontFamily: 'monospace' }}>{k}</span>
          </div>
        ))}
      </div>
      {/* Live MetricsBar preview */}
      <MetricsBar />
    </div>
  );
}
