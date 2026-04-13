/**
 * MockTinyTrackProvider — injects animated mock metrics into TinyTrackContext.
 * Used exclusively in Storybook stories. No WebSocket connection is made.
 *
 * Also exports `mockData` — a collection of preset metric snapshots for
 * quickly constructing realistic story scenarios without manual overrides.
 */
import { useEffect, useState, useRef, useMemo, ReactNode } from 'react';
import { TinyTrackContext, useMetrics } from '../react/TinyTrackProvider.js';
import { TtMetrics, TtConfig, TtStats, TtSysInfo } from '../client.js';

export { useMetrics }; // re-export so stories import from one place

/* ─── Mock data generator ────────────────────────────────────────────────── */

function makeSysInfo(): TtSysInfo {
  return {
    hostname: 'dev-host',
    osType: 'Linux 6.8.0-generic',
    uptimeSec: 86400,
    slotsL1: 3600,
    slotsL2: 1440,
    slotsL3: 720,
    intervalMs: 1000,
    aggL2Ms: 60000,
    aggL3Ms: 3600000,
  };
}

function makeMetrics(t = 0, overrides: Partial<TtMetrics> = {}): TtMetrics {
  const wave = (phase: number, amp: number, base: number) => Math.round((base + Math.sin(t / 20 + phase) * amp) * 100);
  return {
    timestamp: Date.now(),
    cpu: wave(0, 30, 45),
    mem: wave(1, 10, 60),
    netRx: Math.round(Math.abs(Math.sin(t / 15)) * 5_000_000),
    netTx: Math.round(Math.abs(Math.cos(t / 15)) * 2_000_000),
    load1: Math.round((1.2 + Math.sin(t / 25) * 0.8) * 100),
    load5: Math.round((1.0 + Math.sin(t / 40) * 0.5) * 100),
    load15: Math.round((0.9 + Math.sin(t / 60) * 0.3) * 100),
    nrRunning: 3,
    nrTotal: 420,
    duUsage: wave(2, 5, 72),
    duTotal: 500_000_000_000,
    duFree: 140_000_000_000,
    ...overrides,
  };
}

/**
 * Preset metric snapshots for story scenarios.
 *
 * Usage:
 *   <MockTinyTrackProvider overrides={mockData.highLoad}>
 *
 * Available presets:
 *   idle       — minimal activity, all metrics low
 *   normal     — typical workload
 *   highLoad   — CPU/mem/load near critical
 *   diskFull   — disk usage at 92%
 *   netSaturated — network near saturation
 *   critical   — everything at critical levels
 */
export const mockData = {
  idle: {
    cpu: 300, mem: 2500, load1: 10, load5: 12, load15: 15,
    nrRunning: 1, nrTotal: 180,
    netRx: 1000, netTx: 500,
    duUsage: 4500, duTotal: 500_000_000_000, duFree: 275_000_000_000,
  } satisfies Partial<TtMetrics>,

  normal: {
    cpu: 3500, mem: 5500, load1: 120, load5: 100, load15: 90,
    nrRunning: 4, nrTotal: 320,
    netRx: 2_000_000, netTx: 800_000,
    duUsage: 6800, duTotal: 500_000_000_000, duFree: 160_000_000_000,
  } satisfies Partial<TtMetrics>,

  highLoad: {
    cpu: 9200, mem: 8800, load1: 1800, load5: 1500, load15: 1200,
    nrRunning: 24, nrTotal: 512,
    netRx: 30_000_000, netTx: 15_000_000,
    duUsage: 7500, duTotal: 500_000_000_000, duFree: 125_000_000_000,
  } satisfies Partial<TtMetrics>,

  diskFull: {
    cpu: 2500, mem: 4000, load1: 80, load5: 75, load15: 70,
    nrRunning: 3, nrTotal: 290,
    duUsage: 9200, duTotal: 500_000_000_000, duFree: 40_000_000_000,
  } satisfies Partial<TtMetrics>,

  netSaturated: {
    cpu: 4500, mem: 5000, load1: 200, load5: 180, load15: 160,
    nrRunning: 6, nrTotal: 350,
    netRx: 180_000_000, netTx: 90_000_000,
    duUsage: 6000, duTotal: 500_000_000_000, duFree: 200_000_000_000,
  } satisfies Partial<TtMetrics>,

  critical: {
    cpu: 9800, mem: 9500, load1: 2400, load5: 2000, load15: 1800,
    nrRunning: 48, nrTotal: 512,
    netRx: 220_000_000, netTx: 110_000_000,
    duUsage: 9600, duTotal: 500_000_000_000, duFree: 20_000_000_000,
  } satisfies Partial<TtMetrics>,
} as const;

/* ─── Provider ───────────────────────────────────────────────────────────── */

export interface MockProviderProps {
  children: ReactNode;
  animate?: boolean;
  overrides?: Partial<TtMetrics>;
  /** Pre-fill history buffer with N samples (for Timeline stories) */
  historySize?: number;
}

/**
 * Wraps children in the real TinyTrackContext with mock data.
 * Components using useMetrics() / useTinyTrack() work without changes.
 */
export function MockTinyTrackProvider({ children, animate = true, overrides, historySize = 0 }: MockProviderProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!animate) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [animate]);

  // Pre-build history for Timeline stories
  const history = useMemo(() => {
    if (!historySize) return null;
    const now = Date.now();
    const l1 = Array.from({ length: historySize }, (_, i) =>
      makeMetrics(i, { timestamp: now - (historySize - i) * 1000 }),
    );
    const l2 = Array.from({ length: historySize }, (_, i) =>
      makeMetrics(i * 3, { timestamp: now - (historySize - i) * 60_000 }),
    );
    const l3 = Array.from({ length: Math.min(historySize, 168) }, (_, i) =>
      makeMetrics(i * 10, { timestamp: now - (historySize - i) * 3_600_000 }),
    );
    return { l1, l2, l3 };
  }, [historySize]);

  const fakeClient = useRef({
    setInterval: () => {},
    getHistory: () => {},
    getSnapshot: () => {},
    getSysInfo: () => {},
    subscribe: () => {},
    on: () => {},
    off: () => {},
    connect: () => {},
    disconnect: () => {},
  } as any);

  const metrics = makeMetrics(tick, overrides);

  return (
    <TinyTrackContext.Provider
      value={{
        client: fakeClient.current,
        connected: true,
        sysinfo: makeSysInfo(),
        streaming: true,
        setStreaming: () => {},
      }}
    >
      <MetricsInjector metrics={metrics} history={history}>
        {children}
      </MetricsInjector>
    </TinyTrackContext.Provider>
  );
}

/**
 * Fires 'metrics' and 'history' events on the fake client so hooks update.
 */
function MetricsInjector({
  metrics,
  history,
  children,
}: {
  metrics: TtMetrics;
  history: { l1: TtMetrics[]; l2: TtMetrics[]; l3: TtMetrics[] } | null;
  children: ReactNode;
}) {
  const { client } = useMetrics();
  const listenersRef = useRef<Map<string, Set<Function>>>(new Map());
  const historyFiredRef = useRef(false);

  useEffect(() => {
    if (!client) return;
    const listeners = listenersRef.current;
    (client as any).on = (event: string, fn: Function) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(fn);
    };
    (client as any).off = (event: string, fn: Function) => {
      listeners.get(event)?.delete(fn);
    };
  }, [client]);

  useEffect(() => {
    if (!history || historyFiredRef.current) return;
    const id = setTimeout(() => {
      const emit = (level: number, samples: TtMetrics[]) =>
        listenersRef.current.get('history')?.forEach((fn) => fn({ level, samples }));
      emit(1, history.l1);
      emit(2, history.l2);
      emit(3, history.l3);
      historyFiredRef.current = true;
    }, 50);
    return () => clearTimeout(id);
  }, [history]);

  useEffect(() => {
    listenersRef.current.get('metrics')?.forEach((fn) => fn(metrics));
  }, [metrics]);

  return <>{children}</>;
}
