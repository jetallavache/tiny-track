import type { Meta, StoryObj } from '@storybook/react';
import { MetricsPanel } from '../react/components/MetricsPanel/index.js';
import { MockTinyTrackProvider, mockData } from './MockProvider.js';

const meta: Meta<typeof MetricsPanel> = {
  title: 'Components/MetricsPanel',
  component: MetricsPanel,
  decorators: [
    (Story) => (
      <MockTinyTrackProvider>
        <div style={{ padding: 24 }}>
          <Story />
        </div>
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
  name: 'Two columns',
  args: { columns: 2 },
};

export const TwoColumnsLarge: Story = {
  name: 'Two columns — large',
  args: { columns: 2, size: 'l', metrics: ['cpu', 'mem', 'net', 'disk', 'load'] },
};

export const CustomOrder: Story = {
  name: 'Custom metric order',
  args: { metrics: ['load', 'cpu', 'net'] },
};

export const HighLoad: Story = {
  name: 'High load',
  decorators: [
    (Story) => (
      <MockTinyTrackProvider overrides={mockData.highLoad}>
        <div style={{ padding: 24 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
};

export const Idle: Story = {
  decorators: [
    (Story) => (
      <MockTinyTrackProvider animate={false} overrides={mockData.idle}>
        <div style={{ padding: 24 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
};

export const DiskFull: Story = {
  name: 'Disk full',
  decorators: [
    (Story) => (
      <MockTinyTrackProvider animate={false} overrides={mockData.diskFull}>
        <div style={{ padding: 24 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
};

export const Mobile: Story = {
  name: 'Mobile viewport',
  parameters: { viewport: { defaultViewport: 'mobile' } },
  args: { size: 's', style: { width: '100%' } },
};
