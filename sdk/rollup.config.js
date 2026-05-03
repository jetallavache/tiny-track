import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

const external = ['react', 'react/jsx-runtime', 'three'];

const tsPlugin = () => typescript({ tsconfig: './tsconfig.json', declaration: false });

export default [
  // Core (no React)
  {
    input: 'src/index.ts',
    external,
    plugins: [resolve(), tsPlugin(), terser()],
    treeshake: { moduleSideEffects: false },
    output: [
      { file: 'dist/index.cjs.js', format: 'cjs', exports: 'named' },
      { file: 'dist/index.esm.js', format: 'esm' },
    ],
  },
  // React components
  {
    input: 'src/react/index.ts',
    external,
    plugins: [resolve(), tsPlugin(), terser()],
    treeshake: { moduleSideEffects: false },
    output: [
      { file: 'dist/react.cjs.js', format: 'cjs', exports: 'named' },
      { file: 'dist/react.esm.js', format: 'esm' },
    ],
  },
  // IIFE bundle for CDN (core only, no React)
  {
    input: 'src/index.ts',
    external: [],
    plugins: [resolve(), tsPlugin(), terser()],
    treeshake: { moduleSideEffects: false },
    output: {
      file: 'dist/tinytsdk.min.js',
      format: 'iife',
      name: 'TinyTrack',
    },
  },
];
