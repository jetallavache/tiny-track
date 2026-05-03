import { useEffect } from 'react';
import { useTheme } from 'tinytsdk/react';
import { PageTitle, PageSection, CodeBlock, Divider } from '../components.js';

/* ---------------------------------------------------------------------------
 * Anchor helper — scrolls to section when hash matches
 * ------------------------------------------------------------------------- */
function Anchor({ id }: { id: string }) {
  return <span id={id} style={{ display: 'block', position: 'relative', top: -80 }} />;
}

function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <a
      href={href}
      style={{ color: t.cpu, textDecoration: 'none', fontFamily: t.font, fontSize: 13 }}
      onClick={(e) => {
        e.preventDefault();
        const id = href.replace('#', '');
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }}
    >
      {children}
    </a>
  );
}

function Alert({ type, children }: { type: 'warn' | 'error' | 'info'; children: React.ReactNode }) {
  const t = useTheme();
  const colors = { warn: t.load ?? '#f59e0b', error: '#ef4444', info: t.cpu };
  const c = colors[type];
  return (
    <div style={{
      border: `1px solid ${c}44`,
      background: `${c}11`,
      borderRadius: t.radius,
      padding: '10px 14px',
      fontSize: 13,
      color: t.text,
      fontFamily: t.font,
      lineHeight: 1.7,
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Table of contents
 * ------------------------------------------------------------------------- */
const TOC = [
  { id: 'install-native',    label: 'Native install (tinytd + tinytrack)' },
  { id: 'install-docker',    label: 'Docker' },
  { id: 'install-compose',   label: 'Docker Compose' },
  { id: 'config-gateway',    label: 'Gateway configuration' },
  { id: 'config-auth',       label: 'Authentication' },
  { id: 'config-cors',       label: 'CORS' },
  { id: 'config-tls',        label: 'TLS' },
  { id: 'api',               label: 'REST API v1' },
  { id: 'api-endpoints',     label: '↳ Endpoints' },
  { id: 'api-formats',       label: '↳ Content negotiation' },
  { id: 'api-auth',          label: '↳ API authentication' },
  { id: 'troubleshooting',   label: 'Troubleshooting' },
  { id: 'no-mmap',           label: '↳ Cannot open shared memory' },
  { id: 'stale-mmap',        label: '↳ Stale mmap / tinytd not running' },
  { id: 'daemon-stopped',    label: '↳ tinytd stopped at runtime' },
  { id: 'port-in-use',       label: '↳ Port already in use' },
  { id: 'drop-privileges',   label: '↳ Cannot drop privileges' },
  { id: 'tls-config',        label: '↳ TLS configuration error' },
  { id: 'tls-init',          label: '↳ TLS context init failed' },
];

export function PageDocs() {
  const t = useTheme();

  /* Scroll to anchor on mount if hash is present */
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  const p: React.CSSProperties = { fontSize: 13, color: t.muted, fontFamily: t.font, lineHeight: 1.8, marginBottom: 12 };
  const h3: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: t.text, fontFamily: t.font, margin: '20px 0 8px' };

  return (
    <div style={{ maxWidth: 860 }}>
      <PageTitle
        title="Server Documentation"
        desc="Installation, configuration, and troubleshooting for tinytd and tinytrack gateway."
      />

      {/* Table of contents */}
      <div style={{
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        padding: '14px 18px',
        marginBottom: 32,
        background: t.surface,
      }}>
        <div style={{ fontSize: 11, color: t.muted, fontFamily: t.font, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Contents
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TOC.map(({ id, label }) => (
            <SectionLink key={id} href={`#${id}`}>{label}</SectionLink>
          ))}
        </div>
      </div>

      {/* ── Native install ─────────────────────────────────────────── */}
      <Anchor id="install-native" />
      <PageSection title="Native install">
        <p style={p}>
          Requires: Linux, GCC ≥ 11, autotools, libssl-dev, libncurses-dev.
        </p>
        <CodeBlock code={`# Clone and build
git clone https://github.com/jetallavache/tinytrack.git
cd tinytrack/server
./bootstrap.sh
./configure
make -j$(nproc)
sudo make install

# Create system user
sudo groupadd --system tinytrack
sudo useradd --system --no-create-home --shell /usr/sbin/nologin \\
  --gid tinytrack tinytrack

# Enable and start
sudo systemctl enable --now tinytd tinytrack`} />

        <h3 style={h3}>Verify</h3>
        <CodeBlock code={`systemctl status tinytd tinytrack
tiny-cli status`} />
      </PageSection>

      <Divider />

      {/* ── Docker ─────────────────────────────────────────────────── */}
      <Anchor id="install-docker" />
      <PageSection title="Docker">
        <CodeBlock code={`docker run -d --name tinytrack \\
  -p 25015:25015 \\
  -v /proc:/host/proc:ro \\
  -v /:/host/rootfs:ro \\
  -v /dev/shm:/dev/shm \\
  -e TT_PROC_ROOT=/host/proc \\
  -e TT_ROOTFS_PATH=/host/rootfs \\
  jetallavache/tinytrack:latest`} />

        <h3 style={h3}>Environment variables</h3>
        <div style={{ overflowX: 'auto', borderRadius: t.radius, border: `1px solid ${t.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: t.font, fontSize: 12 }}>
            <thead>
              <tr style={{ background: t.surface }}>
                {['Variable', 'Default', 'Description'].map(h => (
                  <th key={h} style={{ padding: '6px 12px', textAlign: 'left', color: t.muted, borderBottom: `1px solid ${t.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['TT_HOSTNAME', '0.0.0.0', 'Bind address'],
                ['TT_PORT', '25015', 'Listen port'],
                ['TT_AUTH_TOKEN', '(disabled)', 'Shared secret for auth'],
                ['TT_TLS', 'false', 'Enable TLS (true/false)'],
                ['TT_TLS_CERT', '', 'Path to PEM certificate'],
                ['TT_TLS_KEY', '', 'Path to PEM private key'],
                ['TT_CORS_ORIGINS', '(disabled)', 'Allowed origins or *'],
                ['TT_LOG_LEVEL', 'info', 'debug/info/notice/warning/error'],
                ['TT_LOG_BACKEND', 'docker', 'docker/stdout/stderr'],
                ['TT_PROC_ROOT', '/host/proc', 'Path to host /proc'],
                ['TT_ROOTFS_PATH', '/host/rootfs', 'Path to host /'],
              ].map(([v, d, desc]) => (
                <tr key={v}>
                  <td style={{ padding: '5px 12px', borderBottom: `1px solid ${t.divider}` }}>
                    <code style={{ fontFamily: 'monospace', color: t.cpu, fontSize: 11 }}>{v}</code>
                  </td>
                  <td style={{ padding: '5px 12px', borderBottom: `1px solid ${t.divider}`, color: t.muted }}>{d}</td>
                  <td style={{ padding: '5px 12px', borderBottom: `1px solid ${t.divider}`, color: t.muted }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>

      <Divider />

      {/* ── Docker Compose ─────────────────────────────────────────── */}
      <Anchor id="install-compose" />
      <PageSection title="Docker Compose">
        <CodeBlock code={`services:
  tinytrack:
    image: jetallavache/tinytrack:latest
    ports:
      - "25015:25015"
    volumes:
      - /proc:/host/proc:ro
      - /:/host/rootfs:ro
      - /dev/shm:/dev/shm
    environment:
      TT_PROC_ROOT: /host/proc
      TT_ROOTFS_PATH: /host/rootfs
      # TT_AUTH_TOKEN: changeme
      # TT_CORS_ORIGINS: https://dashboard.example.com
    restart: unless-stopped`} />
      </PageSection>

      <Divider />

      {/* ── Gateway config ─────────────────────────────────────────── */}
      <Anchor id="config-gateway" />
      <PageSection title="Gateway configuration">
        <p style={p}>
          Default config path: <code style={{ fontFamily: 'monospace', color: t.cpu }}>/etc/tinytrack/tinytrack.conf</code>
        </p>
        <CodeBlock code={`[gateway]
hostname        = 0.0.0.0   # bind address
port            = 25015      # listen port
update_interval = 1000       # push interval to clients, ms
max_connections = 128
header_timeout_ms = 5000`} />
      </PageSection>

      <Divider />

      {/* ── Auth ───────────────────────────────────────────────────── */}
      <Anchor id="config-auth" />
      <PageSection title="Authentication">
        <p style={p}>
          TinyTrack uses a shared secret (like Redis <code style={{ fontFamily: 'monospace', color: t.cpu }}>requirepass</code>).
          Clients authenticate via Bearer header or <code style={{ fontFamily: 'monospace', color: t.cpu }}>CMD_AUTH</code> as the first WebSocket message.
        </p>
        <CodeBlock code={`[gateway]
auth_token      = your-secret-here
auth_timeout_ms = 5000   # ms to wait for CMD_AUTH`} />

        <h3 style={h3}>SDK usage</h3>
        <CodeBlock code={`// Token is sent automatically on PKT_AUTH_REQ
const client = new TinyTrackClient('ws://host:25015', {
  token: 'your-secret-here',
});`} />

        <h3 style={h3}>curl / Bearer header</h3>
        <CodeBlock code={`# WebSocket upgrade with Bearer token
curl -i -N \\
  -H "Authorization: Bearer your-secret-here" \\
  -H "Upgrade: websocket" \\
  -H "Connection: Upgrade" \\
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \\
  -H "Sec-WebSocket-Version: 13" \\
  http://localhost:25015/websocket`} />
      </PageSection>

      <Divider />

      {/* ── CORS ───────────────────────────────────────────────────── */}
      <Anchor id="config-cors" />
      <PageSection title="CORS">
        <Alert type="warn">
          <strong>Security note:</strong> <code style={{ fontFamily: 'monospace' }}>cors_origins = *</code> disables
          credential forwarding. Use a specific origin whitelist in production.
        </Alert>
        <CodeBlock code={`[gateway]
# Development — allow all origins (no credentials)
cors_origins = *

# Production — whitelist specific origins
cors_origins = https://dashboard.example.com,http://localhost:3000`} />
      </PageSection>

      <Divider />

      {/* ── TLS ────────────────────────────────────────────────────── */}
      <Anchor id="config-tls" />
      <PageSection title="TLS">
        <CodeBlock code={`# Generate self-signed cert (testing only)
openssl req -x509 -newkey rsa:4096 \\
  -keyout server.key -out server.crt \\
  -days 365 -nodes -subj '/CN=localhost'`} />
        <CodeBlock code={`[gateway]
tls      = true
tls_cert = /etc/tinytrack/server.crt
tls_key  = /etc/tinytrack/server.key
# tls_ca = /etc/tinytrack/ca.crt   # optional, for client cert auth`} />
      </PageSection>

      <Divider />

      {/* ── REST API v1 ────────────────────────────────────────────── */}
      <Anchor id="api" />
      <PageSection title="REST API v1">
        <p style={p}>
          All HTTP endpoints are versioned under <code style={{ fontFamily: 'monospace', color: t.cpu }}>/v1/</code>.
          TLS, authentication, and CORS apply uniformly to all connections.
        </p>

        <Anchor id="api-endpoints" />
        <h3 style={h3}>Endpoints</h3>
        <div style={{ overflowX: 'auto', borderRadius: t.radius, border: `1px solid ${t.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: t.font, fontSize: 12 }}>
            <thead>
              <tr style={{ background: t.surface }}>
                {['Method', 'URL', 'Auth', 'Description'].map(h => (
                  <th key={h} style={{ padding: '6px 12px', textAlign: 'left', color: t.muted, borderBottom: `1px solid ${t.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['WS', '/v1/stream', '✓', 'Binary protocol v1/v2, real-time streaming'],
                ['WS', '/websocket', '✓', 'Legacy alias'],
                ['GET', '/v1/metrics', '✓', 'Metrics snapshot (json/csv/xml/prometheus)'],
                ['GET', '/v1/sysinfo', '✓', 'System info: hostname, OS, uptime, ring config'],
                ['GET', '/v1/status', '—', 'Health check — public, no auth'],
                ['POST', '/v1/stream/pause', '✓', 'Pause metrics push to all WS clients'],
                ['POST', '/v1/stream/resume', '✓', 'Resume metrics push'],
              ].map(([m, url, auth, desc]) => (
                <tr key={url}>
                  <td style={{ padding: '5px 12px', borderBottom: `1px solid ${t.divider}` }}>
                    <code style={{ fontFamily: 'monospace', color: t.cpu, fontSize: 11 }}>{m}</code>
                  </td>
                  <td style={{ padding: '5px 12px', borderBottom: `1px solid ${t.divider}` }}>
                    <code style={{ fontFamily: 'monospace', color: t.text, fontSize: 11 }}>{url}</code>
                  </td>
                  <td style={{ padding: '5px 12px', borderBottom: `1px solid ${t.divider}`, color: auth === '✓' ? t.cpu : t.muted }}>{auth}</td>
                  <td style={{ padding: '5px 12px', borderBottom: `1px solid ${t.divider}`, color: t.muted }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Anchor id="api-formats" />
        <h3 style={h3}>Content negotiation</h3>
        <CodeBlock code={`# JSON (default)
curl http://host:25015/v1/metrics

# CSV / XML / Prometheus
curl "http://host:25015/v1/metrics?format=csv"
curl "http://host:25015/v1/metrics?format=xml"
curl "http://host:25015/v1/metrics?format=prometheus"

# Via Accept header
curl -H "Accept: text/plain" http://host:25015/v1/metrics`} />

        <Anchor id="api-auth" />
        <h3 style={h3}>API authentication</h3>
        <p style={p}>
          When <code style={{ fontFamily: 'monospace', color: t.cpu }}>auth_token</code> is configured,
          all <code style={{ fontFamily: 'monospace', color: t.cpu }}>/v1/*</code> endpoints except{' '}
          <code style={{ fontFamily: 'monospace', color: t.cpu }}>/v1/status</code> require a Bearer token.
        </p>
        <CodeBlock code={`curl -H "Authorization: Bearer your-token" http://host:25015/v1/metrics

# Prometheus scrape with auth
scrape_configs:
  - job_name: tinytrack
    metrics_path: /v1/metrics
    params: { format: [prometheus] }
    static_configs:
      - targets: ['host:25015']
    authorization:
      credentials: your-token`} />
      </PageSection>

      <Divider />

      {/* ── Troubleshooting ────────────────────────────────────────── */}
      <Anchor id="troubleshooting" />
      <PageSection title="Troubleshooting">

        {/* no-mmap */}
        <Anchor id="no-mmap" />
        <h3 style={{ ...h3, color: '#ef4444' }}>Cannot open shared memory</h3>
        <Alert type="error">
          <code style={{ fontFamily: 'monospace' }}>ERROR  Cannot open shared memory: /dev/shm/tinytd-live.dat</code>
        </Alert>
        <p style={p}><strong>Cause:</strong> tinytd is not running or the mmap file path is wrong.</p>
        <CodeBlock code={`# Check if tinytd is running
systemctl status tinytd
# or
pgrep -a tinytd

# Start tinytd
sudo systemctl start tinytd

# Verify mmap file exists
ls -lh /dev/shm/tinytd-live.dat

# Check config path matches
grep live_path /etc/tinytrack/tinytrack.conf`} />

        <Divider />

        {/* stale-mmap */}
        <Anchor id="stale-mmap" />
        <h3 style={{ ...h3, color: '#f59e0b' }}>Stale mmap / tinytd not running</h3>
        <Alert type="warn">
          <code style={{ fontFamily: 'monospace' }}>WARN   Daemon tinytd pid=1234 not found — mmap may be stale</code>
        </Alert>
        <p style={p}>
          <strong>Cause:</strong> The mmap file exists from a previous run but tinytd is no longer alive.
          Gateway will serve stale data.
        </p>
        <CodeBlock code={`# Restart tinytd — it will recreate the mmap
sudo systemctl restart tinytd

# Or remove stale file and restart
sudo rm /dev/shm/tinytd-live.dat
sudo systemctl start tinytd`} />

        <Divider />

        {/* daemon-stopped */}
        <Anchor id="daemon-stopped" />
        <h3 style={{ ...h3, color: '#ef4444' }}>tinytd stopped at runtime</h3>
        <Alert type="error">
          <code style={{ fontFamily: 'monospace' }}>ERROR  Daemon tinytd stopped — no update for 10500ms, disconnecting clients</code>
        </Alert>
        <p style={p}>
          <strong>Cause:</strong> tinytd crashed or was killed while gateway was running.
          All WebSocket clients receive a <code style={{ fontFamily: 'monospace' }}>PKT_ALERT CRITICAL</code> and are disconnected.
        </p>
        <CodeBlock code={`# Check tinytd logs
journalctl -u tinytd -n 50 --no-pager
# or
sudo systemctl status tinytd

# Restart
sudo systemctl restart tinytd
# Gateway will automatically resume streaming once tinytd writes new data`} />

        <Divider />

        {/* port-in-use */}
        <Anchor id="port-in-use" />
        <h3 style={{ ...h3, color: '#ef4444' }}>Port already in use</h3>
        <Alert type="error">
          <code style={{ fontFamily: 'monospace' }}>ERROR  Cannot bind to port 25015: Address already in use (errno=98)</code>
        </Alert>
        <CodeBlock code={`# Find what is using the port
ss -tlnp | grep 25015
# or
lsof -i :25015

# Kill the conflicting process or change the port in config
[gateway]
port = 25016`} />

        <Divider />

        {/* drop-privileges */}
        <Anchor id="drop-privileges" />
        <h3 style={{ ...h3, color: '#ef4444' }}>Cannot drop privileges</h3>
        <Alert type="error">
          <code style={{ fontFamily: 'monospace' }}>ERROR  Privileges cannot drop to tinytrack:tinytrack</code>
        </Alert>
        <p style={p}><strong>Cause:</strong> The system user/group does not exist.</p>
        <CodeBlock code={`# Create system user and group
sudo groupadd --system tinytrack
sudo useradd --system --no-create-home \\
  --shell /usr/sbin/nologin --gid tinytrack tinytrack`} />

        <Divider />

        {/* tls-config */}
        <Anchor id="tls-config" />
        <h3 style={{ ...h3, color: '#ef4444' }}>TLS configuration error</h3>
        <Alert type="error">
          <code style={{ fontFamily: 'monospace' }}>ERROR  TLS cert or key not set (tls=true requires tls_cert + tls_key)</code>
        </Alert>
        <p style={p}>Set both <code style={{ fontFamily: 'monospace', color: t.cpu }}>tls_cert</code> and <code style={{ fontFamily: 'monospace', color: t.cpu }}>tls_key</code> in config, or set <code style={{ fontFamily: 'monospace', color: t.cpu }}>tls = false</code>.</p>
        <CodeBlock code={`[gateway]
tls      = true
tls_cert = /etc/tinytrack/server.crt
tls_key  = /etc/tinytrack/server.key`} />

        <Divider />

        {/* tls-init */}
        <Anchor id="tls-init" />
        <h3 style={{ ...h3, color: '#ef4444' }}>TLS context init failed</h3>
        <Alert type="error">
          <code style={{ fontFamily: 'monospace' }}>ERROR  TLS context init failed — check cert/key files</code>
        </Alert>
        <p style={p}>The cert or key file is missing, unreadable, or mismatched.</p>
        <CodeBlock code={`# Verify files exist and are readable
ls -l /etc/tinytrack/server.crt /etc/tinytrack/server.key

# Check cert/key match
openssl x509 -noout -modulus -in server.crt | md5sum
openssl rsa  -noout -modulus -in server.key | md5sum
# Both hashes must match

# Check cert validity
openssl x509 -noout -dates -in server.crt`} />

      </PageSection>
    </div>
  );
}
