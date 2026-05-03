'use client';

import dynamic from 'next/dynamic';

/* All SDK components use WebSocket/DOM — must be client-only (no SSR) */

export const LiveMetricsBar = dynamic(() => import('./live-previews-inner').then((m) => m.LiveMetricsBar), {
  ssr: false,
});

export const LiveMetricsPanel = dynamic(() => import('./live-previews-inner').then((m) => m.LiveMetricsPanel), {
  ssr: false,
});

export const LiveTimeSeriesChart = dynamic(() => import('./live-previews-inner').then((m) => m.LiveTimeSeriesChart), {
  ssr: false,
});

export const LiveDashboard = dynamic(() => import('./live-previews-inner').then((m) => m.LiveDashboard), {
  ssr: false,
});

export const LiveTimeline = dynamic(() => import('./live-previews-inner').then((m) => m.LiveTimeline), { ssr: false });

export const LiveDiskMap = dynamic(() => import('./live-previews-inner').then((m) => m.LiveDiskMap), { ssr: false });

export const LiveSparkline = dynamic(() => import('./live-previews-inner').then((m) => m.LiveSparkline), {
  ssr: false,
});

export const LiveSystemLoad = dynamic(() => import('./live-previews-inner').then((m) => m.LiveSystemLoad), {
  ssr: false,
});
