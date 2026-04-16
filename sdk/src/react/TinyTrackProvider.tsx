import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { TinyTrackClient, TtMetrics, TtConfig, TtStats, TtHistoryResp, TtSysInfo } from '../client.js';
import { historyToMetrics } from '../proto.js';

interface TinyTrackContextValue {
  client: TinyTrackClient | null;
  connected: boolean;
  sysinfo: TtSysInfo | null;
  streaming: boolean;
  setStreaming: (v: boolean) => void;
}

const TinyTrackContext = createContext<TinyTrackContextValue>({
  client: null,
  connected: false,
  sysinfo: null,
  streaming: true,
  setStreaming: () => {},
});

export { TinyTrackContext };

export interface TinyTrackProviderProps {
  url: string;
  token?: string;
  children: ReactNode;
  reconnect?: boolean;
  reconnectDelay?: number;
}

export function TinyTrackProvider({ url, token, children, reconnect, reconnectDelay }: TinyTrackProviderProps) {
  // Client is created once and never recreated
  const [client] = useState(() => new TinyTrackClient(url, { reconnect, reconnectDelay, token }));
  const [connected, setConnected] = useState(false);
  const [sysinfo, setSysinfo] = useState<TtSysInfo | null>(null);
  const [streaming, setStreamingState] = useState(true);

  // Use ref so setStreaming closure always has the latest client
  const clientRef = useRef(client);

  const setStreaming = useCallback((v: boolean) => {
    setStreamingState(v);
    if (v) clientRef.current.start();
    else clientRef.current.stop();
  }, []);

  useEffect(() => {
    const onOpen = () => {
      setConnected(true);
      setStreamingState(true); // new session always starts streaming
      client.getSysInfo();
      client.getSnapshot();
    };
    const onClose = () => {
      setConnected(false);
      setSysinfo(null);
    };
    client.on('ready', onOpen);  /* 'open' is kept as alias */
    client.on('close', onClose);
    client.on('sysinfo', setSysinfo);
    client.connect().catch(() => { /* reconnect handles retries */ });
    return () => { client.disconnect(); };
  }, [client]);

  return (
    <TinyTrackContext.Provider value={{ client, connected, sysinfo, streaming, setStreaming }}>
      {children}
    </TinyTrackContext.Provider>
  );
}

export function useTinyTrack() {
  return useContext(TinyTrackContext);
}

export function useMetrics() {
  const { client, connected, sysinfo, streaming, setStreaming } = useTinyTrack();
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

  return { client, connected, metrics, config, stats, sysinfo, streaming, setStreaming };
}

/**
 * useRawPackets — subscribe to raw incoming binary packets.
 * Useful when you want to handle protocol data without React component wrappers.
 *
 * @param handler Called with (pktType, payload) for every incoming packet.
 */
export function useRawPackets(handler: (pktType: number, payload: DataView) => void) {
  const { client } = useTinyTrack();
  useEffect(() => {
    if (!client) return;
    client.on('packet', handler);
    return () => { client.off('packet', handler); };
  }, [client, handler]);
}

export function useHistory(maxSamples = 3600) {
  const { client, connected } = useTinyTrack();
  const [samples, setSamples] = useState<TtMetrics[]>([]);
  const buf = useRef<TtMetrics[]>([]);

  useEffect(() => {
    if (!client) return;
    const onHistory = (r: TtHistoryResp) => {
      buf.current = [...buf.current, ...historyToMetrics(r)].slice(-maxSamples);
      setSamples([...buf.current]);
    };
    client.on('history', onHistory);
    return () => {
      client.off('history', onHistory);
    };
  }, [client, maxSamples]);

  useEffect(() => {
    if (connected) {
      buf.current = [];
      setSamples([]);
    }
  }, [connected]);

  return samples;
}
