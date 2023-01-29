import { defineConfig } from 'rollup';
import replace from '@rollup/plugin-replace';
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

function buildBrowser(isCore) {
  function makeOutput(minify) {
    const coreExt = isCore ? '-core' : '';
    const ext = minify ? '.min.js' : '.js';
    return {
      banner,
      file: './dist/gpu-browser' + coreExt + ext,
      name: 'GPU',
      format: 'umd',
      plugins: minify ? [terser()] : [],
      sourcemap: true,
      globals: {
        acorn: 'acorn',
      },
    };
  }

  return defineConfig({
    input: './src/browser.js',
    plugins: [
      resolve(),
      commonjs(),
      replace({
        'process.version': false,
        preventAssignment: true,
      }),
    ],
    output: [makeOutput(false), makeOutput(true)],
    onwarn(msg, warn) {
      if (!/Circular/.test(msg)) {
        warn(msg);
      }
    },

    external: isCore ? ['acron'] : [],
  });
}

export default [buildBrowser(true), buildBrowser(false)];
