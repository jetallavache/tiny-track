import type { Meta, StoryObj } from '@storybook/react';
import { SystemLoad } from '../react/components/SystemLoad/index.js';
import { MockTinyTrackProvider } from './MockProvider.js';

const meta: Meta<typeof SystemLoad> = {
  title: 'Components/SystemLoad',
  component: SystemLoad,
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
  },
};
export default meta;
type Story = StoryObj<typeof SystemLoad>;

export const Default: Story = {};
export const Small: Story = { args: { size: 's' } };
export const Large: Story = { args: { size: 'l' } };

export const HighLoad: Story = {
  decorators: [
    (Story) => (
      <MockTinyTrackProvider overrides={{ load1: 1800, load5: 1500, load15: 1200, nrRunning: 24, nrTotal: 512 }}>
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
      <MockTinyTrackProvider animate={false} overrides={{ load1: 10, load5: 12, load15: 15, nrRunning: 1, nrTotal: 200 }}>
        <div style={{ padding: 24 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
};
