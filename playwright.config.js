// Runs the QUnit browser suite (test/all.html) in real browsers, from Node.
//
// `npm test` cannot cover the webgl and webgl2 modes: Node has no browser
// canvas, so those tests skip. headless-gl fills part of the gap, but it is
// WebGL 1.0 only — WebGL2Kernel, the backend every current browser selects,
// never executes there.
//
// This loads dist/, deliberately: the browser bundle is the artifact users
// ship, and several bugs here (#844's global binding, #743's non-ASCII
// escapes) existed only in the bundle. Run `npm run make` first.
const { defineConfig, devices } = require('@playwright/test');

const PORT = Number(process.env.PORT) || 8080;

module.exports = defineConfig({
  testDir: './test/playwright',
  // The suite runs once per worker and every module reads that one result, so
  // extra workers buy nothing but extra full-suite runs. One worker also means
  // the projects below run one after another — for a per-commit job, pass
  // `--project=chromium` and leave the rest to the nightly matrix.
  workers: 1,
  fullyParallel: false,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  // Budget for the whole suite, since worker-fixture setup is charged to the
  // first test. It finishes in roughly a fifth of this locally; the headroom is
  // for remote grids, and a genuinely wedged run is caught by the stall
  // detector in the spec long before this expires.
  timeout: 10 * 60 * 1000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: `http://localhost:${PORT}`,
    // No tracing. Every module reports against one shared page holding a few
    // thousand rendered results, so a trace is both enormous and useless here —
    // capturing one per failing module added minutes to the run. The failure
    // message already carries the QUnit assertion text.
    trace: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            // CI runners have no GPU; without this WebGL falls back to nothing
            // and every webgl/webgl2 test would skip exactly as it does in Node
            '--enable-unsafe-swiftshader',
            '--ignore-gpu-blocklist',
          ],
        },
      },
    },
    // Safari is where #743 lived, and WebKit is the only way to see it locally
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],

  webServer: {
    command: `PORT=${PORT} node scripts/dev.js`,
    url: `http://localhost:${PORT}/test/all.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
