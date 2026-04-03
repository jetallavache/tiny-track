import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { TinyTrackClient, TtMetrics, TtConfig, TtStats, TtHistoryResp } from '../client.js';

interface TinyTrackContextValue {
  client: TinyTrackClient | null;
  connected: boolean;
}

const TinyTrackContext = createContext<TinyTrackContextValue>({
  client: null,
  connected: false,
});

export interface TinyTrackProviderProps {
  url: string;
  children: ReactNode;
  reconnect?: boolean;
  reconnectDelay?: number;
}

export function TinyTrackProvider({ url, children, reconnect, reconnectDelay }: TinyTrackProviderProps) {
  const [client] = useState(() => new TinyTrackClient(url, { reconnect, reconnectDelay }));
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    client.on('open', () => setConnected(true));
    client.on('close', () => setConnected(false));
    client.connect();
    return () => client.disconnect();
  }, [client]);

  return <TinyTrackContext.Provider value={{ client, connected }}>{children}</TinyTrackContext.Provider>;
}

export function useTinyTrack() {
  return useContext(TinyTrackContext);
}

/** Each component gets its own local metrics/config/stats state — no shared state conflicts. */
export function useMetrics() {
  const { client, connected } = useTinyTrack();
  const [metrics, setMetrics] = useState<TtMetrics | null>(null);
  const [config, setConfig] = useState<TtConfig | null>(null);
  const [stats, setStats] = useState<TtStats | null>(null);

  useEffect(() => {
    if (!client) return;
    client.on('metrics', setMetrics);
    client.on('config', setConfig);
    client.on('stats', setStats);
    return () => {
      client.off('metrics', setMetrics);
      client.off('config', setConfig);
      client.off('stats', setStats);
    };
  }, [client]);

  return { client, connected, metrics, config, stats };
}

/** Subscribe to history batches — accumulates samples into a local buffer. */
export function useHistory(maxSamples = 3600) {
  const { client, connected } = useTinyTrack();
  const [samples, setSamples] = useState<TtMetrics[]>([]);
  const buf = useRef<TtMetrics[]>([]);

  useEffect(() => {
    if (!client) return;
    const onHistory = (r: TtHistoryResp) => {
      buf.current = [...buf.current, ...r.samples].slice(-maxSamples);
      setSamples([...buf.current]);
    };
    client.on('history', onHistory);
    return () => {
      client.off('history', onHistory);
    };
  }, [client, maxSamples]);

  // Clear buffer on reconnect
  useEffect(() => {
    if (connected) {
      buf.current = [];
      setSamples([]);
    }
  }, [connected]);

  return samples;
}
