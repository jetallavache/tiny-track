import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LiveDemo } from '@/components/live-demo';
import { Activity, Cpu, Zap, Package } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Under 1% CPU',
    desc: 'Reads /proc directly. No polling overhead, no agents, no sidecars.',
  },
  {
    icon: Activity,
    title: 'Three-tier history',
    desc: 'L1 (1s/1h) · L2 (1min/24h) · L3 (1h/30d) — all in shared memory.',
  },
  {
    icon: Cpu,
    title: 'Binary protocol v2',
    desc: 'Compact 10-byte framing over WebSocket. Prometheus export included.',
  },
  {
    icon: Package,
    title: 'tinytsdk',
    desc: 'React components + vanilla JS client. 2.8 KB gzip core bundle.',
  },
];

const quickStart = `docker run -d --name tinytrack \\
  -p 25015:25015 \\
  -v /proc:/host/proc:ro \\
  -v /:/host/rootfs:ro \\
  -v /dev/shm:/dev/shm \\
  -e TT_PROC_ROOT=/host/proc \\
  -e TT_ROOTFS_PATH=/host/rootfs \\
  jetallavache/tinytrack:latest`;

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          v0.7.0 · MIT · Linux
        </div>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          System metrics,{' '}
          <span className="text-primary">streamed live.</span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          TinyTrack is a lightweight Linux daemon that collects CPU, memory, network, disk, and load average —
          and streams them in real time over WebSocket. Only libc and libssl required.
        </p>
        <div className="flex gap-3">
          <Button asChild size="lg">
            <a href="https://github.com/jetallavache/tinytrack" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/tinytd">Documentation →</Link>
          </Button>
        </div>
      </section>

      {/* Live demo + quick start */}
      <section className="grid gap-8 pb-20 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">Live simulation</p>
          <LiveDemo />
        </div>
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">Quick start</p>
          <pre className="rounded-xl border border-border bg-muted/50 p-5 text-xs font-mono leading-relaxed overflow-x-auto text-foreground">
            {quickStart}
          </pre>
          <p className="mt-3 text-xs text-muted-foreground">
            Then connect:{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono">ws://your-host:25015/v1/stream</code>
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="font-semibold text-sm">{title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>

      {/* Components nav */}
      <section className="pb-24">
        <p className="mb-6 text-sm font-medium text-muted-foreground uppercase tracking-wider">Documentation</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { href: '/tinytd', title: 'tinytd', desc: 'Metrics collector daemon. Reads /proc, writes ring buffers.' },
            { href: '/tinytrack', title: 'tinytrack', desc: 'WebSocket gateway. Binary protocol v2, TLS, Prometheus.' },
            { href: '/tiny-cli', title: 'tiny-cli', desc: 'CLI + ncurses TUI. Live dashboard, history, control.' },
          ].map(({ href, title, desc }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/30"
            >
              <p className="font-semibold text-sm group-hover:text-primary transition-colors">{title} →</p>
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
