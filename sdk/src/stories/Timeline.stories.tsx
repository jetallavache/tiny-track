import type { Meta, StoryObj } from '@storybook/react';
import { Timeline } from '../react/components/Timeline/index.js';
import { MockTinyTrackProvider, mockData } from './MockProvider.js';

const meta: Meta<typeof Timeline> = {
  title: 'Components/Timeline',
  component: Timeline,
  decorators: [
    (Story) => (
      <MockTinyTrackProvider historySize={120}>
        <div style={{ padding: 16, width: 560 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
  parameters: { layout: 'centered' },
  argTypes: {
    metrics: { control: 'check', options: ['cpu', 'mem', 'net', 'disk', 'load'] },
    aggregation: { control: 'radio', options: ['avg', 'max', 'min'] },
    size: { control: 'radio', options: ['s', 'm', 'l'] },
    rowHeight: { control: { type: 'range', min: 24, max: 80, step: 4 } },
  },
};
export default meta;
type Story = StoryObj<typeof Timeline>;

export const Default: Story = {
  args: { metrics: ['cpu'], style: { width: '100%' } },
};

export const MultiMetric: Story = {
  name: 'Multi-metric overlay',
  args: { metrics: ['cpu', 'mem', 'load'], style: { width: '100%' } },
};

export const AllMetrics: Story = {
  name: 'All metrics',
  args: { metrics: ['cpu', 'mem', 'net', 'disk', 'load'], style: { width: '100%' } },
};

export const AggregationMax: Story = {
  name: 'Aggregation — max (controlled)',
  args: { metrics: ['cpu', 'mem'], aggregation: 'max', style: { width: '100%' } },
};

export const TallRows: Story = {
  name: 'Tall rows',
  args: { metrics: ['cpu'], rowHeight: 60, style: { width: '100%' } },
};

export const HighLoad: Story = {
  name: 'High load',
  decorators: [
    (Story) => (
      <MockTinyTrackProvider historySize={120} overrides={mockData.highLoad}>
        <div style={{ padding: 16, width: 560 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
  args: { metrics: ['cpu', 'mem'], style: { width: '100%' } },
};

export const Mobile: Story = {
  name: 'Mobile viewport',
  parameters: { viewport: { defaultViewport: 'mobile' } },
  args: { metrics: ['cpu'], style: { width: '100%' } },
};
