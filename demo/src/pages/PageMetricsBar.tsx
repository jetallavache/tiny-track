import { useTheme, MetricsBar } from 'tinytsdk/react';
import { PageTitle, PageSection, CodeBlock, PropsTable, Preview, Divider } from '../components.js';

export function PageMetricsBar() {
  const t = useTheme();
  return (
    <div>
      <PageTitle
        title="MetricsBar"
        badge="component"
        desc="Compact single-line status bar showing CPU, memory, disk, load, network and process count. Designed to fit in any header or footer."
      />

      <PageSection title="Preview">
        <Preview>
          <MetricsBar />
        </Preview>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: t.muted, fontFamily: t.font }}>Without disk</div>
          <Preview>
            <MetricsBar showDisk={false} />
          </Preview>
          <div style={{ fontSize: 11, color: t.muted, fontFamily: t.font }}>Without net</div>
          <Preview>
            <MetricsBar showNet={false} />
          </Preview>
        </div>
      </PageSection>

      <Divider />

      <PageSection title="Usage">
        <CodeBlock
          code={`import { TinyTrackProvider, MetricsBar } from 'tinytsdk/react';

// In a header
<TinyTrackProvider url="ws://localhost:25015">
  <header>
    <span>My App</span>
    <MetricsBar />
  </header>
</TinyTrackProvider>

// Without disk and net
<MetricsBar showDisk={false} showNet={false} />

// Custom styles
<MetricsBar style={{ fontSize: 13, height: 28 }} />`}
        />
      </PageSection>

      <Divider />

      <PageSection title="Props">
        <PropsTable
          rows={[
            { name: 'showDisk', type: 'boolean', default: 'true', description: 'Show disk usage metric' },
            { name: 'showNet', type: 'boolean', default: 'true', description: 'Show network RX/TX metrics' },
            {
              name: 'compact',
              type: 'boolean',
              default: 'auto',
              description:
                'Force compact (mobile) layout — hides load, net, proc. Auto-detected from window.innerWidth < 640',
            },
            { name: 'className', type: 'string', default: '—', description: 'CSS class name' },
            { name: 'style', type: 'CSSProperties', default: '—', description: 'Inline style override' },
            {
              name: 'theme',
              type: 'Partial<TtTheme>',
              default: '—',
              description: 'Override theme tokens for this component only',
            },
          ]}
        />
      </PageSection>

      <Divider />

      <PageSection title="Responsive notes">
        <p style={{ fontSize: 13, color: t.muted, fontFamily: t.font, lineHeight: 1.7 }}>
          On mobile, consider hiding some metrics to save space. The component uses{' '}
          <code style={{ fontFamily: 'monospace', color: t.cpu }}>inline-flex</code> and{' '}
          <code style={{ fontFamily: 'monospace', color: t.cpu }}>white-space: nowrap</code> — wrap it in an{' '}
          <code style={{ fontFamily: 'monospace', color: t.cpu }}>overflow: hidden</code> container or use{' '}
          <code style={{ fontFamily: 'monospace', color: t.cpu }}>
            showDisk=&#123;false&#125; showNet=&#123;false&#125;
          </code>{' '}
          on small screens.
        </p>
        <CodeBlock
          code={`// Responsive example
const isMobile = window.innerWidth < 640;

<MetricsBar
  showDisk={!isMobile}
  showNet={!isMobile}
/>

// Force compact (mobile) layout
<MetricsBar compact={true} />

// Auto-detect (default behaviour)
<MetricsBar />`}
        />
      </PageSection>
    </div>
  );
}
