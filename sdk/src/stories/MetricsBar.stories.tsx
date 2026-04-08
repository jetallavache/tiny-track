import type { Meta, StoryObj } from '@storybook/react';
import { MetricsBar } from '../react/components/MetricsBar/index.js';
import { MockTinyTrackProvider } from './MockProvider.js';

const meta: Meta<typeof MetricsBar> = {
  title: 'Components/MetricsBar',
  component: MetricsBar,
  decorators: [
    (Story) => (
      <MockTinyTrackProvider>
        <Story />
      </MockTinyTrackProvider>
    ),
  ],
  parameters: { layout: 'padded' },
  argTypes: {
    showAlerts: { control: 'boolean' },
    size: { control: 'radio', options: ['s', 'm', 'l'] },
    metrics: {
      control: 'check',
      options: ['cpu', 'mem', 'net', 'disk', 'load', 'proc'],
    },
  },
};
export default meta;
type Story = StoryObj<typeof MetricsBar>;

export const Default: Story = {};

export const Small: Story = { args: { size: 's' } };
export const Large: Story = { args: { size: 'l' } };

export const Compact: Story = { args: { size: 'm' }, name: 'Compact (wrapping)' };

export const CpuMemOnly: Story = {
  args: { metrics: ['cpu', 'mem'] },
  name: 'CPU + Mem only',
};

export const HighLoad: Story = {
  decorators: [
    (Story) => (
      <MockTinyTrackProvider overrides={{ cpu: 9200, mem: 8800, load1: 1200 }}>
        <Story />
      </MockTinyTrackProvider>
    ),
  ],
};

export const Static: Story = {
  decorators: [
    (Story) => (
      <MockTinyTrackProvider animate={false} overrides={{ cpu: 3500, mem: 5500 }}>
        <Story />
      </MockTinyTrackProvider>
    ),
  ],
};

export const Mobile: Story = {
  name: 'Mobile (compact auto)',
  parameters: { viewport: { defaultViewport: 'mobile' } },
  args: { style: { width: '100%' } },
};
