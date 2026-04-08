import { TtTheme } from '../../theme.js';

export interface AlertState {
  cpu: 'ok' | 'warn' | 'crit' | 'off';
  mem: 'ok' | 'warn' | 'crit' | 'off';
  disk: 'ok' | 'warn' | 'crit' | 'off';
  load: 'ok' | 'warn' | 'crit' | 'off';
  spike: 'ok' | 'warn' | 'crit' | 'off';
}

const LAMP_TITLES: Record<keyof AlertState, string> = {
  cpu: 'CPU load', mem: 'Memory usage', disk: 'Disk usage',
  load: 'Load average trend', spike: 'Load spike',
};

/** Metric icon type — covers both alert lamps and metric badges. */
export type MetricIconType = keyof AlertState | 'net' | 'proc';

/** SVG icon for a metric or alert type. */
export function MetricIcon({ type, size: s }: { type: MetricIconType; size: number }) {
  switch (type) {
    case 'cpu':
      return (
        <svg width={s} height={s} viewBox="0 0 10 10" fill="currentColor">
          <rect x="2.5" y="2.5" width="5" height="5" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1" />
          <line x1="4" y1="0" x2="4" y2="2.5" stroke="currentColor" strokeWidth="0.8" />
          <line x1="6" y1="0" x2="6" y2="2.5" stroke="currentColor" strokeWidth="0.8" />
          <line x1="4" y1="7.5" x2="4" y2="10" stroke="currentColor" strokeWidth="0.8" />
          <line x1="6" y1="7.5" x2="6" y2="10" stroke="currentColor" strokeWidth="0.8" />
          <line x1="0" y1="4" x2="2.5" y2="4" stroke="currentColor" strokeWidth="0.8" />
          <line x1="0" y1="6" x2="2.5" y2="6" stroke="currentColor" strokeWidth="0.8" />
          <line x1="7.5" y1="4" x2="10" y2="4" stroke="currentColor" strokeWidth="0.8" />
          <line x1="7.5" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="0.8" />
        </svg>
      );
    case 'mem':
      return (
        <svg width={s} height={s} viewBox="0 0 10 10" fill="currentColor">
          <rect x="0.5" y="3" width="9" height="4" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1" />
          <rect x="2" y="4" width="1" height="2" rx="0.2" />
          <rect x="4" y="4" width="1" height="2" rx="0.2" />
          <rect x="6" y="4" width="1" height="2" rx="0.2" />
          <line x1="4.5" y1="1.5" x2="4.5" y2="3" stroke="currentColor" strokeWidth="0.8" />
        </svg>
      );
    case 'disk':
      /* CD / optical disc */
      return (
        <svg width={s} height={s} viewBox="0 0 10 10" fill="none" stroke="currentColor">
          <circle cx="5" cy="5" r="4.2" strokeWidth="1" />
          <circle cx="5" cy="5" r="2.2" strokeWidth="0.8" />
          <circle cx="5" cy="5" r="0.8" fill="currentColor" stroke="none" />
          <line x1="5" y1="0.8" x2="5" y2="2.8" strokeWidth="0.7" />
          <line x1="8.5" y1="2.5" x2="7" y2="3.5" strokeWidth="0.7" />
        </svg>
      );
    case 'load':
      return (
        <svg width={s} height={s} viewBox="0 0 10 10" fill="currentColor">
          <rect x="0.5" y="6" width="2" height="3.5" rx="0.3" />
          <rect x="3.5" y="4" width="2" height="5.5" rx="0.3" />
          <rect x="6.5" y="1.5" width="2" height="8" rx="0.3" />
          <line x1="0.5" y1="9.5" x2="9.5" y2="9.5" stroke="currentColor" strokeWidth="0.6" />
        </svg>
      );
    case 'spike':
      return (
        <svg width={s} height={s} viewBox="0 0 10 10" fill="currentColor">
          <polygon points="6,0.5 2,5.5 5,5.5 4,9.5 8,4.5 5,4.5" />
        </svg>
      );
    case 'net':
      /* Globe / planet — WWW */
      return (
        <svg width={s} height={s} viewBox="0 0 10 10" fill="none" stroke="currentColor">
          <circle cx="5" cy="5" r="4.2" strokeWidth="1" />
          {/* Meridians */}
          <ellipse cx="5" cy="5" rx="2" ry="4.2" strokeWidth="0.7" />
          {/* Parallels */}
          <line x1="0.8" y1="3.2" x2="9.2" y2="3.2" strokeWidth="0.7" />
          <line x1="0.8" y1="6.8" x2="9.2" y2="6.8" strokeWidth="0.7" />
        </svg>
      );
    case 'proc':
      /* Terminal / process — small screen with cursor */
      return (
        <svg width={s} height={s} viewBox="0 0 10 10" fill="currentColor">
          <rect x="0.5" y="1.5" width="9" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
          <polyline points="2,4 4,5.5 2,7" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="5" y1="7" x2="8" y2="7" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
        </svg>
      );
  }
}

export function AlertLamps({ state, t, size }: { state: AlertState; t: TtTheme; size: 's' | 'm' | 'l' }) {
  const iconSize = size === 'l' ? 14 : size === 's' ? 10 : 12;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size === 'l' ? 6 : size === 's' ? 4 : 5 }}>
      {(Object.keys(state) as (keyof AlertState)[]).map((key) => {
        const level = state[key];
        const color = level === 'crit' ? t.crit : level === 'warn' ? t.warn : level === 'ok' ? t.muted : t.faint;
        return (
          <span key={key} title={`${LAMP_TITLES[key]}: ${level}`} style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color,
            filter: (level === 'crit' || level === 'warn') ? `drop-shadow(0 0 4px ${color}88)` : undefined,
            transition: 'color 0.3s, filter 0.3s',
            flexShrink: 0, lineHeight: 1,
          }}>
            <MetricIcon type={key} size={iconSize} />
          </span>
        );
      })}
    </span>
  );
}
