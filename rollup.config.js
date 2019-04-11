import babel from 'rollup-plugin-babel';
import closure from '@ampproject/rollup-plugin-closure-compiler';
import pkg from './package.json';

export default [
  {
    input: 'src/shader-doodle.js',
    output: [{ file: pkg.module, format: 'es' }],
    plugins: [babel()],
  },
  {
    input: 'src/shader-doodle.js',
    output: [
      { name: 'ShaderDoodle', file: pkg.browser, format: 'umd' },
      { file: pkg.main, format: 'cjs' },
    ],
    plugins: [babel(), closure()],
  },
];
