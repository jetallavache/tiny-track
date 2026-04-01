import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { TinyTrackClient, TtMetrics, TtConfig, TtStats } from '../client.js';

interface TinyTrackContextValue {
  client:  TinyTrackClient | null;
  metrics: TtMetrics | null;
  config:  TtConfig | null;
  stats:   TtStats | null;
  connected: boolean;
}

const TinyTrackContext = createContext<TinyTrackContextValue>({
  client: null,
  metrics: null,
  config: null,
  stats: null,
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
  const [metrics, setMetrics] = useState<TtMetrics | null>(null);
  const [config, setConfig] = useState<TtConfig | null>(null);
  const [stats, setStats] = useState<TtStats | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    client.on('open',    () => setConnected(true));
    client.on('close',   () => setConnected(false));
    client.on('metrics', setMetrics);
    client.on('config',  setConfig);
    client.on('stats',   setStats);
    client.connect();
    return () => client.disconnect();
  }, [client]);

  return (
    <TinyTrackContext.Provider value={{ client, metrics, config, stats, connected }}>
      {children}
    </TinyTrackContext.Provider>
  );
}

export function useTinyTrack() {
  return useContext(TinyTrackContext);
}
