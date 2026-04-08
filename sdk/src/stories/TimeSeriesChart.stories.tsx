import type { Meta, StoryObj } from '@storybook/react';
import { TimeSeriesChart } from '../react/components/TimeSeriesChart/index.js';
import { MockTinyTrackProvider } from './MockProvider.js';
import { RING_L1, RING_L2 } from '../proto.js';

const meta: Meta<typeof TimeSeriesChart> = {
  title: 'Components/TimeSeriesChart',
  component: TimeSeriesChart,
  decorators: [
    (Story) => (
      <MockTinyTrackProvider historySize={120}>
        <div style={{ width: 480, padding: 16 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
  parameters: { layout: 'centered' },
  argTypes: {
    metrics: { control: 'check', options: ['cpu', 'mem', 'load', 'net', 'disk'] },
    aggregation: { control: 'radio', options: ['avg', 'max', 'min'] },
    size: { control: 'radio', options: ['s', 'm', 'l'] },
    height: { control: { type: 'range', min: 60, max: 300, step: 20 } },
  },
};
export default meta;
type Story = StoryObj<typeof TimeSeriesChart>;

export const CPU: Story = { args: { metrics: ['cpu'], level: RING_L1 } };
export const Memory: Story = { args: { metrics: ['mem'], level: RING_L1 } };
export const Network: Story = { args: { metrics: ['net'], level: RING_L1 } };
export const Load: Story = { args: { metrics: ['load'], level: RING_L1 } };
export const Disk: Story = { args: { metrics: ['disk'], level: RING_L1 } };

export const CpuMem: Story = {
  name: 'CPU + Mem overlay',
  args: { metrics: ['cpu', 'mem'], level: RING_L1 },
};

export const MaxAgg: Story = {
  name: 'CPU max aggregation',
  args: { metrics: ['cpu'], aggregation: 'max', level: RING_L1 },
};

export const Large: Story = { args: { metrics: ['cpu'], size: 'l', level: RING_L1 } };

export const DiskL2: Story = {
  name: 'Disk (L2 — 24h)',
  args: { metrics: ['disk'], level: RING_L2, maxSamples: 120 },
};

export const AllMetrics: Story = {
  name: 'All metrics',
  render: () => (
    <MockTinyTrackProvider historySize={120}>
      <div style={{ width: 480, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(['cpu', 'mem', 'load', 'net', 'disk'] as const).map((m) => (
          <TimeSeriesChart key={m} metrics={[m]} level={RING_L1} height={80} style={{ width: '100%' }} />
        ))}
      </div>
    </MockTinyTrackProvider>
  ),
};

export const MobileView: Story = {
  name: 'Mobile (375px)',
  args: { metrics: ['cpu'], size: 's', style: { width: '100%' } },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  decorators: [
    (Story) => (
      <MockTinyTrackProvider historySize={60}>
        <div style={{ padding: 12 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
};
