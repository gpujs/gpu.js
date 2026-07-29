#!/usr/bin/env node
// Measures what asyncMode actually buys: main-thread availability while
// kernel results are read back. Throughput is benchmark-webgpu.mjs's job;
// this one holds the workload fixed and asks how badly the readback loop
// starves everything else sharing the thread.
//
//   npm run build && node scripts/benchmark-async.mjs
//
// A 4 ms setTimeout heartbeat runs beside a loop of matmul dispatches, each
// awaited (a no-op for the sync modes). Blocked time is every inter-beat gap
// beyond the interval — time the event loop wanted to run and could not.
// Headed Chromium for the same reason as benchmark-webgpu.mjs: headless has
// no WebGPU adapter and falls to SwiftShader for GL.

import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8099;

function portListening(port) {
  return new Promise(resolve => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
  });
}

// Runs inside the page; must stay closure-free (Playwright serializes it).
async function benchInPage() {
  const G = window.GPU;
  const SIZE = 512;
  const ROUNDS = 30;
  const BEAT_MS = 4;

  function matmulSource(a, b) {
    let sum = 0;
    for (let i = 0; i < 512; i++) {
      sum += a[this.thread.y][i] * b[i][this.thread.x];
    }
    return sum;
  }

  function makeMatrix(seed) {
    const m = [];
    for (let y = 0; y < SIZE; y++) {
      const row = new Float32Array(SIZE);
      for (let x = 0; x < SIZE; x++) row[x] = ((x * 31 + y * 17 + seed) % 100) / 100;
      m.push(row);
    }
    return m;
  }
  const a0 = makeMatrix(1), b0 = makeMatrix(2), a1 = makeMatrix(3), b1 = makeMatrix(4);

  async function measure(mode, asyncMode) {
    const gpu = new G({ mode });
    const kernel = gpu.createKernel(matmulSource).setOutput([SIZE, SIZE]).setPrecision('single');
    if (asyncMode) kernel.setAsyncMode(true);
    // warmup + ensure any webgpu upgrade settles before timing
    await kernel(a0, b0);
    await kernel(a1, b1);

    let beats = 0;
    let blockedMs = 0;
    let worstGapMs = 0;
    let last = performance.now();
    let alive = true;
    (function beat() {
      if (!alive) return;
      const now = performance.now();
      const gap = now - last;
      last = now;
      if (gap > BEAT_MS) {
        blockedMs += gap - BEAT_MS;
        if (gap > worstGapMs) worstGapMs = gap;
      }
      beats++;
      setTimeout(beat, BEAT_MS);
    })();

    const start = performance.now();
    let sink = 0;
    for (let i = 0; i < ROUNDS; i++) {
      const result = await kernel(i % 2 ? a1 : b1, i % 2 ? b0 : a0);
      sink += result[1][1];
    }
    const end = performance.now();
    const elapsed = end - start;
    alive = false;
    // the interval from the last beat to the end is starvation too -- in the
    // fully-blocking case the heartbeat never fires at all and every ms of
    // the loop lives in this final gap
    const finalGap = end - last;
    if (finalGap > BEAT_MS) {
      blockedMs += finalGap - BEAT_MS;
      if (finalGap > worstGapMs) worstGapMs = finalGap;
    }
    await gpu.destroy();
    const backend = kernel.kernel.constructor.name;
    return {
      label: mode + (asyncMode ? ' + asyncMode' : ''),
      backend,
      elapsedMs: +elapsed.toFixed(1),
      blockedMs: +blockedMs.toFixed(1),
      blockedPct: +(100 * blockedMs / elapsed).toFixed(1),
      worstGapMs: +worstGapMs.toFixed(1),
      beats,
      sink,
    };
  }

  const rows = [];
  rows.push(await measure('webgl2', false));
  rows.push(await measure('webgl2', true));
  if (G.isWebGPUSupported && await G.isWebGPUAvailable()) {
    rows.push(await measure('webgpu', false));
  }
  rows.push(await measure('async', false));
  return rows;
}

async function main() {
  if (!(await portListening(PORT))) {
    process.stderr.write('starting dev server on :' + PORT + '\n');
    spawn(process.execPath, [path.join(ROOT, 'scripts', 'dev.js')], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: 'ignore',
      detached: true,
    }).unref();
    const deadline = Date.now() + 15000;
    while (!(await portListening(PORT))) {
      if (Date.now() > deadline) throw new Error('dev server did not start on :' + PORT);
      await new Promise(r => setTimeout(r, 250));
    }
  } else {
    process.stderr.write('dev server already listening on :' + PORT + '\n');
  }

  const browser = await chromium.launch({ headless: false, args: ['--use-angle=metal'] });
  try {
    const page = await browser.newPage();
    await page.goto('http://localhost:' + PORT + '/test/', { waitUntil: 'domcontentloaded' });
    await page.addScriptTag({ url: '/dist/gpu-browser.js' });
    const rows = await page.evaluate(benchInPage);

    console.log('\n30 × matmul 512×512 with readback, 4 ms heartbeat beside it\n');
    console.log('| configuration | backend | wall time | main thread blocked | worst single stall |');
    console.log('|---|---|---|---|---|');
    for (const r of rows) {
      console.log(`| ${r.label} | ${r.backend} | ${r.elapsedMs} ms | ${r.blockedMs} ms (${r.blockedPct}%) | ${r.worstGapMs} ms |`);
    }
    console.log('\n' + JSON.stringify(rows, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
