import type { Meta, StoryObj } from '@storybook/react';
import { MetricsPanel } from '../react/MetricsPanel.js';
import { MockTinyTrackProvider } from './MockProvider.js';

const meta: Meta<typeof MetricsPanel> = {
  title: 'Components/MetricsPanel',
  component: MetricsPanel,
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
};
export default meta;
type Story = StoryObj<typeof MetricsPanel>;

export const Default: Story = {};

export const HighLoad: Story = {
  decorators: [
    (Story) => (
      <MockTinyTrackProvider overrides={{ cpu: 9200, mem: 8800, load1: 1200 }}>
        <div style={{ padding: 16 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
};

export const Static: Story = {
  decorators: [
    (Story) => (
      <MockTinyTrackProvider animate={false} overrides={{ cpu: 2500, mem: 4000 }}>
        <div style={{ padding: 16 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
};
