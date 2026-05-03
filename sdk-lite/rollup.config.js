import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

const tsPlugin = () => typescript({ tsconfig: './tsconfig.json', declaration: false });

export default [
  // ESM
  {
    input: 'src/index.ts',
    external: [],
    plugins: [resolve(), tsPlugin(), terser()],
    treeshake: { moduleSideEffects: false },
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
    },
  },
  // CJS
  {
    input: 'src/index.ts',
    external: [],
    plugins: [resolve(), tsPlugin(), terser()],
    treeshake: { moduleSideEffects: false },
    output: {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      exports: 'named',
    },
  },
];
