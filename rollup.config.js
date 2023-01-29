import { defineConfig } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';

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

/**
 *
 * @returns {import('rollup').Plugin}
 */
function pluginReplaceGL() {
  const glID = 'gl?replaceEntry';
  const content = `export { default } from 'gl/src/javascript/browser-index';`;

  return {
    resolveId(id) {
      if (id === 'gl') {
        return glID;
      }
    },
    load(id) {
      if (id === glID) {
        return content;
      }
    },
  };
}

function commonConfig(plugins = []) {
  return defineConfig({
    plugins: [resolve(), commonjs(), json(), ...plugins],
    onwarn(msg, warn) {
      if (!/Circular/.test(msg)) {
        warn(msg);
      }
    },
  });
}

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
    output: [
      createOutput(id, 'umd', options),
      createOutput(id, 'umd', options, true),
      createOutput(id + '.esm', 'esm'),
    ],

    external: isCore ? ['acorn'] : [],

    ...commonConfig([pluginReplaceGL()]),
  });
}

function buildNode() {
  return defineConfig({
    input: './src/index.js',
    output: [
      createOutput('gpu-node', 'cjs'),
      createOutput('gpu-node.esm', 'esm'),
    ],

    external: Object.keys(pkg.dependencies).filter(v => v !== 'gpu-mock.js'),

    ...commonConfig(),
  });
}

export default [buildBrowser(true), buildBrowser(false), buildNode()];
