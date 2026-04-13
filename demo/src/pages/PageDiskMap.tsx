import { DiskMap } from 'tinytsdk/react';
import type { DiskSegment } from 'tinytsdk/react';
import { PageTitle, PageSection, LiveExample, PropsTable, Divider } from '../components.js';

const DEMO_SEGMENTS: DiskSegment[] = [
  { label: 'database', bytes: 80_000_000_000 },
  { label: 'uploads',  bytes: 45_000_000_000 },
  { label: 'logs',     bytes: 12_000_000_000 },
];

export function PageDiskMap() {
  return (
    <div>
      <PageTitle
        title="DiskMap"
        badge="component"
        desc="Disk space visualisation with ring (donut) and matrix modes. Reads total/free from live metrics. External segments (e.g. from a REST API) can be passed via the segments prop."
      />

      <PageSection title="Ring mode (default)">
        <LiveExample
          title="Default — ring chart"
          description="Donut chart with used/free breakdown. Segments from external source."
          code={`import { DiskMap } from 'tinytsdk/react';
import type { DiskSegment } from 'tinytsdk/react';

const segments: DiskSegment[] = [
  { label: 'database', bytes: 80_000_000_000 },
  { label: 'uploads',  bytes: 45_000_000_000 },
  { label: 'logs',     bytes: 12_000_000_000 },
];

<DiskMap segments={segments} />`}
          center
        >
          <DiskMap segments={DEMO_SEGMENTS} />
        </LiveExample>

        <LiveExample
          title="No external segments"
          description="Without segments prop — shows only used vs free."
          code={`<DiskMap />`}
          center
        >
          <DiskMap />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Matrix mode">
        <LiveExample
          title='mode="matrix"'
          description="Grid of colored cells. Each cell represents a unit of disk space."
          code={`<DiskMap
  segments={segments}
  mode="matrix"
  matrixCols={18}
  matrixRows={18}
/>`}
          center
        >
          <DiskMap segments={DEMO_SEGMENTS} mode="matrix" matrixCols={22} matrixRows={22} />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Size variants">
        <LiveExample
          title="All sizes"
          description="s / m / l — affects gauge radius, font sizes, cell size."
          code={`<DiskMap segments={segments} size="s" />
<DiskMap segments={segments} size="m" />
<DiskMap segments={segments} size="l" />`}
          center
        >
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <DiskMap segments={DEMO_SEGMENTS} size="s" />
            <DiskMap segments={DEMO_SEGMENTS} size="m" />
            <DiskMap segments={DEMO_SEGMENTS} size="l" />
          </div>
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Custom segment colors">
        <LiveExample
          title="color prop on segments"
          description="Override the default palette per segment."
          code={`<DiskMap
  segments={[
    { label: 'database', bytes: 80_000_000_000, color: '#f97316' },
    { label: 'uploads',  bytes: 45_000_000_000, color: '#a78bfa' },
    { label: 'logs',     bytes: 12_000_000_000, color: '#34d399' },
  ]}
/>`}
          center
        >
          <DiskMap
            segments={[
              { label: 'database', bytes: 80_000_000_000, color: '#f97316' },
              { label: 'uploads',  bytes: 45_000_000_000, color: '#a78bfa' },
              { label: 'logs',     bytes: 12_000_000_000, color: '#34d399' },
            ]}
          />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Theme override">
        <LiveExample
          title="Per-component theme"
          description="Override tokens without a ThemeProvider."
          code={`<DiskMap
  segments={segments}
  theme={{ bg: '#0d1117', border: '#21262d', cpu: '#f97316' }}
/>`}
          center
        >
          <DiskMap
            segments={DEMO_SEGMENTS}
            theme={{ bg: '#0d1117', border: '#21262d', cpu: '#f97316' }}
          />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Props">
        <PropsTable
          rows={[
            { name: 'segments', type: 'DiskSegment[]', default: '[]', description: 'External segments: { label, bytes, color? }. Remainder shown as "other".' },
            { name: 'mode', type: '"ring" | "matrix"', default: '"ring"', description: 'Visualisation mode. When set, hides the toggle button.' },
            { name: 'matrixCols', type: 'number', default: '80', description: 'Matrix columns (matrix mode only)' },
            { name: 'matrixRows', type: 'number', default: '30', description: 'Matrix rows (matrix mode only)' },
            { name: 'size', type: '"s" | "m" | "l"', default: '"m"', description: 'Component size' },
            { name: 'theme', type: 'Partial<TtTheme>', default: '—', description: 'Per-component token overrides' },
            { name: 'className', type: 'string', default: '—', description: 'CSS class name' },
            { name: 'style', type: 'CSSProperties', default: '—', description: 'Inline style override' },
          ]}
        />
      </PageSection>

      <Divider />

      <PageSection title="DiskSegment type">
        <PropsTable
          rows={[
            { name: 'label', type: 'string', default: '—', description: 'Segment name shown in legend' },
            { name: 'bytes', type: 'number', default: '—', description: 'Segment size in bytes' },
            { name: 'color', type: 'string', default: 'theme palette', description: 'Optional hex color override' },
          ]}
        />
      </PageSection>
    </div>
  );
}
