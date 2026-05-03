import { TimelineWithLazyLoad } from 'tinytsdk/react';
import { PageTitle, PageSection, LiveExample, Divider } from '../components.js';

export function PageTimelineWithLazyLoad() {
  return (
    <div>
      <PageTitle
        title="Timeline — Lazy Loading"
        badge="component"
        desc="Timeline with lazy loading support. Scroll to load more data from earlier time periods."
      />

      <PageSection title="Lazy loading timeline">
        <LiveExample
          title="Single metric with lazy load"
          description="Scroll to load more historical data. Indicator shows when loading."
          code={`<TimelineWithLazyLoad metrics={['cpu']} />`}
          center
        >
          <TimelineWithLazyLoad metrics={['cpu']} style={{ maxWidth: 560 }} />
        </LiveExample>

        <LiveExample
          title="Multiple metrics"
          description="Display all metrics with lazy loading support."
          code={`<TimelineWithLazyLoad metrics={['cpu', 'mem', 'disk']} />`}
          center
        >
          <TimelineWithLazyLoad metrics={['cpu', 'mem', 'disk']} style={{ maxWidth: 560 }} />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Aggregation control">
        <LiveExample
          title="With aggregation selector"
          description="Switch between avg, min, max aggregation types."
          code={`<TimelineWithLazyLoad metrics={['cpu', 'mem']} />`}
          center
        >
          <TimelineWithLazyLoad metrics={['cpu', 'mem']} style={{ maxWidth: 560 }} />
        </LiveExample>
      </PageSection>

      <Divider />

      <PageSection title="Tips">
        <div style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.8 }}>
          <p>💡 Scroll down to load more historical data from earlier time periods.</p>
          <p>💡 The loading indicator appears while fetching data from the server.</p>
          <p>💡 Each ring level (L1/L2/L3) has different resolution and retention.</p>
        </div>
      </PageSection>
    </div>
  );
}
