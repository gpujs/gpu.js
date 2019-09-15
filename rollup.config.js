import BrowserSync from 'browser-sync';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import pkg from './package.json';
import resolve from 'rollup-plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

const production = !process.env.ROLLUP_WATCH;

const browsersyncOptions = {
  server: '.',
  open: true,
  startPath: './test/all.html',
  host: '0.0.0.0',
  port: 9005,
  tunnel: true
};

const bs = BrowserSync.create('rollup');

function browsersync(options) {
  if (!bs.active) {
    bs.init(options || { server: '.' });
    process.on('SIGTERM', () => {
      bs.exit();
      process.exit(0);
    });
  }

  return {
    name: 'browsersync',
    generateBundle: function({}, bundle, isWrite) {
      if (isWrite) {
        bs.io && bs.reload(bundle.dest);
      }
    }
  }
};

const terserOptions = {
  include: [/^.+\.min\.js$/]
};

const banner = `/**
 * ${pkg.name}
 * ${pkg.homepage}
 *
 * ${pkg.description}
 *
 * @version ${pkg.version}
 * @date ${new Date()}
 *
 * @license ${pkg.license}
 * The MIT License
 *
 * Copyright (c) ${new Date().getFullYear()} gpu.js Team
 */`;

const output = (file, format, core = false) => ({
  'esm': { file, format, banner, sourcemap: true },
  'cjs': { file, format, banner, sourcemap: true },
  'iife': { file, format, banner, sourcemap: true, name: 'GPU', globals: core ? { acorn: 'acorn' } : {} }
}[format]);

const main = {
  input: './src/index.js',
  output: [
    output('./dist/gpu.js', 'cjs'),
    output('./dist/gpu.mjs', 'esm')
  ],
  external: [ 'gl', 'acorn' ],
  plugins: [
    json(),
    resolve(),
    commonjs()
  ]
}

const browser = {
  input: './src/browser.js',
  output: [
    output('./dist/gpu-browser.js', 'iife'),
    output('./dist/gpu-browser.min.js', 'iife')
  ],
  plugins: [
    json(),
    resolve(),
    commonjs(),
    production ? terser(terserOptions) : browsersync(browsersyncOptions)
  ]
}

const core = {
  input: './src/browser.js',
  output: [
    output('./dist/gpu-browser-core.js', 'iife', true),
    output('./dist/gpu-browser-core.min.js', 'iife', true)
  ],
  external: [ 'acorn' ],
  plugins: [
    json(),
    resolve(),
    commonjs(),
    terser(terserOptions)
  ]
}

export default production ? [ main, browser, core ] : browser
