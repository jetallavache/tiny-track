import type { Meta, StoryObj } from '@storybook/react';
import { Timeline } from '../react/dashboard/Timeline.js';
import { MockTinyTrackProvider } from './MockProvider.js';

const meta: Meta<typeof Timeline> = {
  title: 'Components/Timeline',
  component: Timeline,
  decorators: [
    (Story) => (
      <MockTinyTrackProvider historySize={200}>
        <div style={{ padding: 16, width: 800 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
  parameters: { layout: 'centered' },
  argTypes: {
    metric: { control: 'select', options: ['cpu', 'mem', 'load', 'net', 'disk'] },
    rowHeight: { control: { type: 'range', min: 24, max: 80, step: 4 } },
  },
};
export default meta;
type Story = StoryObj<typeof Timeline>;

export const CPU: Story = { args: { metric: 'cpu' } };
export const Memory: Story = { args: { metric: 'mem' } };
export const Network: Story = { args: { metric: 'net' } };
export const Disk: Story = { args: { metric: 'disk' } };
export const Load: Story = { args: { metric: 'load' } };

export const TallRows: Story = {
  name: 'Tall rows',
  args: { metric: 'cpu', rowHeight: 64 },
};
