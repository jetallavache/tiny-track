/**
 * tinytsdk/react — React components and hooks for TinyTrack SDK.
 *
 * Usage:
 *   import { TinyTrackProvider, MetricsBar, Dashboard } from 'tinytsdk/react';
 */

/* Provider and hooks */
export {
  TinyTrackProvider,
  TinyTrackContext,
  useTinyTrack,
  useMetrics,
  useHistory,
  useRawPackets,
} from './TinyTrackProvider.js';

/* Theme */
export { ThemeProvider, useTheme, THEMES, invertColor, dimColor } from './theme.js';
export type { TtTheme, ThemePreset, ThemeProviderProps, ThemeContextValue } from './theme.js';

/* Components */
export { MetricsBar } from './components/MetricsBar/index.js';
export { MetricsPanel } from './components/MetricsPanel/index.js';
export { Dashboard } from './components/Dashboard/index.js';
export { ControlPanel } from './components/Dashboard/ControlPanel.js';
export { RingBufferStatus } from './components/Dashboard/RingBufferStatus.js';
export { SystemInfoRow } from './components/Dashboard/SystemInfoRow.js';
export { TimeSeriesChart } from './components/TimeSeriesChart/index.js';
export { TimeSeriesChartWithLevelSelector } from './components/TimeSeriesChart/TimeSeriesChartWithLevelSelector.js';
export { TimeSeriesChartWithAutoLevel } from './components/TimeSeriesChart/TimeSeriesChartWithAutoLevel.js';
export { TimeSeriesChartWithBand } from './components/TimeSeriesChart/TimeSeriesChartWithBand.js';
export { Timeline } from './components/Timeline/index.js';
export { TimelineWithLazyLoad } from './components/Timeline/TimelineWithLazyLoad.js';
export { SystemLoad } from './components/SystemLoad/index.js';
export { DiskMap } from './components/DiskMap/index.js';
export { Sparkline } from './components/Sparkline/index.js';

/* Component prop types */
export type { MetricsBarProps } from './components/MetricsBar/index.js';
export type { MetricsPanelProps } from './components/MetricsPanel/index.js';
export type { DashboardProps, DashboardMode } from './components/Dashboard/index.js';
export type { ControlPanelProps } from './components/Dashboard/ControlPanel.js';
export type { RingBufferStatusProps } from './components/Dashboard/RingBufferStatus.js';
export type { SystemInfoRowProps } from './components/Dashboard/SystemInfoRow.js';
export type { TimeSeriesChartProps } from './components/TimeSeriesChart/index.js';
export type { TimeSeriesChartWithLevelSelectorProps } from './components/TimeSeriesChart/TimeSeriesChartWithLevelSelector.js';
export type { TimeSeriesChartWithAutoLevelProps } from './components/TimeSeriesChart/TimeSeriesChartWithAutoLevel.js';
export type { TimeSeriesChartWithBandProps } from './components/TimeSeriesChart/TimeSeriesChartWithBand.js';
export type { TimelineProps } from './components/Timeline/index.js';
export type { TimelineWithLazyLoadProps } from './components/Timeline/TimelineWithLazyLoad.js';
export type { SystemLoadProps } from './components/SystemLoad/index.js';
export type { DiskMapProps, DiskSegment } from './components/DiskMap/index.js';
export type { SparklineProps } from './components/Sparkline/index.js';

/* Shared utility types */
export type { MetricType, AggregationType, SizeType, SysInfoType } from './utils/metrics.js';
export type { Alert, LoadTrend } from './utils/alerts.js';
export type { AlertState } from './components/MetricsBar/MetricItem.js';
