export interface NavItem {
  label: string;
  rightLabel?: string;
  href: string;
  group?: string;
}

/* --- */

export function componentsNavItems(): NavItem[] {
  return [
    { label: 'Introduction', href: '/components', group: 'Getting Started' },
    { label: 'Installation', href: '/components/installation', group: 'Getting Started' },
    { label: 'MetricsBar', href: '/components/metrics-bar', group: 'Components' },
    { label: 'MetricsPanel', href: '/components/metrics-panel', group: 'Components' },
    { label: 'TimeSeriesChart', href: '/components/time-series-chart', group: 'Components' },
    { label: 'Dashboard', href: '/components/dashboard', group: 'Components' },
    { label: 'Timeline', href: '/components/timeline', group: 'Components' },
    { label: 'DiskMap', href: '/components/disk-map', group: 'Components' },
    { label: 'Metrics3D', href: '/components/metrics-3d', group: 'Components' },
    { label: 'Sparkline', href: '/components/sparkline', group: 'Components' },
    { label: 'SystemLoad', href: '/components/system-load', group: 'Components' },
    { label: 'Themes', href: '/themes', group: 'Customization' },
    { label: 'Raw Packets & TypeScript', href: '/components/raw-packets', group: 'Customization' },
  ];
}

/* --- */

export function themesNavItems(): NavItem[] {
  return [
    { label: 'Overview', href: '/themes' },
    { label: 'terminal', rightLabel: 'default', href: '/themes/default' },
    { label: 'dark', href: '/themes/dark' },
    { label: 'light', href: '/themes/light' },
    { label: 'material', href: '/themes/material' },
    { label: 'dracula', href: '/themes/dracula' },
    { label: 'heroui', href: '/themes/heroui' },
    { label: 'shadcnui', href: '/themes/shadcnui' },
  ];
}

/* --- */

export function docsNavItems(): NavItem[] {
  return [
    { label: 'Overview', href: '/docs/overview', group: '' },
    /* SDK */
    { label: 'Client', rightLabel: 'tinytsdk', href: '/docs/sdk/client', group: 'SDK' },
    { label: 'React', rightLabel: 'tinytsdk/react', href: '/docs/sdk/react', group: 'SDK' },
    { label: 'Lite version', rightLabel: 'tinytsdk-lite', href: '/docs/sdk/lite', group: 'SDK' },
    /* Server */
    { label: 'Introduction', href: '/docs/server/introduction', group: 'Server' },
    { label: 'Installation', href: '/docs/server/installation', group: 'Server' },
    { label: 'Collector', rightLabel: './tinytd', href: '/docs/server/tinytd', group: 'Server' },
    { label: 'Gateway', rightLabel: './tinytrack', href: '/docs/server/tinytrack', group: 'Server' },
    { label: 'CLI', rightLabel: './tiny-cli', href: '/docs/server/cli', group: 'Server' },
    { label: 'Configuration', href: '/docs/server/configuration', group: 'Server' },
    { label: 'Troubleshooting', href: '/docs/server/troubleshooting', group: 'Server' },
    { label: 'Docker & Kubernetes', href: '/docs/server/docker', group: 'Server' },
  ];
}
