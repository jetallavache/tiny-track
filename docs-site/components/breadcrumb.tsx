'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Slash } from 'lucide-react';

/* Human-readable labels for path segments */
const LABELS: Record<string, string> = {
  components: 'components',
  themes: 'themes',
  docs: 'docs',
  /* docs sub-sections */
  overview: 'overview',
  sdk: 'sdk',
  client: 'client',
  react: 'react',
  lite: 'lite-version',
  server: 'server',
  introduction: 'introduction',
  installation: 'installation',
  core: 'core',
  tinytd: 'tinytd',
  tinytrack: 'tinytrack',
  configuration: 'configuration',
  troubleshooting: 'troubleshooting',
  cli: 'tiny-cli',
  docker: 'docker',
  /* components sub-pages */
  'metrics-bar': '<MetricsBar>',
  'metrics-panel': '<MetricsPanel>',
  'time-series-chart': '<TimeSeriesChart>',
  dashboard: '<Dashboard>',
  timeline: '<Timeline>',
  'disk-map': '<DiskMap>',
  'metrics-3d': '<Metrics3D>',
  sparkline: '<Sparkline>',
  'system-load': '<SystemLoad>',
  /* themes */
  default: 'default',
  shadcnui: 'shadcnui',
  /* getting-started */
  'getting-started': 'getting started',
  hooks: 'hooks',
  vanilla: 'vanilla js',
};

function label(segment: string): string {
  return LABELS[segment] ?? segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumb() {
  const pathname = usePathname();
  if (pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);

  const crumbs = segments.map((seg, i) => ({
    label: label(seg),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 font-mono text-sm font-semibold tracking-tight text-xs text-muted-foreground mb-6"
    >
      <Link href="/" className="hover:text-foreground transition-colors">
        home
      </Link>
      {crumbs.map(({ label: lbl, href, isLast }) => (
        <span key={href} className="flex items-center gap-1">
          <Slash className="h-3 w-3 shrink-0" />
          {isLast ? (
            <span className="text-foreground font-medium">{lbl}</span>
          ) : (
            <Link href={href} className="hover:text-foreground transition-colors">
              {lbl}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
