import type { Meta, StoryObj } from '@storybook/react';
import { TimeSeriesChart } from '../react/dashboard/TimeSeriesChart.js';
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
    metric: { control: 'select', options: ['cpu', 'mem', 'load', 'net', 'disk'] },
    height: { control: { type: 'range', min: 60, max: 300, step: 20 } },
  },
};
export default meta;
type Story = StoryObj<typeof TimeSeriesChart>;

export const CPU: Story = { args: { metric: 'cpu', level: RING_L1, height: 160 } };
export const Memory: Story = { args: { metric: 'mem', level: RING_L1, height: 160 } };
export const Network: Story = { args: { metric: 'net', level: RING_L1, height: 160 } };
export const Load: Story = { args: { metric: 'load', level: RING_L1, height: 160 } };
export const Disk: Story = { args: { metric: 'disk', level: RING_L1, height: 160 } };

export const DiskL2: Story = {
  name: 'Disk (L2 — 24h)',
  args: { metric: 'disk', level: RING_L2, height: 120, maxSamples: 120 },
};

export const AllMetrics: Story = {
  name: 'All metrics',
  render: () => (
    <MockTinyTrackProvider historySize={120}>
      <div style={{ width: 480, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(['cpu', 'mem', 'load', 'net', 'disk'] as const).map((m) => (
          <TimeSeriesChart key={m} metric={m} level={RING_L1} height={80} style={{ width: '100%' }} />
        ))}
      </div>
    </MockTinyTrackProvider>
  ),
};
