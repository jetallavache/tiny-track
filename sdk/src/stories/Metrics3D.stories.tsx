import type { Meta, StoryObj } from '@storybook/react';
import { Metrics3D } from '../react/components/Metrics3D/index.js';
import { MockTinyTrackProvider } from './MockProvider.js';

const meta: Meta<typeof Metrics3D> = {
  title: 'Components/Metrics3D',
  component: Metrics3D,
  decorators: [
    (Story) => (
      <MockTinyTrackProvider>
        <div style={{ padding: 16 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
  parameters: { layout: 'centered' },
  argTypes: {
    metrics: { control: 'check', options: ['cpu', 'mem', 'disk', 'load', 'net'] },
    historyDepth: { control: { type: 'range', min: 10, max: 80, step: 5 } },
    size: { control: 'radio', options: ['s', 'm', 'l'] },
  },
};
export default meta;
type Story = StoryObj<typeof Metrics3D>;

export const Default: Story = {
  args: { metrics: ['cpu', 'mem', 'disk'] },
};

export const AllMetrics: Story = {
  name: 'All metrics',
  args: { metrics: ['cpu', 'mem', 'disk', 'load', 'net'] },
};

export const Large: Story = {
  args: { metrics: ['cpu', 'mem', 'disk'], size: 'l' },
};

export const DeepHistory: Story = {
  name: 'Deep history (60 steps)',
  args: { metrics: ['cpu', 'mem'], historyDepth: 60 },
};

export const HighLoad: Story = {
  name: 'High load',
  decorators: [
    (Story) => (
      <MockTinyTrackProvider overrides={{ cpu: 9200, mem: 8800, load1: 1800, load5: 1500, load15: 1200 }}>
        <div style={{ padding: 16 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
  args: { metrics: ['cpu', 'mem', 'disk', 'load'] },
};

export const Paused: Story = {
  name: 'Paused (static data)',
  decorators: [
    (Story) => (
      <MockTinyTrackProvider animate={false} overrides={{ cpu: 6500, mem: 7200, duUsage: 8100 }}>
        <div style={{ padding: 16 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
  args: { metrics: ['cpu', 'mem', 'disk'] },
};
