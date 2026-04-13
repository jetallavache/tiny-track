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
    metrics: { control: 'check', options: ['cpu', 'mem', 'net', 'disk', 'load', 'proc'] },
    sysInfo: { control: 'check', options: ['uptime', 'hostname', 'os-type', 'ringbufInfo'] },
  },
};
export default meta;
type Story = StoryObj<typeof MetricsBar>;

export const Default: Story = {};

export const Small: Story = { args: { size: 's' } };
export const Large: Story = { args: { size: 'l', style: { width: '100%' } } };

export const WithSysInfo: Story = {
  name: 'With sysInfo badges',
  args: { sysInfo: ['hostname', 'os-type', 'uptime'] },
};

export const SysInfoAll: Story = {
  name: 'sysInfo — all fields',
  args: {
    metrics: ['cpu', 'mem', 'disk'],
    sysInfo: ['hostname', 'os-type', 'uptime', 'ringbufInfo'],
    style: { width: '100%' },
  },
};

export const CustomOrder: Story = {
  name: 'Custom metric order',
  args: { metrics: ['disk', 'load', 'cpu', 'net', 'mem'] },
};

export const CpuMemOnly: Story = {
  args: { metrics: ['cpu', 'mem'] },
  name: 'CPU + Mem only',
};

export const AlertsOnly: Story = {
  name: 'Alert lamps only',
  args: { metrics: [], size: 'l', style: { width: '100%' } },
};

export const AlertsPopup: Story = {
  name: 'Alert lamps — popup (high load)',
  args: { metrics: [], size: 'l', style: { width: '100%' } },
  decorators: [
    (Story) => (
      <MockTinyTrackProvider overrides={{ cpu: 9200, mem: 9100, load1: 1800, load15: 400 }}>
        <div style={{ paddingBottom: 160 }}>
          <Story />
          <p style={{ marginTop: 8, fontSize: 11, opacity: 0.5 }}>↑ Click the alert lamps to open the popup</p>
        </div>
      </MockTinyTrackProvider>
    ),
  ],
};

export const MetricPopups: Story = {
  name: 'Metric badge popups',
  args: { size: 'l', style: { width: '100%' } },
  decorators: [
    (Story) => (
      <MockTinyTrackProvider>
        <div style={{ paddingBottom: 160 }}>
          <Story />
          <p style={{ marginTop: 8, fontSize: 11, opacity: 0.5 }}>↑ Click any badge to open its detail popup</p>
        </div>
      </MockTinyTrackProvider>
    ),
  ],
};

export const SysInfoPopups: Story = {
  name: 'sysInfo badge popups',
  args: { metrics: [], sysInfo: ['hostname', 'os-type', 'uptime', 'ringbufInfo'], size: 'l' },
  decorators: [
    (Story) => (
      <MockTinyTrackProvider>
        <div style={{ paddingBottom: 180 }}>
          <Story />
          <p style={{ marginTop: 8, fontSize: 11, opacity: 0.5 }}>↑ Click any sysInfo badge to see details</p>
        </div>
      </MockTinyTrackProvider>
    ),
  ],
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

export const Mobile: Story = {
  name: 'Mobile (compact auto)',
  parameters: { viewport: { defaultViewport: 'mobile' } },
  args: { style: { width: '100%' } },
};
