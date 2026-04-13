import type { Meta, StoryObj } from '@storybook/react';
import { TimeSeriesChart } from '../react/components/TimeSeriesChart/index.js';
import { MockTinyTrackProvider, mockData } from './MockProvider.js';

const meta: Meta<typeof TimeSeriesChart> = {
  title: 'Components/TimeSeriesChart',
  component: TimeSeriesChart,
  decorators: [
    (Story) => (
      <MockTinyTrackProvider historySize={60}>
        <div style={{ padding: 16, width: 480 }}>
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
    level: { control: { type: 'range', min: 1, max: 3, step: 1 } },
    height: { control: { type: 'range', min: 60, max: 300, step: 20 } },
  },
};
export default meta;
type Story = StoryObj<typeof TimeSeriesChart>;

export const Default: Story = {
  args: { metrics: ['cpu'], style: { width: '100%' } },
};

export const MultiMetric: Story = {
  name: 'Multi-metric overlay',
  args: { metrics: ['cpu', 'mem'], style: { width: '100%' } },
};

export const AllMetrics: Story = {
  name: 'All metrics',
  args: { metrics: ['cpu', 'mem', 'disk', 'load', 'net'], style: { width: '100%' } },
};

export const AggregationMax: Story = {
  name: 'Aggregation — max',
  args: { metrics: ['cpu', 'mem'], aggregation: 'max', style: { width: '100%' } },
};

export const AggregationMin: Story = {
  name: 'Aggregation — min',
  args: { metrics: ['cpu', 'mem'], aggregation: 'min', style: { width: '100%' } },
};

export const Large: Story = {
  args: { metrics: ['cpu'], size: 'l', style: { width: '100%' } },
};

export const HighLoad: Story = {
  name: 'High load',
  decorators: [
    (Story) => (
      <MockTinyTrackProvider historySize={60} overrides={mockData.highLoad}>
        <div style={{ padding: 16, width: 480 }}>
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
