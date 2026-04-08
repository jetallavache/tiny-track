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

export const Default: Story = { args: { metrics: ['cpu', 'mem', 'disk'] } };
export const AllMetrics: Story = { args: { metrics: ['cpu', 'mem', 'disk', 'load', 'net'] }, name: 'All metrics' };
export const Large: Story = { args: { metrics: ['cpu', 'mem', 'disk'], size: 'l' } };
export const DeepHistory: Story = { args: { metrics: ['cpu', 'mem'], historyDepth: 60 }, name: 'Deep history' };
