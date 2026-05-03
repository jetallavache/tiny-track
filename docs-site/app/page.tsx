import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LiveMetricsPanel } from '@/components/live-previews';
import { Activity, Cpu, Zap, Package, ChevronRight } from 'lucide-react';
import { AnimatedBackground } from '@/components/motion-primitives/animated-background';

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

const links = [
  {
    href: '/docs/installation',
    title: 'Installation',
    desc: 'A detailed guide on how to install and configure the service.',
  },
  {
    href: '/docs/sdk/react',
    title: 'React/Next.js',
    desc: 'Learn more about how to add tinytrack to your web app.',
  },
  {
    href: '/themes',
    title: 'Troubleshooting',
    desc: 'Find out about possible problems that have occurred during the operation of the service.',
  },
  {
    href: '/docs/server/tinytd',
    title: './tinytd',
    desc: 'This is the Collector. You need to know if you want to figure out how the core of the service works.',
  },
  {
    href: '/docs/server/tinytrack',
    title: './tinytrack',
    desc: 'This is a Web server. Learn more about how the service handles requests and what protocol it uses for this purpose.',
  },
  {
    href: '/docs/server/cli',
    title: './tiny-cli',
    desc: 'Use the command line utility to manage the service.',
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
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-s text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          v0.7.0 · MIT · Linux
        </div>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          System metrics, <span className="text-primary">streamed live.</span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          TinyTrack is a lightweight Linux daemon that collects CPU, memory, network, disk, and load average — and
          streams them in real time over WebSocket. Only libc and libssl required.
        </p>
        <div className="flex gap-3">
          <Button asChild size="lg">
            <a
              href="https://github.com/jetallavache/tinytrack"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                role="img"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 fill-white dark:fill-zinc-950"
              >
                <title>GitHub</title>
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path>
              </svg>
              <span>GitHub</span>
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/docs/overview">
              <span className="flex items-center">
                Explore Docs <ChevronRight />
              </span>
            </Link>
          </Button>
        </div>
      </section>

      {/* Live component + quick start */}
      <section className="grid gap-8 pb-20 lg:grid-cols-2">
        <div className="bg-[linear-gradient(hsla(142,71%,45%,0.15)_1px,transparent_1px),linear-gradient(90deg,hsla(142,71%,45%,0.15)_1px,transparent_1px),linear-gradient(hsla(142,71%,45%,0.15)_0.6px,transparent_0.6px),linear-gradient(90deg,hsla(142,71%,45%,0.15)_0.6px,var(--background)_0.6px)] bg-[length:90px_90px,90px_90px,18px_18px,18px_18px] bg-[position:-1px_-1px,-1px_-1px,-0.6px_-0.6px,-0.6px_-0.6px]">
          <p className="mb-3 p-3 text-m font-medium text-muted-foreground uppercase tracking-wider">Live component</p>
          <div className="mt-6 flex justify-center">
            <LiveMetricsPanel />
          </div>
        </div>
        <div>
          <p className="mb-3 p-3 text-m font-medium text-muted-foreground uppercase tracking-wider">Quick start</p>
          <pre className="w-full rounded-xl border border-border bg-muted/50 p-5 text-xs font-mono leading-relaxed overflow-x-auto text-foreground">
            {quickStart}
          </pre>
          <p className="mt-3 text-s text-muted-foreground">
            Then connect: <code className="rounded bg-muted px-1 py-0.5 font-mono">ws://your-host:25015/v1/stream</code>
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
            <p className="font-semibold text-m">{title}</p>
            <p className="text-s text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>

      {/* Navigation cards */}
      <section className="pb-24">
        {/* <p className="mb-6 text-m font-medium text-muted-foreground uppercase tracking-wider">Explore</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              href: '/components',
              title: 'components',
              desc: 'All tinytsdk/react components with live previews, React and Vanilla JS code.',
            },
            {
              href: '/themes',
              title: 'themes',
              desc: 'Visual themes for components: default, shadcn/ui, and custom token overrides.',
            },
            {
              href: '/docs/overview',
              title: 'docs',
              desc: 'Full documentation: SDK client, React, server, CLI, Docker, configuration.',
            },
          ].map(({ href, title, desc }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/30"
            >
              <p className="font-mono font-semibold text-m group-hover:text-primary transition-colors">{title} →</p>
              <p className="mt-1 text-s text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </div> */}
        <div className="grid gap-3 grid-cols-2 p-10 md:grid-cols-3">
          <AnimatedBackground
            className="rounded-lg bg-zinc-100 dark:bg-zinc-800"
            transition={{
              type: 'spring',
              bounce: 0.2,
              duration: 0.6,
            }}
            enableHover
          >
            {links.map(({ href, title, desc }, index) => (
              <div key={index} data-id={`card-${index}`}>
                <Link key={href} href={href} className="flex select-none flex-col space-y-1 p-4">
                  <p className="font-mono font-semibold text-m group-hover:text-primary transition-colors">{title} →</p>
                  <p className="mt-1 text-s text-muted-foreground">{desc}</p>
                </Link>
              </div>
            ))}
          </AnimatedBackground>
        </div>
      </section>
    </div>
  );
}
