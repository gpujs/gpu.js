import { defineConfig } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const banner = `/**
* ${pkg.name}
* ${pkg.homepage}
*
* ${pkg.description}
*
* @version ${pkg.version}
* @date ${new Date().toUTCString()}
*
* @license ${pkg.license}
* The MIT License
*
* Copyright (c) ${new Date().getFullYear()} gpu.js Team
*/`;

function createOutput(name, format, opts, minify = false) {
  return {
    banner,
    file: `dist/${name}${minify ? '.min' : ''}.js`,
    format,
    plugins: minify ? [terser()] : [],
    sourcemap: true,
    ...opts,
  };
}

function buildBrowser(isCore) {
  const id = isCore ? 'gpu-browser-core' : 'gpu-browser';
  const options = isCore
    ? { name: 'GPU', globals: { acorn: 'acorn' } }
    : { name: 'GPU' };

  return defineConfig({
    input: './src/browser.js',
    plugins: [resolve(), commonjs()],
    output: [
      createOutput(id, 'umd', options),
      createOutput(id, 'umd', options, true),
      createOutput(id + '.esm', 'esm'),
    ],
    onwarn(msg, warn) {
      if (!/Circular/.test(msg)) {
        warn(msg);
      }
    },

    external: isCore ? ['acorn'] : [],
  });
}

function buildNode() {
  return defineConfig({
    input: './src/index.js',
    plugins: [resolve(), commonjs()],
    output: [
      createOutput('gpu-node', 'cjs'),
      createOutput('gpu-node.esm', 'esm'),
    ],
    onwarn(msg, warn) {
      if (!/Circular/.test(msg)) {
        warn(msg);
      }
    },

    external: Object.keys(pkg.dependencies).filter(v => v !== 'gpu-mock.js'),
  });
}

export default [buildBrowser(true), buildBrowser(false), buildNode()];
