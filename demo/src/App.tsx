import { useState, useEffect } from 'react';
import { TinyTrackProvider, ThemeProvider, THEMES } from 'tinytsdk/react';
import type { ThemePreset } from 'tinytsdk/react';
import { Nav } from './Nav.js';
import type { Route } from './Nav.js';
import { Introduction } from './pages/Introduction.js';
import { Installation } from './pages/Installation.js';
import { Themes } from './pages/Themes.js';
import { PageMetricsBar } from './pages/PageMetricsBar.js';
import { PageMetricsPanel } from './pages/PageMetricsPanel.js';
import { PageDashboard } from './pages/PageDashboard.js';
import { PageTimeSeriesChart } from './pages/PageTimeSeriesChart.js';
import { PageTimeline } from './pages/PageTimeline.js';
import './responsive.css';

const WS_URL = import.meta.env.VITE_WS_URL ?? `ws://${window.location.host}`;
const PRESETS: ThemePreset[] = ['terminal', 'dark', 'light', 'material', 'dracula', 'heroui'];

function PageContent({ route }: { route: Route }) {
  switch (route) {
    case 'introduction':
      return <Introduction />;
    case 'installation':
      return <Installation />;
    case 'themes':
      return <Themes />;
    case 'MetricsBar':
      return <PageMetricsBar />;
    case 'MetricsPanel':
      return <PageMetricsPanel />;
    case 'Dashboard':
      return <PageDashboard />;
    case 'TimeSeriesChart':
      return <PageTimeSeriesChart />;
    case 'Timeline':
      return <PageTimeline />;
  }
}

export default function App() {
  const [route, setRoute] = useState<Route>('introduction');
  const [preset, setPreset] = useState<ThemePreset>('terminal');
  const theme = THEMES[preset];

  useEffect(() => {
    document.body.style.background = theme.bg;
    document.body.style.color = theme.text;
    document.body.style.fontFamily = theme.font;
    document.body.style.margin = '0';
  }, [theme]);

  const handleRoute = (r: Route) => {
    setRoute(r);
    window.scrollTo(0, 0);
  };

  return (
    <TinyTrackProvider url={WS_URL}>
      <ThemeProvider preset={preset}>
        <div style={{ display: 'flex', minHeight: '100vh', background: theme.bg }}>
          <Nav route={route} onRoute={handleRoute} preset={preset} onPreset={setPreset} presets={PRESETS} />
          <main
            className="main-content"
            style={{
              flex: 1,
              padding: 40,
              overflowY: 'auto',
              maxWidth: 860,
              boxSizing: 'border-box',
            }}
          >
            <PageContent route={route} />
          </main>
        </div>
      </ThemeProvider>
    </TinyTrackProvider>
  );
}
