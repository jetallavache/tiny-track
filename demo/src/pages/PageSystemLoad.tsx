import { SystemLoad } from 'tinytsdk/react';
import { PageTitle, PageSection, LiveExample, CodeBlock, PropsTable, Divider } from '../components.js';

export function PageSystemLoad() {
  return (
    <div>
      <PageTitle
        title="SystemLoad"
        badge="component"
        desc="Semi-circular gauge showing overall system load. Analyses load_1min/5min/15min and process counts to produce a single 0–100 score with color-coded severity and trend indicator (↑/↓)."
      />

      <PageSection title="Size variants">
        <LiveExample
          title="All sizes"
          description="s / m / l — affects gauge radius and font sizes."
          code={`<SystemLoad size="s" />
<SystemLoad size="m" />
<SystemLoad size="l" />`}
          center
        >
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <SystemLoad size="s" />
            <SystemLoad size="m" />
            <SystemLoad size="l" />
          </div>
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Usage">
        <LiveExample
          title="Basic usage"
          description="Wrap in TinyTrackProvider — reads metrics from context automatically."
          code={`import { TinyTrackProvider, SystemLoad } from 'tinytsdk/react';

<TinyTrackProvider url="ws://localhost:25015">
  <SystemLoad />
  <SystemLoad size="l" />
</TinyTrackProvider>`}
          center
        >
          <SystemLoad size="m" />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Score formula">
        <CodeBlock
          code={`// Score = min(100, round((l1*0.5 + l5*0.3 + l15*0.2) / 2 * 100))
// Trend: load1 - load15 > 20 (integer*100 units) → rising, < -20 → falling

// Severity levels:
// 0–19  → Idle     (faint color)
// 20–44 → Normal   (ok color)
// 45–64 → Elevated (warn color)
// 65–84 → High     (crit color)
// 85+   → Critical (crit color)`}
        />
      </PageSection>

      <Divider />

      <PageSection title="Theme override">
        <LiveExample
          title="Per-component theme"
          description="Override individual tokens without a ThemeProvider."
          code={`<SystemLoad
  theme={{ bg: '#0f172a', ok: '#34d399', warn: '#fbbf24', crit: '#f87171' }}
  size="m"
/>`}
          center
        >
          <SystemLoad
            theme={{ bg: '#0f172a', ok: '#34d399', warn: '#fbbf24', crit: '#f87171' }}
            size="m"
          />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Props">
        <PropsTable
          rows={[
            { name: 'size', type: '"s" | "m" | "l"', default: '"m"', description: 'Component size — affects gauge radius, font sizes' },
            { name: 'theme', type: 'Partial<TtTheme>', default: '—', description: 'Per-component token overrides' },
            { name: 'className', type: 'string', default: '—', description: 'CSS class name' },
            { name: 'style', type: 'CSSProperties', default: '—', description: 'Inline style override' },
          ]}
        />
      </PageSection>
    </div>
  );
}
