import type { Meta, StoryObj } from '@storybook/react';
import { DiskMap } from '../react/components/DiskMap/index.js';
import { MockTinyTrackProvider } from './MockProvider.js';
import type { DiskSegment } from '../react/components/DiskMap/index.js';

const SEGMENTS: DiskSegment[] = [
  { label: 'database', bytes: 80_000_000_000 },
  { label: 'uploads', bytes: 45_000_000_000 },
  { label: 'logs', bytes: 12_000_000_000 },
];

const meta: Meta<typeof DiskMap> = {
  title: 'Components/DiskMap',
  component: DiskMap,
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
    mode: { control: 'radio', options: ['ring', 'matrix'] },
    size: { control: 'radio', options: ['s', 'm', 'l'] },
    matrixCols: { control: { type: 'range', min: 20, max: 100, step: 10 } },
    matrixRows: { control: { type: 'range', min: 10, max: 50, step: 5 } },
  },
};
export default meta;
type Story = StoryObj<typeof DiskMap>;

export const Default: Story = {
  args: { segments: SEGMENTS },
};

export const Ring: Story = {
  name: 'Ring mode',
  args: { segments: SEGMENTS, mode: 'ring' },
};

export const Matrix: Story = {
  name: 'Matrix mode',
  args: { segments: SEGMENTS, mode: 'matrix', matrixCols: 60, matrixRows: 20 },
};

export const NoSegments: Story = {
  name: 'No external segments',
  args: {},
};

export const CustomColors: Story = {
  name: 'Custom segment colors',
  args: {
    segments: [
      { label: 'database', bytes: 80_000_000_000, color: '#f97316' },
      { label: 'uploads', bytes: 45_000_000_000, color: '#a78bfa' },
      { label: 'logs', bytes: 12_000_000_000, color: '#34d399' },
    ],
  },
};

export const Small: Story = { args: { segments: SEGMENTS, size: 's' } };
export const Large: Story = { args: { segments: SEGMENTS, size: 'l' } };

export const HighUsage: Story = {
  name: 'High disk usage',
  decorators: [
    (Story) => (
      <MockTinyTrackProvider overrides={{ duUsage: 9200, duTotal: 500_000_000_000, duFree: 40_000_000_000 }}>
        <div style={{ padding: 24 }}>
          <Story />
        </div>
      </MockTinyTrackProvider>
    ),
  ],
  args: {
    segments: [
      { label: 'database', bytes: 200_000_000_000 },
      { label: 'uploads', bytes: 150_000_000_000 },
      { label: 'logs', bytes: 70_000_000_000 },
    ],
  },
};
