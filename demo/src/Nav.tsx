import { useState } from 'react';
import { useTheme } from 'tinytsdk/react';
import type { ThemePreset } from 'tinytsdk/react';

export type Route =
  | 'introduction'
  | 'installation'
  | 'themes'
  | 'MetricsBar'
  | 'MetricsPanel'
  | 'Dashboard'
  | 'TimeSeriesChart'
  | 'Timeline'
  | 'SystemLoad'
  | 'Metrics3D'
  | 'DiskMap'
  | 'RawPackets';

const NAV: { label: string; route: Route; group?: string }[] = [
  { label: 'Introduction', route: 'introduction' },
  { label: 'Installation', route: 'installation' },
  { label: 'Themes', route: 'themes' },
  { label: 'MetricsBar', route: 'MetricsBar', group: 'Components' },
  { label: 'MetricsPanel', route: 'MetricsPanel', group: 'Components' },
  { label: 'Dashboard', route: 'Dashboard', group: 'Components' },
  { label: 'TimeSeriesChart', route: 'TimeSeriesChart', group: 'Components' },
  { label: 'Timeline', route: 'Timeline', group: 'Components' },
  { label: 'SystemLoad', route: 'SystemLoad', group: 'Components' },
  { label: 'Metrics3D', route: 'Metrics3D', group: 'Components' },
  { label: 'DiskMap', route: 'DiskMap', group: 'Components' },
  { label: 'Raw Packets & Types', route: 'RawPackets', group: 'Advanced' },
];

interface NavProps {
  route: Route;
  onRoute: (r: Route) => void;
  preset: ThemePreset;
  onPreset: (p: ThemePreset) => void;
  presets: ThemePreset[];
}

export function Nav({ route, onRoute, preset, onPreset, presets }: NavProps) {
  const t = useTheme();
  const [open, setOpen] = useState(false);

  const navContent = (
    <>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: t.font, letterSpacing: 0.5 }}>
          TinyTrack SDK
        </div>
        <div style={{ fontSize: 10, color: t.muted, fontFamily: t.font }}>Documentation</div>
      </div>

      {/* Nav items */}
      {(() => {
        let lastGroup = '';
        return NAV.map((item) => {
          const showGroup = item.group && item.group !== lastGroup;
          if (item.group) lastGroup = item.group;
          return (
            <div key={item.route}>
              {showGroup && (
                <div
                  style={{
                    fontSize: 10,
                    color: t.faint,
                    fontFamily: t.font,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    padding: '12px 8px 4px',
                  }}
                >
                  {item.group}
                </div>
              )}
              <button
                onClick={() => {
                  onRoute(item.route);
                  setOpen(false);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: t.font,
                  borderRadius: t.radius,
                  background: route === item.route ? t.btnBg : 'transparent',
                  color: route === item.route ? t.text : t.muted,
                  transition: t.transition,
                  borderLeft: route === item.route ? `2px solid ${t.cpu}` : '2px solid transparent',
                }}
              >
                {item.label}
              </button>
            </div>
          );
        });
      })()}

      <div style={{ flex: 1 }} />
      <div style={{ height: 1, background: t.divider, margin: '12px 0' }} />

      {/* Theme picker */}
      <div
        style={{
          fontSize: 10,
          color: t.faint,
          fontFamily: t.font,
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 6,
        }}
      >
        Theme
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => onPreset(p)}
            style={{
              fontSize: 10,
              padding: '2px 7px',
              border: `1px solid ${preset === p ? t.cpu : t.border}`,
              borderRadius: 99,
              cursor: 'pointer',
              fontFamily: t.font,
              background: preset === p ? t.cpu + '22' : 'transparent',
              color: preset === p ? t.cpu : t.muted,
              transition: t.transition,
            }}
          >
            {p}
          </button>
        ))}
      </div>

      <div style={{ height: 1, background: t.divider, margin: '12px 0' }} />
      <a
        href="https://github.com/jetallavache/tiny-track"
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: 11, color: t.faint, textDecoration: 'none', fontFamily: t.font }}
      >
        GitHub ↗
      </a>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        style={
          {
            width: 220,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 12px',
            background: t.surface,
            borderRight: `1px solid ${t.border}`,
            height: '100vh',
            position: 'sticky',
            top: 0,
            overflowY: 'auto',
            boxSizing: 'border-box',
            // hide on mobile
            '@media (max-width: 768px)': { display: 'none' },
          } as React.CSSProperties
        }
        className="sidebar-desktop"
      >
        {navContent}
      </nav>

      {/* Mobile top bar */}
      <div
        style={
          {
            display: 'none',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            background: t.surface,
            borderBottom: `1px solid ${t.border}`,
            padding: '10px 16px',
            alignItems: 'center',
            justifyContent: 'space-between',
          } as React.CSSProperties
        }
        className="topbar-mobile"
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: t.text, fontFamily: t.font }}>TinyTrack SDK</span>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            background: t.btnBg,
            border: `1px solid ${t.border}`,
            borderRadius: t.radius,
            color: t.text,
            cursor: 'pointer',
            padding: '4px 10px',
            fontSize: 16,
          }}
        >
          ☰
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
          }}
        >
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }} onClick={() => setOpen(false)} />
          <div
            style={{
              width: 260,
              background: t.surface,
              borderLeft: `1px solid ${t.border}`,
              padding: '24px 12px',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              height: '100vh',
            }}
          >
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
