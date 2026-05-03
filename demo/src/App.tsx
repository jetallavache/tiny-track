import { useState, useEffect } from 'react';
import { TinyTrackProvider, ThemeProvider, THEMES } from 'tinytsdk/react';
import type { ThemePreset } from 'tinytsdk/react';
import { Nav } from './Nav.js';
import type { Route } from './Nav.js';
import { Footer } from './Footer.js';
import { PageHome } from './pages/PageHome.js';
import { PageServerOverview } from './pages/PageServerOverview.js';
import { PageServerInstall } from './pages/PageServerInstall.js';
import { PageServerDocker } from './pages/PageServerDocker.js';
import { PageServerConfig } from './pages/PageServerConfig.js';
import { PageCliOverview } from './pages/PageCliOverview.js';
import { Introduction } from './pages/Introduction.js';
import { Installation } from './pages/Installation.js';
import { PageDocs } from './pages/PageDocs.js';
import { Themes } from './pages/Themes.js';
import { PageMetricsBar } from './pages/PageMetricsBar.js';
import { PageMetricsPanel } from './pages/PageMetricsPanel.js';
import { PageDashboard } from './pages/PageDashboard.js';
import { PageDashboardV2 } from './pages/PageDashboardV2.js';
import { PageDashboardComponents } from './pages/PageDashboardComponents.js';
import { PageTimeSeriesChartAutoLevel } from './pages/PageTimeSeriesChartAutoLevel.js';
import { PageTimelineWithLazyLoad } from './pages/PageTimelineWithLazyLoad.js';
import { PageTimeSeriesChart } from './pages/PageTimeSeriesChart.js';
import { PageTimeline } from './pages/PageTimeline.js';
import { PageSystemLoad } from './pages/PageSystemLoad.js';
import { PageMetrics3D } from './pages/PageMetrics3D.js';
import { PageDiskMap } from './pages/PageDiskMap.js';
import { PageRawPackets } from './pages/PageRawPackets.js';

const WS_URL   = import.meta.env.VITE_WS_URL   ?? 'ws://0.0.0.0:14020';
const WS_TOKEN = import.meta.env.VITE_WS_TOKEN ?? 'qwerty';
const PRESETS: ThemePreset[] = ['terminal', 'dark', 'light', 'material', 'dracula', 'heroui'];

function PageContent({ route }: { route: Route }) {
  switch (route) {
    case 'home':                return <PageHome />;
    case 'server-overview':     return <PageServerOverview />;
    case 'server-install':      return <PageServerInstall />;
    case 'server-docker':       return <PageServerDocker />;
    case 'server-config':       return <PageServerConfig />;
    case 'cli-overview':        return <PageCliOverview />;
    case 'sdk-introduction':    return <Introduction />;
    case 'sdk-installation':    return <Installation />;
    case 'sdk-docs':            return <PageDocs />;
    case 'sdk-themes':          return <Themes />;
    case 'MetricsBar':          return <PageMetricsBar />;
    case 'MetricsPanel':        return <PageMetricsPanel />;
    case 'Dashboard':           return <PageDashboard />;
    case 'DashboardV2':         return <PageDashboardV2 />;
    case 'DashboardComponents': return <PageDashboardComponents />;
    case 'TimeSeriesChart':     return <PageTimeSeriesChart />;
    case 'TimeSeriesChartAutoLevel': return <PageTimeSeriesChartAutoLevel />;
    case 'Timeline':            return <PageTimeline />;
    case 'TimelineWithLazyLoad': return <PageTimelineWithLazyLoad />;
    case 'SystemLoad':          return <PageSystemLoad />;
    case 'Metrics3D':           return <PageMetrics3D />;
    case 'DiskMap':             return <PageDiskMap />;
    case 'RawPackets':          return <PageRawPackets />;
  }
}

export default function App() {
  const [route, setRoute] = useState<Route>('home');
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
    <TinyTrackProvider url={WS_URL} token={WS_TOKEN || undefined}>
      <ThemeProvider preset={preset}>
        <div style={{ display: 'flex', minHeight: '100vh', background: theme.bg, flexDirection: 'column' }}>
          <div style={{ display: 'flex', flex: 1 }}>
            <Nav route={route} onRoute={handleRoute} preset={preset} onPreset={setPreset} presets={PRESETS} />
            <main
              className="main-content"
              style={{
                flex: 1,
                padding: 40,
                overflowY: 'auto',
                minWidth: 0,
                boxSizing: 'border-box',
              }}
            >
              <PageContent route={route} />
            </main>
          </div>
          <Footer />
        </div>
      </ThemeProvider>
    </TinyTrackProvider>
  );
}
