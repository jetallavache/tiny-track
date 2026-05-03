'use client';

import { TtProvider } from '@/components/tt-provider';
import {
  MetricsBar,
  MetricsPanel,
  TimeSeriesChart,
  Dashboard,
  Timeline,
  DiskMap,
  Sparkline,
  SystemLoad,
} from 'tinytsdk/react';
import { RING_L1 } from 'tinytsdk';
import { ThemeSwitcher } from './theme-switcher';

export function LiveMetricsBar() {
  return <MetricsBar size="m" metrics={['cpu', 'mem', 'disk', 'net', 'load', 'proc']} />;
}

export function LiveMetricsPanel() {
  return <MetricsPanel size="m" columns={2} />;
}

export function LiveTimeSeriesChart() {
  return <TimeSeriesChart metrics={['cpu', 'mem']} level={RING_L1} style={{ width: '100%' }} />;
}

export function LiveDashboard() {
  return <Dashboard mode="compact" style={{ width: '100%' }} />;
}

export function LiveTimeline() {
  return <Timeline metrics={['cpu']} style={{ width: '100%' }} />;
}

export function LiveDiskMap() {
  return <DiskMap mode="ring" style={{ width: 'fit-content' }} />;
}

export function LiveSparkline() {
  return <Sparkline metric="cpu" width={200} height={48} />;
}

export function LiveSystemLoad() {
  return <SystemLoad size="m" />;
}
