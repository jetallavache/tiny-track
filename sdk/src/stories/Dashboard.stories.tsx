import type { Meta, StoryObj } from '@storybook/react';
import { Dashboard } from '../react/components/Dashboard/index.js';
import { MockTinyTrackProvider, mockData } from './MockProvider.js';

const meta: Meta<typeof Dashboard> = {
  title: 'Components/Dashboard',
  component: Dashboard,
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
    mode: { control: 'radio', options: ['compact', 'expanded'] },
    size: { control: 'radio', options: ['s', 'm', 'l'] },
    showSysInfo: { control: 'boolean' },
    metrics: { control: 'check', options: ['cpu', 'mem', 'disk', 'load', 'net'] },
  },
};
export default meta;
type Story = StoryObj<typeof Dashboard>;

export const Default: Story = {};

export const Expanded: Story = {
  args: { mode: 'expanded' },
};

export const Small: Story = { args: { size: 's' } };
export const Large: Story = { args: { size: 'l' } };

export const MetricSubset: Story = {
  name: 'CPU + MEM only',
  args: { metrics: ['cpu', 'mem'] },
};

export const NoSysInfo: Story = {
  name: 'Without sysInfo row',
  args: { showSysInfo: false },
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

export const Critical: Story = {
  name: 'Critical state',
  decorators: [
    (Story) => (
      <MockTinyTrackProvider animate={false} overrides={mockData.critical}>
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

export const Mobile: Story = {
  name: 'Mobile viewport',
  parameters: { viewport: { defaultViewport: 'mobile' } },
  args: { size: 's', style: { width: '100%' } },
};
