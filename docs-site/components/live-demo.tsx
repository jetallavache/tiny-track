'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Metrics {
  cpu: number;
  mem: number;
  net_rx: number;
  net_tx: number;
  disk: number;
  load1: number;
}

function randomMetrics(prev: Metrics): Metrics {
  const drift = (v: number, max: number, d: number) => Math.max(0, Math.min(max, v + (Math.random() - 0.5) * d));
  return {
    cpu: drift(prev.cpu, 100, 8),
    mem: drift(prev.mem, 100, 2),
    net_rx: drift(prev.net_rx, 50000, 5000),
    net_tx: drift(prev.net_tx, 20000, 3000),
    disk: drift(prev.disk, 100, 0.5),
    load1: drift(prev.load1, 8, 0.3),
  };
}

function Bar({ label, value, max = 100, unit = '%', warn = 70, crit = 90 }: {
  label: string; value: number; max?: number; unit?: string; warn?: number; crit?: number;
}) {
  const pct = (value / max) * 100;
  const color = pct >= crit ? 'bg-red-500' : pct >= warn ? 'bg-yellow-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs text-muted-foreground font-mono">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="w-20 text-right text-xs font-mono tabular-nums text-foreground">
        {unit === '%' ? `${value.toFixed(1)}%` : `${(value / 1000).toFixed(1)} KB/s`}
      </span>
    </div>
  );
}

export function LiveDemo() {
  const [metrics, setMetrics] = useState<Metrics>({ cpu: 23, mem: 41, net_rx: 12000, net_tx: 4000, disk: 58, load1: 0.8 });
  const [packets, setPackets] = useState<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setMetrics((prev) => {
        const next = randomMetrics(prev);
        const line = `PKT_METRICS  cpu=${next.cpu.toFixed(1)}%  mem=${next.mem.toFixed(1)}%  rx=${(next.net_rx / 1000).toFixed(1)}KB/s`;
        setPackets((p) => [line, ...p].slice(0, 6));
        return next;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-6">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-xs text-muted-foreground font-mono">ws://localhost:25015/v1/stream</span>
      </div>

      <div className="space-y-3">
        <Bar label="CPU" value={metrics.cpu} />
        <Bar label="Memory" value={metrics.mem} />
        <Bar label="Disk" value={metrics.disk} />
        <Bar label="Net RX" value={metrics.net_rx} max={100000} unit="kb/s" warn={60000} crit={90000} />
        <Bar label="Net TX" value={metrics.net_tx} max={100000} unit="kb/s" warn={60000} crit={90000} />
      </div>

      <div className="rounded-lg bg-muted/50 p-3 font-mono text-xs space-y-1 overflow-hidden h-[7.5rem]">
        <AnimatePresence initial={false}>
          {packets.map((p, i) => (
            <motion.div
              key={p + i}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1 - i * 0.15, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-muted-foreground truncate"
            >
              {p}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
