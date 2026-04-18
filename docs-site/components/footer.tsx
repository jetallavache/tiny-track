import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-sm">TinyTrack</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            Lightweight Linux system metrics daemon with real-time WebSocket streaming.
          </p>
        </div>
        <div className="flex gap-12 text-sm">
          <div className="flex flex-col gap-2">
            <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Docs</p>
            <Link href="/tinytd" className="text-muted-foreground hover:text-foreground transition-colors">tinytd</Link>
            <Link href="/tinytrack" className="text-muted-foreground hover:text-foreground transition-colors">tinytrack</Link>
            <Link href="/tiny-cli" className="text-muted-foreground hover:text-foreground transition-colors">tiny-cli</Link>
            <Link href="/sdk" className="text-muted-foreground hover:text-foreground transition-colors">SDK</Link>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Links</p>
            <a href="https://github.com/jetallavache/tinytrack" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
            <a href="https://www.npmjs.com/package/tinytsdk" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">npm</a>
            <a href="https://hub.docker.com/r/jetallavache/tinytrack" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">Docker Hub</a>
          </div>
        </div>
      </div>
      <div className="border-t border-border/40 px-6 py-4">
        <p className="mx-auto max-w-6xl text-xs text-muted-foreground">
          MIT License © {new Date().getFullYear()} TinyTrack contributors
        </p>
      </div>
    </footer>
  );
}
