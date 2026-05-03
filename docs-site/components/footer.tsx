import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="bg-background mx-auto max-w-6xl px-6">
      <div className="border-t border-border/40 py-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Image src="/logo.svg" alt="tinytrack" width={18} height={18} />
              <p className="font-mono font-semibold text-sm">tinytrack.dev</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs">
              Lightweight Linux system metrics daemon with real-time WebSocket streaming.
            </p>
          </div>
          <div className="flex gap-12 text-sm">
            <div className="flex flex-col gap-2">
              <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground">SDK</p>
              <Link href="/components" className="text-muted-foreground hover:text-foreground transition-colors">
                components
              </Link>
              <Link href="/themes" className="text-muted-foreground hover:text-foreground transition-colors">
                themes
              </Link>
              <Link href="/docs/sdk/react" className="text-muted-foreground hover:text-foreground transition-colors">
                react version
              </Link>
              <Link href="/docs/sdk/lite" className="text-muted-foreground hover:text-foreground transition-colors">
                lite version
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Server</p>
              <Link
                href="/docs/server/installation"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                installation
              </Link>
              <Link
                href="/docs/server/tinytd"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                tinytd
              </Link>
              <Link
                href="/docs/server/tinytrack"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                tinytrack
              </Link>
              <Link href="/docs/server/cli" className="text-muted-foreground hover:text-foreground transition-colors">
                tiny-cli
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Links</p>
              <a
                href="https://github.com/jetallavache/tinytrack"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                github
              </a>
              <a
                href="https://www.npmjs.com/package/tinytsdk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                npm/tinytsdk
              </a>
              <a
                href="https://www.npmjs.com/package/tinytsdk-lite"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                npm/tinytsdk-lite
              </a>
              <a
                href="https://hub.docker.com/r/jetallavache/tinytrack"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                docker hub
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-border/40 py-10">
        <p className="mx-auto max-w-6xl text-xs text-muted-foreground">
          MIT License © {new Date().getFullYear()} TinyTrack contributors
        </p>
      </div>
    </footer>
  );
}
