import { CSSProperties } from 'react';
import { useTheme } from '../../theme.js';
import { TtSysInfo } from '../../../client.js';
import { fmtUptimeSec } from '../../utils/format.js';

export interface SystemInfoRowProps {
  sysinfo?: TtSysInfo;
  style?: CSSProperties;
}

export function SystemInfoRow({ sysinfo, style }: SystemInfoRowProps) {
  const { theme: t } = useTheme();

  if (!sysinfo) return null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12,
        padding: 12,
        background: t.surface,
        borderRadius: t.radius,
        border: `1px solid ${t.border}`,
        ...style,
      }}
    >
      <div>
        <div style={{ fontSize: 10, color: t.muted, fontFamily: t.font, marginBottom: 4 }}>Hostname</div>
        <div style={{ fontSize: 13, color: t.text, fontFamily: 'monospace', fontWeight: 500 }}>
          {sysinfo.hostname || '—'}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, color: t.muted, fontFamily: t.font, marginBottom: 4 }}>OS</div>
        <div style={{ fontSize: 13, color: t.text, fontFamily: 'monospace', fontWeight: 500 }}>
          {sysinfo.osType || '—'}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, color: t.muted, fontFamily: t.font, marginBottom: 4 }}>Uptime</div>
        <div style={{ fontSize: 13, color: t.text, fontFamily: 'monospace', fontWeight: 500 }}>
          {fmtUptimeSec(sysinfo.uptimeSec)}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, color: t.muted, fontFamily: t.font, marginBottom: 4 }}>Interval</div>
        <div style={{ fontSize: 13, color: t.text, fontFamily: 'monospace', fontWeight: 500 }}>
          {sysinfo.intervalMs}ms
        </div>
      </div>
    </div>
  );
}
