import type { Meta, StoryObj } from '@storybook/react';
import { MetricsBar } from '../react/MetricsBar.js';
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
    showDisk: { control: 'boolean' },
    showNet: { control: 'boolean' },
    compact: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof MetricsBar>;

export const Default: Story = {};

export const Compact: Story = { args: { compact: true } };

export const NoDisk: Story = { args: { showDisk: false } };

export const NoNet: Story = { args: { showNet: false } };

export const MinimalMobile: Story = {
  args: { compact: true, showDisk: false, showNet: false },
  name: 'Minimal (mobile)',
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
