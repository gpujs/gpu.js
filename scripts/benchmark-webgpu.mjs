#!/usr/bin/env node
// Benchmarks cpu vs webgl2 vs webgpu over identical kernel sources against
// dist/gpu-browser.js, in headed Chromium — headless Chromium exposes
// navigator.gpu but requestAdapter() resolves null, so headed is mandatory.
// Prints a GitHub-markdown table plus the raw JSON to stdout (progress goes
// to stderr, nothing is written to disk).
//
//   npm run build && node scripts/benchmark-webgpu.mjs
//
// Methodology (see scratchpad webgpu/test-bench-plan.md §3):
// - wall clock only; GPU timer queries report garbage on ANGLE Metal
// - every timed run is synced by reading back its own result — gl.finish()
//   is not a sync on Metal
// - timed runs ping-pong between two input sets so no driver can elide a
//   repeated dispatch (Apple TBDR elides redundant identical draws)
// - median of >= 10 runs, warmup excluded; cpu capped to 3 runs when a
//   single run exceeds 2 s
// - every mode's results are cross-checked against cpu (relative 1e-4)
//   before timing; a mismatch aborts the whole run
// - webgpu is attempted last: while the backend is absent (or the platform
//   has no adapter) it reports "unavailable" and the cpu/webgl2 numbers
//   still print; once src/backend/web-gpu lands, the column activates with
//   no harness changes (kernel() returns a Promise there — every call site
//   awaits, which is a no-op for the sync modes).

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

// Everything below runs inside the page in ONE session: gpu.js parses kernel
// sources via Function.prototype.toString, so the kernels must be defined
// here, not passed in. Must stay closure-free — Playwright serializes it.
async function benchInPage() {
  const G = window.GPU;
  if (!G || !G.prototype || typeof G.prototype.createKernel !== 'function') {
    throw new Error('dist/gpu-browser.js did not expose GPU — run npm run build first');
  }
  const log = (...a) => console.log(a.join(' '));

  // -- deterministic inputs, two sets per workload for ping-ponging --------
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function matrix(n, seed) {
    const r = rng(seed);
    const m = new Array(n);
    for (let y = 0; y < n; y++) {
      const row = (m[y] = new Float32Array(n));
      for (let x = 0; x < n; x++) row[x] = r();
    }
    return m;
  }
  function vector(n, seed) {
    const r = rng(seed);
    const v = new Float32Array(n);
    for (let i = 0; i < n; i++) v[i] = r();
    return v;
  }
  const MAP_N = 4194304;
  const inputs = {
    mm512: { a: [matrix(512, 1), matrix(512, 3)], b: [matrix(512, 2), matrix(512, 4)] },
    mm1024: { a: [matrix(1024, 5), matrix(1024, 7)], b: [matrix(1024, 6), matrix(1024, 8)] },
    map: [vector(MAP_N, 9), vector(MAP_N, 10)],
  };

  // -- kernel sources, identical across all modes --------------------------
  function matmulSource(a, b) {
    let sum = 0;
    for (let i = 0; i < this.constants.size; i++) {
      sum += a[this.thread.y][i] * b[i][this.thread.x];
    }
    return sum;
  }
  function chain1Source(a) {
    return a[this.thread.x] * 2 + 1;
  }
  function chain2Source(a) {
    return a[this.thread.x] * 0.5 + 3;
  }
  function chain3Source(a) {
    return a[this.thread.x] * 1.5 - 2;
  }
  // the 4M map reuses chain1Source — same source object is fine, each mode
  // gets its own kernel instance

  // -- helpers -------------------------------------------------------------
  function median(sorted) {
    const m = sorted.length >> 1;
    return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
  }
  function flatten(result) {
    if (result.length && typeof result[0] !== 'number') {
      const rows = Array.from(result);
      const flat = new Float32Array(rows.length * rows[0].length);
      for (let y = 0; y < rows.length; y++) flat.set(rows[y], y * rows[0].length);
      return flat;
    }
    return result;
  }
  const refs = {};
  function gate(key, mode, result) {
    const flat = flatten(result);
    if (mode === 'cpu') {
      refs[key] = flat.slice();
      return;
    }
    const ref = refs[key];
    if (!ref) throw new Error('RESULT MISMATCH: no cpu reference for ' + key);
    if (flat.length !== ref.length) {
      throw new Error('RESULT MISMATCH in ' + key + ' (' + mode + '): length ' + flat.length + ' vs cpu ' + ref.length);
    }
    let worst = 0, worstI = -1;
    for (let i = 0; i < ref.length; i++) {
      const d = Math.abs(flat[i] - ref[i]) / Math.max(1, Math.abs(ref[i]));
      if (d > worst) { worst = d; worstI = i; }
    }
    if (worst > 1e-4) {
      throw new Error('RESULT MISMATCH in ' + key + ' (' + mode + '): relative error ' + worst +
        ' at index ' + worstI + ' (got ' + flat[worstI] + ', cpu says ' + ref[worstI] + ')');
    }
    log('  ', key, mode, 'matches cpu (worst rel err ' + worst.toExponential(2) + ')');
  }
  // fn(i) must materialize its result (that readback is the sync)
  async function timeRuns(fn, { warmup, n, capMs }) {
    for (let i = 0; i < warmup; i++) await fn(i);
    const times = [];
    let target = n;
    while (times.length < target) {
      const i = times.length;
      const t0 = performance.now();
      await fn(i);
      times.push(performance.now() - t0);
      if (capMs && times.length === 1 && times[0] > capMs) target = Math.min(target, 3);
    }
    times.sort((a, b) => a - b);
    return { median: median(times), min: times[0], max: times[times.length - 1], n: times.length, times };
  }

  // -- one mode, all workloads ---------------------------------------------
  async function runMode(mode) {
    const gpu = new G({ mode });
    const isCpu = mode === 'cpu';
    const warmup = isCpu ? 1 : mode === 'webgpu' ? 5 : 3;
    const capMs = isCpu ? 2000 : 0;
    const out = {};
    try {
      for (const size of [512, 1024]) {
        const key = 'matmul' + size;
        const k = gpu.createKernel(matmulSource, { output: [size, size], constants: { size }, precision: 'single' });
        const mm = inputs['mm' + size];
        const once = async i => await k(mm.a[i % 2], mm.b[i % 2]);
        gate(key, mode, await once(0));
        out[key] = await timeRuns(once, { warmup, n: 12, capMs });
        log(mode, key, out[key].median.toFixed(2), 'ms median of', out[key].n);
      }

      const mk = gpu.createKernel(chain1Source, { output: [MAP_N], precision: 'single' });
      const mapOnce = async i => await mk(inputs.map[i % 2]);
      gate('map4m', mode, await mapOnce(0));
      out.map4m = await timeRuns(mapOnce, { warmup, n: 12, capMs });
      log(mode, 'map4m', out.map4m.median.toFixed(2), 'ms median of', out.map4m.n);

      // 3-kernel chain: pipelined modes keep intermediates GPU-resident and
      // read back only the final handle
      const pipeline = !isCpu;
      const kOpts = { output: [MAP_N], precision: 'single', pipeline };
      const c1 = gpu.createKernel(chain1Source, kOpts);
      const c2 = gpu.createKernel(chain2Source, kOpts);
      const c3 = gpu.createKernel(chain3Source, kOpts);
      const chainOnce = async i => {
        const h1 = await c1(inputs.map[i % 2]);
        const h2 = await c2(h1);
        const h3 = await c3(h2);
        return { out: pipeline ? await h3.toArray() : h3, h3 };
      };
      gate('chain', mode, (await chainOnce(0)).out);
      out.chainIncl = await timeRuns(async i => (await chainOnce(i)).out, { warmup, n: 12, capMs });
      log(mode, 'chainIncl', out.chainIncl.median.toFixed(2), 'ms median of', out.chainIncl.n);

      if (pipeline) {
        // excl-readback is derived: readback of the result is the only
        // reliable sync on Metal, so we measure the standalone toArray()
        // cost on a settled handle and subtract its median
        const { h3 } = await chainOnce(0);
        out.readback = await timeRuns(async () => await h3.toArray(), { warmup: 2, n: 10, capMs: 0 });
        out.chainExcl = {
          median: Math.max(0, out.chainIncl.median - out.readback.median),
          derived: 'chainIncl.median - readback.median',
        };
        log(mode, 'chainExcl', out.chainExcl.median.toFixed(2), 'ms (readback', out.readback.median.toFixed(2), 'ms)');
      }
    } finally {
      const d = gpu.destroy();
      if (d && typeof d.then === 'function') await d;
    }
    return out;
  }

  // -- environment identification ------------------------------------------
  const env = { userAgent: navigator.userAgent, webgl2Renderer: null, webgpuAdapter: null };
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    env.webgl2Renderer = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
  } catch (e) {
    env.webgl2Renderer = 'unavailable: ' + e.message;
  }
  try {
    if (!navigator.gpu) {
      env.webgpuAdapter = 'navigator.gpu absent';
    } else {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        env.webgpuAdapter = 'no adapter (headless or blocklisted)';
      } else {
        const info = adapter.info || (adapter.requestAdapterInfo ? await adapter.requestAdapterInfo() : null);
        env.webgpuAdapter = info
          ? [info.vendor, info.architecture, info.device, info.description].filter(Boolean).join(' / ')
          : 'adapter present (no info)';
      }
    }
  } catch (e) {
    env.webgpuAdapter = 'error: ' + e.message;
  }

  // -- the matrix: cpu first (builds references), webgpu last --------------
  const modes = {};
  modes.cpu = await runMode('cpu');
  modes.webgl2 = await runMode('webgl2');
  let webgpuStatus;
  try {
    if (G.isWebGPUSupported === false) {
      throw new Error('GPU.isWebGPUSupported is false on this platform');
    }
    modes.webgpu = await runMode('webgpu');
    webgpuStatus = 'ok';
  } catch (e) {
    const msg = (e && e.message) || String(e);
    // wrong answers abort loudly; a missing backend/adapter degrades cleanly
    if (msg.indexOf('RESULT MISMATCH') !== -1) throw e;
    modes.webgpu = null;
    webgpuStatus = 'unavailable: ' + msg;
    log('webgpu:', webgpuStatus);
  }

  return { env, modes, webgpuStatus };
}

// -- report ----------------------------------------------------------------
const ROWS = [
  ['matmul512', 'matmul 512×512 (incl. readback)'],
  ['matmul1024', 'matmul 1024×1024 (incl. readback)'],
  ['map4m', '4M-element map (incl. readback)'],
  ['chainIncl', '3-kernel pipeline chain, final readback only'],
  ['chainExcl', '3-kernel pipeline chain, excl. final readback \\*'],
];

function fmtMs(ms) {
  return (ms >= 100 ? ms.toFixed(0) : ms >= 10 ? ms.toFixed(1) : ms.toFixed(2)) + ' ms';
}

function printReport(data, chromiumVersion) {
  const { env, modes, webgpuStatus } = data;
  const lines = [];
  lines.push('### Benchmarks — cpu vs webgl2 vs webgpu');
  lines.push('');
  lines.push('- Chromium ' + chromiumVersion + ' (headed)');
  lines.push('- WebGL2 renderer: ' + env.webgl2Renderer);
  lines.push('- WebGPU adapter: ' + env.webgpuAdapter);
  if (webgpuStatus !== 'ok') lines.push('- webgpu mode: ' + webgpuStatus);
  lines.push('- median, warmup excluded; every timed run synced by reading back its own result; inputs ping-ponged between two sets so no dispatch is elidable');
  lines.push('');
  lines.push('| Workload | cpu | webgl2 (single) | webgpu |');
  lines.push('|---|---|---|---|');
  for (const [key, label] of ROWS) {
    // chainExcl has no cpu leg; its speedup is quoted vs the cpu chain incl readback
    const cpuBase = modes.cpu[key === 'chainExcl' ? 'chainIncl' : key];
    const cells = ['cpu', 'webgl2', 'webgpu'].map(mode => {
      const m = modes[mode];
      if (!m) return 'unavailable';
      const r = m[key];
      if (!r) return '—';
      if (mode === 'cpu') return fmtMs(r.median);
      const speedup = cpuBase ? ' (' + (cpuBase.median / r.median).toFixed(1) + '× vs cpu)' : '';
      return fmtMs(r.median) + speedup;
    });
    lines.push('| ' + [label, ...cells].join(' | ') + ' |');
  }
  lines.push('');
  lines.push('\\* derived: chain median minus the median cost of a standalone `toArray()` on the settled final handle — readback of the result is the only trustworthy sync on Metal; speedup quoted vs the cpu chain including readback.');
  lines.push('');
  lines.push('<details><summary>Raw results (JSON)</summary>');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(data, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('</details>');
  process.stdout.write(lines.join('\n') + '\n');
}

// -- driver ----------------------------------------------------------------
async function main() {
  let devServer = null;
  if (await portListening(PORT)) {
    process.stderr.write('dev server already listening on :' + PORT + '\n');
  } else {
    process.stderr.write('starting dev server on :' + PORT + '\n');
    devServer = spawn(process.execPath, [path.join(ROOT, 'scripts', 'dev.js')], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT) },
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    const deadline = Date.now() + 10000;
    while (!(await portListening(PORT))) {
      if (Date.now() > deadline) throw new Error('dev server did not start on :' + PORT);
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const browser = await chromium.launch({ headless: false, args: ['--use-angle=metal'] });
  try {
    const page = await browser.newPage();
    page.on('console', msg => process.stderr.write('[page] ' + msg.text() + '\n'));
    page.on('pageerror', err => process.stderr.write('[pageerror] ' + err.message + '\n'));
    await page.goto('http://localhost:' + PORT + '/test/');
    await page.addScriptTag({ url: '/dist/gpu-browser.js' });
    const data = await page.evaluate(benchInPage);
    printReport(data, browser.version());
  } finally {
    await browser.close();
    if (devServer) devServer.kill();
  }
}

main().catch(err => {
  process.stderr.write('\nBENCHMARK ABORTED: ' + (err && err.stack || err) + '\n');
  process.exit(1);
});
