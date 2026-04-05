/**
 * MockTinyTrackProvider — injects animated mock metrics into TinyTrackContext.
 * Used exclusively in Storybook stories. No WebSocket connection is made.
 */
import { useEffect, useState, useRef, useMemo, ReactNode } from 'react';
import { TinyTrackContext, useMetrics } from '../react/TinyTrackProvider.js';
import { TtMetrics, TtConfig, TtStats, TtSysInfo } from '../client.js';

export { useMetrics }; // re-export so stories import from one place

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
    // L1: last historySize seconds
    const l1 = Array.from({ length: historySize }, (_, i) =>
      makeMetrics(i, { timestamp: now - (historySize - i) * 1000 }),
    );
    // L2: last historySize minutes
    const l2 = Array.from({ length: historySize }, (_, i) =>
      makeMetrics(i * 3, { timestamp: now - (historySize - i) * 60_000 }),
    );
    // L3: last historySize hours
    const l3 = Array.from({ length: Math.min(historySize, 168) }, (_, i) =>
      makeMetrics(i * 10, { timestamp: now - (historySize - i) * 3_600_000 }),
    );
    return { l1, l2, l3 };
  }, [historySize]);

  // We inject a fake client that satisfies the interface components need
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

  // Patch the fake client to support on/off/emit
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

  // Fire history once after listeners are registered
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

  // Emit metrics on every tick
  useEffect(() => {
    listenersRef.current.get('metrics')?.forEach((fn) => fn(metrics));
  }, [metrics]);

  return <>{children}</>;
}
