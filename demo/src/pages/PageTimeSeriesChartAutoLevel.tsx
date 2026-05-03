import { TimeSeriesChartWithAutoLevel, TimeSeriesChartWithLevelSelector } from 'tinytsdk/react';
import { PageTitle, PageSection, LiveExample, Divider } from '../components.js';

export function PageTimeSeriesChartAutoLevel() {
  return (
    <div>
      <PageTitle
        title="TimeSeriesChart — Auto Level Selection"
        badge="component"
        desc="Automatically select ring buffer level based on time range. L1 for < 1h, L2 for < 24h, L3 for longer."
      />

      <PageSection title="Auto-level selection">
        <LiveExample
          title="Auto-select L1 (< 1h)"
          description="Short time range automatically uses L1 (1s resolution)."
          code={`<TimeSeriesChartWithAutoLevel timeRange={1800} metrics={['cpu']} />`}
          center
        >
          <TimeSeriesChartWithAutoLevel timeRange={1800} metrics={['cpu']} style={{ maxWidth: 560 }} />
        </LiveExample>

        <LiveExample
          title="Auto-select L2 (< 24h)"
          description="Medium time range uses L2 (1min resolution)."
          code={`<TimeSeriesChartWithAutoLevel timeRange={43200} metrics={['cpu', 'mem']} />`}
          center
        >
          <TimeSeriesChartWithAutoLevel timeRange={43200} metrics={['cpu', 'mem']} style={{ maxWidth: 560 }} />
        </LiveExample>

        <LiveExample
          title="Auto-select L3 (>= 24h)"
          description="Long time range uses L3 (1h resolution)."
          code={`<TimeSeriesChartWithAutoLevel timeRange={604800} metrics={['cpu']} />`}
          center
        >
          <TimeSeriesChartWithAutoLevel timeRange={604800} metrics={['cpu']} style={{ maxWidth: 560 }} />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Manual level selector">
        <LiveExample
          title="Switch levels manually"
          description="Buttons to switch between L1, L2, L3 at runtime."
          code={`<TimeSeriesChartWithLevelSelector metrics={['cpu', 'mem']} />`}
          center
        >
          <TimeSeriesChartWithLevelSelector metrics={['cpu', 'mem']} style={{ maxWidth: 560 }} />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Multiple metrics">
        <LiveExample
          title="All metrics with auto-level"
          description="Display all 5 metrics with automatic level selection."
          code={`<TimeSeriesChartWithAutoLevel timeRange={3600} metrics={['cpu', 'mem', 'disk', 'load', 'net']} />`}
          center
        >
          <TimeSeriesChartWithAutoLevel 
            timeRange={3600} 
            metrics={['cpu', 'mem', 'disk', 'load', 'net']} 
            style={{ maxWidth: 560 }} 
          />
        </LiveExample>
      </PageSection>
    </div>
  );
}
