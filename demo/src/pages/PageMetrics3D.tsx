import { Metrics3D } from 'tinytsdk/react';
import { PageTitle, PageSection, LiveExample, PropsTable, Divider } from '../components.js';

export function PageMetrics3D() {
  return (
    <div>
      <PageTitle
        title="Metrics3D"
        badge="component"
        desc="3D bar chart visualization of metrics over time using three.js. Each metric is a column of bars; the Z-axis represents time. Hover bars for details, pause to freeze, switch camera presets."
      />

      <PageSection title="Default">
        <LiveExample
          title="cpu / mem / disk"
          description="Auto-rotating camera. Hover a bar to see metric value and session min/max. Text summary in the bottom-right corner."
          code={`import { TinyTrackProvider, Metrics3D } from 'tinytsdk/react';

<TinyTrackProvider url="ws://localhost:25015">
  <Metrics3D metrics={['cpu', 'mem', 'disk']} />
</TinyTrackProvider>`}
          center
        >
          <Metrics3D metrics={['cpu', 'mem', 'disk']} />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="All metrics">
        <LiveExample
          title="Five metrics"
          description="cpu / mem / disk / load / net as separate bar columns."
          code={`<Metrics3D metrics={['cpu', 'mem', 'disk', 'load', 'net']} size="l" />`}
          center
        >
          <Metrics3D metrics={['cpu', 'mem', 'disk', 'load', 'net']} size="l" />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Deep history">
        <LiveExample
          title="historyDepth={60}"
          description="Keep 60 time-steps in the scene — longer Z-axis."
          code={`<Metrics3D metrics={['cpu', 'mem']} historyDepth={60} />`}
          center
        >
          <Metrics3D metrics={['cpu', 'mem']} historyDepth={60} />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Size variants">
        <LiveExample
          title="s / m / l"
          description="Size scales the canvas dimensions."
          code={`<Metrics3D size="s" />
<Metrics3D size="m" />
<Metrics3D size="l" />`}
          center
        >
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Metrics3D metrics={['cpu', 'mem']} size="s" />
            <Metrics3D metrics={['cpu', 'mem']} size="m" />
          </div>
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Controls">
        <LiveExample
          title="Camera presets and pause"
          description="Use the toolbar above the canvas: overview (auto-rotate) / close / top-down. Pause freezes animation and data updates."
          code={`// Controls are built into the component — no extra props needed.
// Camera presets: overview (auto-rotate) | close | top
// Pause button: freezes animation and data updates

<Metrics3D metrics={['cpu', 'mem', 'disk']} />`}
          center
        >
          <Metrics3D metrics={['cpu', 'mem', 'disk']} />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Props">
        <PropsTable
          rows={[
            { name: 'metrics', type: 'MetricType[]', default: "['cpu','mem','disk']", description: 'Metrics to visualise as 3D bar columns' },
            { name: 'historyDepth', type: 'number', default: '40', description: 'Number of time-steps to keep in the 3D scene' },
            { name: 'size', type: '"s" | "m" | "l"', default: '"m"', description: 'Component size — affects canvas dimensions' },
            { name: 'theme', type: 'Partial<TtTheme>', default: '—', description: 'Override theme tokens' },
            { name: 'className', type: 'string', default: '—', description: 'CSS class name' },
            { name: 'style', type: 'CSSProperties', default: '—', description: 'Inline style override' },
          ]}
        />
      </PageSection>
    </div>
  );
}
