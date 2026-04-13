import { useState, useEffect, useRef } from 'react';
import { TtTheme } from '../../theme.js';
import type { Alert } from '../../utils/alerts.js';
import { usePopupPosition, usePopupClamp } from './usePopupPosition.js';

export interface AlertState {
  cpu:  'ok' | 'warn' | 'crit' | 'off';
  mem:  'ok' | 'warn' | 'crit' | 'off';
  disk: 'ok' | 'warn' | 'crit' | 'off';
  net:  'ok' | 'warn' | 'crit' | 'off';
  /** Combined load/spike indicator: falling | rising | spike | ok | off */
  sys:  'ok' | 'falling' | 'rising' | 'spike' | 'off';
}

const LAMP_TITLES: Record<keyof AlertState, string> = {
  cpu: 'CPU load', mem: 'Memory usage', disk: 'Disk usage',
  net: 'Network throughput', sys: 'System load',
};

/** Metric icon type — covers both alert lamps and metric badges. */
export type MetricIconType = 'cpu' | 'mem' | 'disk' | 'net' | 'proc' | 'load' | 'spike';

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

/** Detect OS family from osType string (from sysinfo). */
function detectOsFamily(osType?: string): 'linux' | 'darwin' | 'windows' | 'unknown' {
  if (!osType) return 'unknown';
  const s = osType.toLowerCase();
  if (s.includes('darwin') || s.includes('mac')) return 'darwin';
  if (s.includes('windows') || s.includes('win32')) return 'windows';
  if (s.includes('linux') || s.includes('ubuntu') || s.includes('debian') ||
      s.includes('fedora') || s.includes('arch') || s.includes('suse') ||
      s.includes('centos') || s.includes('rhel')) return 'linux';
  return 'unknown';
}

/** OS icon — Tux penguin for Linux (default), Apple for macOS, Windows logo, generic terminal. */
function OsIcon({ size: s, osType }: { size: number; osType?: string }) {
  const family = detectOsFamily(osType);
  if (family === 'darwin') {
    // Apple logo outline
    return (
      <svg width={s} height={s} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="0.9">
        <path d="M7 2.5C7 1.5 6.2 1 5.5 1C5.5 1 5.5 2.5 7 2.5Z" fill="currentColor" stroke="none"/>
        <path d="M2.5 6.5C2.5 8.5 3.8 9.5 5 9.5C5.8 9.5 6.2 9 7 9C7.8 9 8.2 9.5 9 9.5C9 8 8 6 7.5 5.5C7 5 6.5 4.5 5.5 4.5C4.5 4.5 4 5 3.5 5C3 5 2.5 4.5 2 4.5C1.5 4.5 1 5 1 6C1 6.2 1.2 6.5 1.5 6.5" strokeLinecap="round"/>
        <path d="M5.5 1C5.5 2 6.5 2.5 7 2.5C7 2 6.5 1 5.5 1Z" fill="currentColor" stroke="none"/>
      </svg>
    );
  }
  if (family === 'windows') {
    // Windows flag
    return (
      <svg width={s} height={s} viewBox="0 0 10 10" fill="currentColor">
        <rect x="1" y="1" width="3.5" height="3.5" rx="0.3"/>
        <rect x="5.5" y="1" width="3.5" height="3.5" rx="0.3"/>
        <rect x="1" y="5.5" width="3.5" height="3.5" rx="0.3"/>
        <rect x="5.5" y="5.5" width="3.5" height="3.5" rx="0.3"/>
      </svg>
    );
  }
  // Linux — Tux penguin (simplified)
  return (
    <svg width={s} height={s} viewBox="0 0 10 10" fill="currentColor">
      {/* body */}
      <ellipse cx="5" cy="6.5" rx="3" ry="3" />
      {/* belly */}
      <ellipse cx="5" cy="7" rx="1.8" ry="2" fill="white" opacity="0.35"/>
      {/* head */}
      <ellipse cx="5" cy="2.8" rx="2" ry="2" />
      {/* eyes */}
      <circle cx="4.2" cy="2.3" r="0.4" fill="white"/>
      <circle cx="5.8" cy="2.3" r="0.4" fill="white"/>
      <circle cx="4.3" cy="2.3" r="0.2" fill="#111"/>
      <circle cx="5.9" cy="2.3" r="0.2" fill="#111"/>
      {/* beak */}
      <ellipse cx="5" cy="3.3" rx="0.6" ry="0.35" fill="#f90"/>
      {/* feet */}
      <ellipse cx="3.8" cy="9.5" rx="0.9" ry="0.4" fill="#f90"/>
      <ellipse cx="6.2" cy="9.5" rx="0.9" ry="0.4" fill="#f90"/>
    </svg>
  );
}

/** Sys lamp — OsIcon + small arrow overlay indicating load state. */
export function SysLamp({ sysState, t, size, osType }: {
  sysState: AlertState['sys'];
  t: TtTheme;
  size: 's' | 'm' | 'l';
  osType?: string;
}) {
  const iconSize = size === 'l' ? 14 : size === 's' ? 10 : 12;
  const arrowSize = Math.round(iconSize * 0.55);

  const color =
    sysState === 'spike'   ? t.crit :
    sysState === 'rising'  ? t.warn :
    sysState === 'falling' ? t.ok   : t.faint;

  const glow = (sysState === 'spike' || sysState === 'rising')
    ? `drop-shadow(0 0 4px ${color}88)` : undefined;

  const arrow =
    sysState === 'rising'  ? '↑' :
    sysState === 'falling' ? '↓' :
    sysState === 'spike'   ? '⚡' : null;

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color, filter: glow, lineHeight: 1 }}>
      <OsIcon size={iconSize} osType={osType} />
      {arrow && (
        <span style={{
          position: 'absolute', bottom: -2, right: -3,
          fontSize: arrowSize, lineHeight: 1,
          color,
          textShadow: `0 0 3px ${t.bg}`,
        }}>
          {arrow}
        </span>
      )}
    </span>
  );
}

const ALERT_DESCRIPTIONS: Record<string, string> = {
  'cpu-crit':      'CPU usage is critically high (>80%). Processes may be starved.',
  'cpu-warn':      'CPU usage is elevated (>60%). Monitor for sustained load.',
  'mem-crit':      'Memory usage is critically high (>90%). Risk of OOM.',
  'mem-warn':      'Memory usage is high (>75%). Consider freeing memory.',
  'disk-crit':     'Disk usage is critically high (>80%). Free space soon.',
  'disk-warn':     'Disk usage is elevated (>60%). Monitor available space.',
  'load-rise':     'System load is rising (1m avg > 15m avg). Workload increasing.',
  'load-fall':     'System load is falling (1m avg < 15m avg). Workload decreasing.',
  'load-spike':    'Sudden load spike detected. A process may have burst.',
  'net-saturated': 'Network throughput exceeds 200 MB/s. Interface may be saturated.',
  'net-high':      'Network throughput is high (>50 MB/s). Monitor for congestion.',
};

export function AlertLamps({ state, alerts, t, size, barWidth = 320, osType }: {
  state: AlertState;
  alerts: Alert[];
  t: TtTheme;
  size: 's' | 'm' | 'l';
  barWidth?: number;
  osType?: string;
}) {
  const desiredWidth = window.innerWidth < 640
    ? Math.min(barWidth / 2, window.innerWidth - 16)
    : Math.round(barWidth * 0.35);

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLSpanElement>(null);
  const iconSize = size === 'l' ? 14 : size === 's' ? 10 : 12;
  const fontSize = size === 'l' ? 12 : size === 's' ? 10 : 11;

  const pos = usePopupPosition(triggerRef, popupRef, open, desiredWidth);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
          popupRef.current && !popupRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  const hasAlerts = alerts.some(a => a.level !== 'ok' && !a.id.startsWith('load-')) || state.sys === 'rising' || state.sys === 'spike';

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* Lamps row — clickable */}
      <span
        ref={triggerRef}
        role="button"
        aria-expanded={open}
        aria-label="Alert indicators"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center',
          gap: size === 'l' ? 6 : size === 's' ? 4 : 5,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {(['cpu', 'mem', 'disk', 'net'] as const).map((key) => {
          const level = state[key];
          const alertColor = level === 'crit' ? t.crit : level === 'warn' ? t.warn : undefined;
          const color = alertColor ?? (level === 'ok' ? t.muted : t.faint);
          const glow = alertColor ? `drop-shadow(0 0 4px ${alertColor}88)` : undefined;
          const opacity = level === 'off' ? 0.25 : level === 'ok' ? 0.5 : 1;
          return (
            <span key={key} title={`${LAMP_TITLES[key]}: ${level}`} style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color,
              filter: glow,
              opacity,
              transition: 'color 0.3s, opacity 0.3s, filter 0.3s',
              flexShrink: 0, lineHeight: 1,
            }}>
              <MetricIcon type={key} size={iconSize} />
            </span>
          );
        })}
        {/* Sys lamp — OS icon with load state overlay */}
        <span title={`System load: ${state.sys}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1 }}>
          <SysLamp sysState={state.sys} t={t} size={size} osType={osType} />
        </span>
      </span>

      {/* Popup */}
      {open && (
        <span ref={popupRef} style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          width: pos.width,
          zIndex: 9999,
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: t.radius,
          boxShadow: `0 4px 16px ${t.shadowColor ?? '#0006'}`,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: t.font,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}>
          {/* Header */}
          <span style={{
            padding: '5px 10px',
            fontSize: fontSize - 1,
            color: t.muted,
            letterSpacing: '0.06em',
            borderBottom: `1px solid ${t.divider ?? t.border}`,
            background: t.bgAlt ?? t.bg,
            flexShrink: 0,
          }}>
            ALERTS
          </span>

          <span style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {!hasAlerts ? (
            <span style={{ padding: '4px 10px', fontSize, color: t.ok }}>
              ✓ All metrics within normal range
            </span>
          ) : (<>
            {alerts.filter(a => a.level !== 'ok' && !a.id.startsWith('load-')).map(alert => {
              const color = alert.level === 'crit' ? t.crit : t.warn;
              return (
                <span key={alert.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '4px 10px',
                  fontSize,
                  color: t.text,
                  lineHeight: 1.4,
                  minWidth: 0,
                }}>
                  <span style={{ color, flexShrink: 0, marginTop: 1 }}>
                    {alert.level === 'crit' ? '●' : '◐'}
                  </span>
                  <span style={{ minWidth: 0, overflow: 'hidden' }}>
                    <span style={{ color, fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alert.label}</span>
                    <span style={{ color: t.muted, fontSize: fontSize - 1, display: 'block', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {ALERT_DESCRIPTIONS[alert.id] ?? ''}
                    </span>
                  </span>
                </span>
              );
            })}
            {state.sys !== 'ok' && state.sys !== 'off' && (() => {
              const sysColor = state.sys === 'spike' ? t.crit : state.sys === 'rising' ? t.warn : t.ok;
              const sysId = state.sys === 'spike' ? 'load-spike' : state.sys === 'rising' ? 'load-rise' : 'load-fall';
              const sysLabel = state.sys === 'spike' ? '⚡ Load spike' : state.sys === 'rising' ? '↑ Load rising' : '↓ Load falling';
              return (
                <span style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '4px 10px', fontSize, color: t.text, lineHeight: 1.4, minWidth: 0,
                }}>
                  <span style={{ color: sysColor, flexShrink: 0, marginTop: 1 }}>
                    {state.sys === 'spike' ? '●' : state.sys === 'rising' ? '◐' : '○'}
                  </span>
                  <span style={{ minWidth: 0, overflow: 'hidden' }}>
                    <span style={{ color: sysColor, fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sysLabel}</span>
                    <span style={{ color: t.muted, fontSize: fontSize - 1, display: 'block', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {ALERT_DESCRIPTIONS[sysId] ?? ''}
                    </span>
                  </span>
                </span>
              );
            })()}
          </>)}
          </span>
        </span>
      )}
    </span>
  );
}
