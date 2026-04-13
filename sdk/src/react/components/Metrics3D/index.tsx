/**
 * Metrics3D — 3D bar chart visualisation of metric history using three.js.
 *
 * Each metric is rendered as a column of bars along the X-axis.
 * The Z-axis represents time (newest bars at Z=0, oldest at Z=depth).
 *
 * v2 additions:
 *  - Hover tooltip on bars (metric name, current %, session min/max)
 *  - Text summary overlay (all metrics at a glance)
 *  - Pause button — freezes animation and data updates
 *  - Camera presets: overview / close-up / top-down
 *
 * Requires `three` as a peer dependency:
 *   npm install three
 */
import { useEffect, useRef, useState, useCallback, CSSProperties } from 'react';
import { useMetrics } from '../../TinyTrackProvider.js';
import { useTheme, TtTheme } from '../../theme.js';
import {
  MetricType,
  SizeType,
  SIZE_SCALE,
  extractMetricValue,
  METRIC_COLOR_KEY,
  METRIC_LABEL,
} from '../../utils/metrics.js';
import { fmtPct, fmtLoad, fmtBytes } from '../../utils/format.js';

export interface Metrics3DProps {
  /** Metrics to visualise as 3D bar columns. Default: ['cpu', 'mem', 'disk']. */
  metrics?: MetricType[];
  /** Number of time-steps to keep in the 3D scene. Default: 40. */
  historyDepth?: number;
  /** Component size variant. Default: 'm'. */
  size?: SizeType;
  className?: string;
  style?: CSSProperties;
  /** Override theme tokens for this instance only. */
  theme?: Partial<TtTheme>;
}

type CameraPreset = 'overview' | 'close' | 'top';

/** Convert a CSS hex color string to a three.js integer color. */
function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/** Format a raw metric value for display in the overlay. */
function fmtVal(val: number, metric: MetricType): string {
  if (metric === 'cpu' || metric === 'mem' || metric === 'disk') return fmtPct(val);
  if (metric === 'load') return fmtLoad(val);
  return fmtBytes(val) + '/s';
}

/**
 * 3D bar chart powered by three.js.
 *
 * @param props.metrics      - Which metrics to render as separate bar columns.
 * @param props.historyDepth - How many time-steps to keep visible in the scene.
 * @param props.size         - 's' | 'm' | 'l' — scales canvas dimensions.
 */
export function Metrics3D({
  metrics = ['cpu', 'mem', 'disk'],
  historyDepth = 40,
  size = 'm',
  className,
  style,
  theme: themeProp,
}: Metrics3DProps) {
  const base = useTheme();
  const t = themeProp ? { ...base, ...themeProp } : base;
  const sc = SIZE_SCALE[size];
  const W = Math.round(sc.chartH * 2.2);
  const H = Math.round(sc.chartH * 1.4);

  const mountRef = useRef<HTMLDivElement>(null);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const sceneRef = useRef<{
    renderer: any;
    scene: any;
    camera: any;
    bars: any[][];
    frameId: number;
  } | null>(null);

  const historyRef = useRef<number[][]>([]);
  const pausedRef = useRef(false);
  const cameraPresetRef = useRef<CameraPreset>('overview');

  const [paused, setPaused] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('overview');

  // Session min/max per metric
  const sessionRef = useRef<{ min: number[]; max: number[] } | null>(null);
  const [summary, setSummary] = useState<{ label: string; val: number; min: number; max: number; color: string }[]>([]);

  // Hover tooltip state
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const { metrics: m } = useMetrics();

  /* Keep refs in sync with state so animation loop can read them */
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    cameraPresetRef.current = cameraPreset;
  }, [cameraPreset]);

  /* Camera position for each preset */
  const applyCameraPreset = useCallback(
    (preset: CameraPreset, camera: any, THREE: any) => {
      const mx = metrics.length;
      const mz = historyDepth;
      if (preset === 'overview') {
        camera.position.set(mx * 1.2, 4, mz * 0.35);
        camera.lookAt(mx * 0.5, 0, mz * 0.15);
      } else if (preset === 'close') {
        camera.position.set(mx * 0.5, 2, mz * 0.15);
        camera.lookAt(mx * 0.5, 0, 0);
      } else {
        camera.position.set(mx * 0.5, 12, mz * 0.15);
        camera.lookAt(mx * 0.5, 0, mz * 0.15);
      }
    },
    [metrics.length, historyDepth],
  );

  /* Init Three.js scene once per mount */
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    let cancelled = false;

    import('three').then((THREE) => {
      if (cancelled || !mountRef.current) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(window.devicePixelRatio);
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
      camera.position.set(metrics.length * 1.2, 4, historyDepth * 0.35);
      camera.lookAt(metrics.length * 0.5, 0, historyDepth * 0.15);

      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dir = new THREE.DirectionalLight(0xffffff, 0.8);
      dir.position.set(5, 10, 5);
      scene.add(dir);

      const bars: any[][] = metrics.map((metric, mi) =>
        Array.from({ length: historyDepth }, (_, zi) => {
          const geo = new THREE.BoxGeometry(0.7, 1, 0.7);
          const mat = new THREE.MeshLambertMaterial({
            color: hexToInt(t[METRIC_COLOR_KEY[metric]]),
            transparent: true,
            opacity: 0.85,
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(mi * 1.2, 0, zi * 0.9);
          scene.add(mesh);
          return mesh;
        }),
      );

      const grid = new THREE.GridHelper(metrics.length * 1.5 + 1, metrics.length + 1, 0x333333, 0x222222);
      grid.position.set(metrics.length * 0.5, -0.01, historyDepth * 0.45);
      scene.add(grid);

      // Raycaster for hover
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const onMouseMove = (e: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const allBars = ([] as any[]).concat(...bars);
        const hits = raycaster.intersectObjects(allBars);
        if (hits.length > 0) {
          const hit = hits[0].object;
          let mi = -1,
            zi = -1;
          outer: for (let i = 0; i < bars.length; i++) {
            for (let j = 0; j < bars[i].length; j++) {
              if (bars[i][j] === hit) {
                mi = i;
                zi = j;
                break outer;
              }
            }
          }
          if (mi >= 0) {
            const metric = metrics[mi];
            const hist = historyRef.current;
            const rawVal = hist[zi]?.[mi] ?? 0;
            const sess = sessionRef.current;
            const minVal = sess?.min[mi] ?? rawVal;
            const maxVal = sess?.max[mi] ?? rawVal;
            const label = METRIC_LABEL[metric];
            const text = `${label}: ${fmtVal(rawVal * 10000, metric)}\nmin: ${fmtVal(minVal * 10000, metric)}  max: ${fmtVal(maxVal * 10000, metric)}`;
            setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, text });
          }
        } else {
          setTooltip(null);
        }
      };

      renderer.domElement.addEventListener('mousemove', onMouseMove);
      renderer.domElement.addEventListener('mouseleave', () => setTooltip(null));

      let frameId = 0;
      const animate = () => {
        frameId = requestAnimationFrame(animate);
        if (!pausedRef.current) {
          if (cameraPresetRef.current === 'overview') {
            camera.position.x = metrics.length * 0.5 + Math.sin(Date.now() / 8000) * (metrics.length * 1.5 + 2);
            camera.position.z = historyDepth * 0.35 + Math.cos(Date.now() / 8000) * 2;
            camera.lookAt(metrics.length * 0.5, 0, historyDepth * 0.15);
          }
        }
        renderer.render(scene, camera);
      };
      animate();

      sceneRef.current = { renderer, scene, camera, bars, frameId };

      // Apply initial preset
      applyCameraPreset(cameraPresetRef.current, camera, THREE);
    });

    return () => {
      cancelled = true;
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.frameId);
        sceneRef.current.renderer.dispose();
        if (el.contains(sceneRef.current.renderer.domElement)) {
          el.removeChild(sceneRef.current.renderer.domElement);
        }
        sceneRef.current = null;
      }
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [metrics.join(','), historyDepth, W, H]);

  /* Apply camera preset when it changes */
  useEffect(() => {
    if (!sceneRef.current) return;
    import('three').then((THREE) => {
      if (sceneRef.current) applyCameraPreset(cameraPreset, sceneRef.current.camera, THREE);
    });
  }, [cameraPreset, applyCameraPreset]);

  /* Update bar heights on each new metrics sample */
  useEffect(() => {
    if (!m || !sceneRef.current || pausedRef.current) return;
    const { bars } = sceneRef.current;

    const step = metrics.map((metric) => extractMetricValue(m, metric) / 10000);
    historyRef.current = [...historyRef.current.slice(-(historyDepth - 1)), step];

    // Update session min/max
    if (!sessionRef.current) {
      sessionRef.current = { min: [...step], max: [...step] };
    } else {
      step.forEach((v, i) => {
        sessionRef.current!.min[i] = Math.min(sessionRef.current!.min[i], v);
        sessionRef.current!.max[i] = Math.max(sessionRef.current!.max[i], v);
      });
    }

    historyRef.current.forEach((stepVals, zi) => {
      metrics.forEach((_, mi) => {
        const bar = bars[mi]?.[zi];
        if (!bar) return;
        const v = Math.max(0.02, stepVals[mi] ?? 0);
        bar.scale.y = v * 4;
        bar.position.y = (v * 4) / 2 - 0.5;
        (bar.material as import('three').MeshLambertMaterial).opacity = 0.4 + v * 0.55;
      });
    });

    // Update summary overlay
    setSummary(
      metrics.map((metric, i) => ({
        label: METRIC_LABEL[metric],
        val: step[i],
        min: sessionRef.current!.min[i],
        max: sessionRef.current!.max[i],
        color: String(t[METRIC_COLOR_KEY[metric]]),
      })),
    );
  }, [m, metrics, historyDepth, t]);

  const fs = SIZE_SCALE[size].font;

  return (
    <div
      className={className}
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        overflow: 'hidden',
        width: W,
        position: 'relative',
        ...style,
      }}
    >
      {/* Controls bar */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '4px 8px',
          borderBottom: `1px solid ${t.border}`,
          background: t.surface,
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: fs - 2, color: t.muted, flex: 1 }}>Metrics 3D</span>
        {/* Camera presets */}
        {(['overview', 'close', 'top'] as CameraPreset[]).map((p) => (
          <button
            key={p}
            onClick={() => setCameraPreset(p)}
            style={{
              fontSize: fs - 2,
              padding: '2px 7px',
              border: `1px solid ${cameraPreset === p ? t.cpu : t.border}`,
              borderRadius: 99,
              background: cameraPreset === p ? t.cpu + '22' : 'transparent',
              color: cameraPreset === p ? t.cpu : t.muted,
              cursor: 'pointer',
              fontFamily: t.font,
            }}
          >
            {p}
          </button>
        ))}
        {/* Pause */}
        <button
          onClick={() => setPaused((v) => !v)}
          style={{
            fontSize: fs - 2,
            padding: '2px 8px',
            border: `1px solid ${paused ? t.warn : t.border}`,
            borderRadius: 99,
            background: paused ? t.warn + '22' : 'transparent',
            color: paused ? t.warn : t.muted,
            cursor: 'pointer',
            fontFamily: t.font,
          }}
        >
          {paused ? '▶ resume' : '⏸ pause'}
        </button>
      </div>

      {/* 3D canvas */}
      <div ref={mountRef} style={{ width: W, height: H }} />

      {/* Text summary overlay */}
      {summary.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            background: t.bg + 'cc',
            border: `1px solid ${t.border}`,
            borderRadius: t.radius,
            padding: '4px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            backdropFilter: 'blur(4px)',
          }}
        >
          {summary.map((s) => (
            <div key={s.label} style={{ display: 'flex', gap: 6, alignItems: 'baseline', fontSize: fs - 2 }}>
              <span style={{ color: s.color, minWidth: 32, fontWeight: 600 }}>{s.label}</span>
              <span style={{ color: t.text, fontVariantNumeric: 'tabular-nums' }}>
                {fmtVal(s.val * 10000, metrics[summary.indexOf(s)])}
              </span>
              <span style={{ color: t.faint, fontSize: fs - 3 }}>
                ↓{fmtVal(s.min * 10000, metrics[summary.indexOf(s)])} ↑
                {fmtVal(s.max * 10000, metrics[summary.indexOf(s)])}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Hover tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + 12,
            top: tooltip.y - 8,
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: t.radius,
            padding: '4px 8px',
            fontSize: fs - 2,
            color: t.text,
            fontFamily: t.font,
            pointerEvents: 'none',
            whiteSpace: 'pre',
            zIndex: 10,
            boxShadow: `0 2px 8px ${t.shadowColor ?? '#0006'}`,
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
