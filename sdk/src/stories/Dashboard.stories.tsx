import type { Meta, StoryObj } from '@storybook/react';
import { Dashboard } from '../react/components/Dashboard/index.js';
import { MockTinyTrackProvider } from './MockProvider.js';

const meta: Meta<typeof Dashboard> = {
  title: 'Components/Dashboard',
  component: Dashboard,
  decorators: [
    (Story) => (
      <MockTinyTrackProvider historySize={60}>
        <div style={{ width: 480, padding: 16 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
  parameters: { layout: 'centered' },
  argTypes: {
    mode: { control: 'radio', options: ['compact', 'expanded'] },
    historySize: { control: { type: 'range', min: 10, max: 200, step: 10 } },
  },
};
export default meta;
type Story = StoryObj<typeof Dashboard>;

export const Compact: Story = { args: { mode: 'compact' } };

export const Expanded: Story = { args: { mode: 'expanded', historySize: 60 } };

export const HighLoad: Story = {
  args: { mode: 'compact' },
  decorators: [
    (Story) => (
      <MockTinyTrackProvider overrides={{ cpu: 9500, mem: 9100, load1: 1500, load5: 1300 }}>
        <div style={{ width: 480, padding: 16 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
};

export const Static: Story = {
  args: { mode: 'compact' },
  decorators: [
    (Story) => (
      <MockTinyTrackProvider animate={false}>
        <div style={{ width: 480, padding: 16 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
};

export const Mobile: Story = {
  name: 'Mobile (375px)',
  args: { mode: 'compact', style: { width: '100%' } },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  decorators: [
    (Story) => (
      <MockTinyTrackProvider historySize={60}>
        <div style={{ padding: 12 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
};
