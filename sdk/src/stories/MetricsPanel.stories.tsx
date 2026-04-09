import type { Meta, StoryObj } from '@storybook/react';
import { MetricsPanel } from '../react/components/MetricsPanel/index.js';
import { MockTinyTrackProvider } from './MockProvider.js';

const wrap = (children: React.ReactNode) => (
  <div style={{ padding: 16 }}>{children}</div>
);

const meta: Meta<typeof MetricsPanel> = {
  title: 'Components/MetricsPanel',
  component: MetricsPanel,
  decorators: [
    (Story) => (
      <MockTinyTrackProvider>
        {wrap(<Story />)}
      </MockTinyTrackProvider>
    ),
  ],
  parameters: { layout: 'centered' },
  argTypes: {
    size: { control: 'radio', options: ['s', 'm', 'l'] },
    columns: { control: 'radio', options: [1, 2] },
    metrics: { control: 'check', options: ['cpu', 'mem', 'net', 'disk', 'load', 'proc'] },
  },
};
export default meta;
type Story = StoryObj<typeof MetricsPanel>;

export const Default: Story = {};
export const Small: Story = { args: { size: 's' } };
export const Large: Story = { args: { size: 'l' } };

export const TwoColumns: Story = {
  name: 'columns={2}',
  args: { columns: 2 },
};

export const TwoColumnsLarge: Story = {
  name: 'columns={2} size="l"',
  args: { columns: 2, size: 'l' },
};

export const CustomOrder: Story = {
  name: 'Custom metric order',
  args: { metrics: ['load', 'cpu', 'net', 'mem', 'disk'] },
};

export const LoadOnly: Story = {
  name: 'Load avg arrows',
  args: { metrics: ['load'] },
};

export const CpuMemOnly: Story = {
  args: { metrics: ['cpu', 'mem'] },
  name: 'CPU + Mem only',
};

export const HighLoad: Story = {
  name: 'High load (rising arrows)',
  decorators: [
    (Story) => (
      <MockTinyTrackProvider overrides={{ cpu: 9200, mem: 8800, load1: 1200, load5: 800, load15: 400 }}>
        {wrap(<Story />)}
      </MockTinyTrackProvider>
    ),
  ],
};

export const FallingLoad: Story = {
  name: 'Falling load (green arrows)',
  decorators: [
    (Story) => (
      <MockTinyTrackProvider overrides={{ load1: 100, load5: 400, load15: 900 }}>
        {wrap(<Story />)}
      </MockTinyTrackProvider>
    ),
  ],
  args: { metrics: ['load'] },
};

export const Static: Story = {
  decorators: [
    (Story) => (
      <MockTinyTrackProvider animate={false} overrides={{ cpu: 2500, mem: 4000 }}>
        {wrap(<Story />)}
      </MockTinyTrackProvider>
    ),
  ],
};
