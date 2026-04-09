/**
 * WsConsole — collapsible WebSocket packet log panel used inside Dashboard.
 */
import { useRef, useEffect, CSSProperties } from 'react';
import { TtTheme, themeStyles } from '../../theme.js';

export interface WsConsoleProps {
  log: string[];
  onClear: () => void;
  t: TtTheme;
  style?: CSSProperties;
}

/**
 * Scrollable log of WebSocket packets (→ sent, ← received).
 * Auto-scrolls to the bottom when new lines are appended.
 */
export function WsConsole({ log, onClear, t, style }: WsConsoleProps) {
  const s = themeStyles(t);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log]);

  return (
    <>
      <div
        ref={ref}
        style={{
          fontFamily: '"JetBrains Mono","Fira Code",monospace',
          fontSize: 10,
          background: t.surface,
          border: `1px solid ${t.divider}`,
          borderRadius: t.radius,
          padding: '6px 8px',
          maxHeight: 180,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          ...style,
        }}
      >
        {log.length === 0 ? (
          <span style={{ color: t.faint }}>No packets yet…</span>
        ) : (
          log.map((line, i) => (
            <div
              key={i}
              style={{
                color: line.includes('→') ? t.muted
                  : line.includes('←') ? t.ok
                  : line.includes('✗') ? t.crit
                  : t.muted,
              }}
            >
              {line}
            </div>
          ))
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button style={s.btn} onClick={onClear}>clear</button>
      </div>
    </>
  );
}
