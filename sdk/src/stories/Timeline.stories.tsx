import type { Meta, StoryObj } from '@storybook/react';
import { Timeline } from '../react/components/Timeline/index.js';
import { MockTinyTrackProvider } from './MockProvider.js';

const meta: Meta<typeof Timeline> = {
  title: 'Components/Timeline',
  component: Timeline,
  decorators: [
    (Story) => (
      <MockTinyTrackProvider historySize={200}>
        <div style={{ padding: 16, width: 900 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
  parameters: { layout: 'centered' },
  argTypes: {
    metrics: { control: 'check', options: ['cpu', 'mem', 'load', 'net', 'disk'] },
    aggregation: { control: 'radio', options: ['avg', 'max', 'min'] },
    size: { control: 'radio', options: ['s', 'm', 'l'] },
    rowHeight: { control: { type: 'range', min: 24, max: 100, step: 4 } },
  },
};
export default meta;
type Story = StoryObj<typeof Timeline>;

export const Default: Story = { args: { metrics: ['cpu'] } };
export const MultiMetric: Story = { args: { metrics: ['cpu', 'mem', 'load'] }, name: 'Multi-metric' };
export const MaxAgg: Story = { args: { metrics: ['cpu'], aggregation: 'max' }, name: 'Max aggregation' };
export const Large: Story = { args: { metrics: ['cpu', 'mem'], size: 'l' } };
export const TallRows: Story = { args: { metrics: ['cpu'], rowHeight: 64 }, name: 'Tall rows' };

export const Mobile: Story = {
  name: 'Mobile (375px)',
  args: { metrics: ['cpu'], style: { width: '100%' } },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
