import { useState } from 'react';
import { ControlPanel, RingBufferStatus, SystemInfoRow, useMetrics } from 'tinytsdk/react';
import { PageTitle, PageSection, LiveExample, Divider } from '../components.js';

export function PageDashboardComponents() {
  const [streaming, setStreaming] = useState(true);
  const [interval, setInterval] = useState(1000);
  const [aggregation, setAggregation] = useState<'avg' | 'min' | 'max'>('avg');
  const metrics = useMetrics();

  return (
    <div>
      <PageTitle
        title="Dashboard Components"
        badge="component"
        desc="Control panel, system info, and ring buffer status components for admin dashboards."
      />

      <PageSection title="Control Panel">
        <LiveExample
          title="Start/Stop, Interval, Aggregation"
          description="Manage streaming, collection interval, and aggregation type."
          code={`<ControlPanel
  streaming={streaming}
  onStreamingChange={setStreaming}
  interval={interval}
  onIntervalChange={setInterval}
  aggregation={aggregation}
  onAggregationChange={setAggregation}
/>`}
          center
        >
          <ControlPanel
            streaming={streaming}
            onStreamingChange={setStreaming}
            interval={interval}
            onIntervalChange={setInterval}
            aggregation={aggregation}
            onAggregationChange={setAggregation}
          />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="System Info Row">
        <LiveExample
          title="Hostname, OS, Uptime, Interval"
          description="Display system information from sysinfo packet."
          code={`<SystemInfoRow sysinfo={sysinfo} />`}
          center
        >
          <SystemInfoRow sysinfo={metrics?.sysinfo} />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Ring Buffer Status">
        <LiveExample
          title="L1, L2, L3 Fill Progress"
          description="Visualize ring buffer capacity and fill level."
          code={`<RingBufferStatus stats={stats} />`}
          center
        >
          <RingBufferStatus stats={metrics?.stats} />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Combined Layout">
        <LiveExample
          title="All components together"
          description="Typical admin dashboard layout with all components."
          code={`<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
  <ControlPanel streaming={streaming} onStreamingChange={setStreaming} />
  <SystemInfoRow sysinfo={sysinfo} />
  <RingBufferStatus stats={stats} />
</div>`}
          center
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ControlPanel streaming={streaming} onStreamingChange={setStreaming} />
            <SystemInfoRow sysinfo={metrics?.sysinfo} />
            <RingBufferStatus stats={metrics?.stats} />
          </div>
        </LiveExample>
      </PageSection>
    </div>
  );
}
