/**
 * Metrics3D — 3D bar chart visualisation of metric history using three.js.
 *
 * Each metric is rendered as a column of bars along the X-axis.
 * The Z-axis represents time (newest bars at Z=0, oldest at Z=depth).
 * The camera auto-rotates slowly around the scene.
 *
 * Requires `three` as a peer dependency:
 *   npm install three
 */
import { useEffect, useRef, CSSProperties } from 'react';
import { useMetrics } from '../../TinyTrackProvider.js';
import { useTheme, TtTheme } from '../../theme.js';
import { MetricType, SizeType, SIZE_SCALE, extractMetricValue, METRIC_COLOR_KEY } from '../../utils/metrics.js';

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

/** Convert a CSS hex color string to a three.js integer color. */
function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/**
 * 3D bar chart powered by three.js.
 *
 * The component lazy-imports three.js at runtime so it is excluded from the
 * main SDK bundle. Add `three` to your project's dependencies to use this component.
 *
 * @param props.metrics      - Which metrics to render as separate bar columns.
 * @param props.historyDepth - How many time-steps to keep visible in the scene.
 * @param props.size         - 's' | 'm' | 'l' — scales canvas dimensions.
 */
export function Metrics3D({
  metrics = ['cpu', 'mem', 'disk'],
  historyDepth = 40,
  size = 'm',
  className, style, theme: themeProp,
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
  const { metrics: m } = useMetrics();

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

      let frameId = 0;
      const animate = () => {
        frameId = requestAnimationFrame(animate);
        camera.position.x = metrics.length * 0.5 + Math.sin(Date.now() / 8000) * (metrics.length * 1.5 + 2);
        camera.position.z = historyDepth * 0.35 + Math.cos(Date.now() / 8000) * 2;
        camera.lookAt(metrics.length * 0.5, 0, historyDepth * 0.15);
        renderer.render(scene, camera);
      };
      animate();

      sceneRef.current = { renderer, scene, camera, bars, frameId };
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

  /* Update bar heights on each new metrics sample */
  useEffect(() => {
    if (!m || !sceneRef.current) return;
    const { bars } = sceneRef.current;

    const step = metrics.map((metric) => extractMetricValue(m, metric) / 10000);
    historyRef.current = [...historyRef.current.slice(-(historyDepth - 1)), step];

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
  }, [m, metrics, historyDepth]);

  return (
    <div
      className={className}
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        overflow: 'hidden',
        width: W,
        height: H,
        ...style,
      }}
    >
      <div ref={mountRef} style={{ width: W, height: H }} />
    </div>
  );
}
