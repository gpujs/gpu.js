#!/usr/bin/env node
/**
 * Runs gpu.js in real browsers on BrowserStack.
 *
 * The pages under test are served from this checkout over a BrowserStack Local
 * tunnel, so the devices exercise the `dist/` build produced by `gulp make`
 * rather than a published one.
 *
 * Usage:
 *   BROWSERSTACK_USERNAME=... BROWSERSTACK_ACCESS_KEY=... node test/browserstack/run.js
 *
 *   --suite=smoke|visual|qunit
 *                           smoke (default) runs test/browserstack/smoke.html,
 *                           visual compares rendered output against each
 *                           device's own cpu render, qunit runs test/all.html
 *   --browsers=real-devices|desktop|all
 *   --project=NAME          BrowserStack project to group builds under
 *                           (default gpu.js, or $BROWSERSTACK_PROJECT)
 *   --only=TEXT             keep only targets whose name contains TEXT
 *   --concurrency=N         parallel sessions (default 5, the free-plan limit)
 *   --timeout=SECONDS       per-session budget (default 300)
 *   --filter=TEXT           QUnit filter, only meaningful with --suite=qunit
 *   --dry-run               print the resolved capabilities and exit without
 *                           opening any session
 *   --measure               visual suite only: report pixel deltas instead of
 *                           asserting against the tolerances
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { Builder } = require('selenium-webdriver');
const browserstack = require('browserstack-local');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BROWSER_SETS = require('./browsers');

const HUB = 'https://hub-cloud.browserstack.com/wd/hub';
// Real iOS devices cannot resolve `localhost` through the tunnel; bs-local.com
// is BrowserStack's supported alias and works on every platform.
const TUNNEL_HOST = 'bs-local.com';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webm': 'video/webm',
  '.map': 'application/json; charset=utf-8'
};

function parseArgs(argv) {
  const args = {
    suite: 'smoke',
    browsers: 'real-devices',
    project: process.env.BROWSERSTACK_PROJECT || 'gpu.js',
    only: '',
    concurrency: 5,
    // per-suite default, overridden by --timeout; see the adjustment below
    timeout: 0,
    filter: '',
    'dry-run': false,
    // visual only: report the pixel deltas without failing on them, which is
    // how the tolerances in visual.html were chosen
    measure: false
  };
  argv.forEach(arg => {
    const match = /^--([^=]+)=?(.*)$/.exec(arg);
    if (!match) return;
    const key = match[1];
    const value = match[2];
    if (key === 'concurrency' || key === 'timeout') {
      args[key] = parseInt(value, 10);
    } else if (key === 'dry-run' || key === 'measure') {
      args[key] = true;
    } else if (key in args) {
      args[key] = value;
    } else {
      throw new Error(`unknown option --${key}`);
    }
  });
  // The smoke and visual suites are a handful of assertions; the qunit suite is
  // the whole of test/all.html, which takes minutes in a real browser over the
  // tunnel — Safari needed 385s. One budget cannot serve both.
  if (!args.timeout) args.timeout = args.suite === 'qunit' ? 900 : 300;

  return args;
}

function credentials() {
  let user = process.env.BROWSERSTACK_USERNAME;
  let key = process.env.BROWSERSTACK_ACCESS_KEY;
  // Local convenience: a gitignored file keeps keys out of shell history.
  const localFile = path.join(__dirname, '.credentials.json');
  if ((!user || !key) && fs.existsSync(localFile)) {
    const local = JSON.parse(fs.readFileSync(localFile, 'utf8'));
    user = user || local.username;
    key = key || local.accessKey;
  }
  if (!user || !key) {
    throw new Error(
      'Missing credentials. Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY, ' +
      'or create test/browserstack/.credentials.json with {"username":"...","accessKey":"..."}.'
    );
  }
  return { user, key };
}

function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const filePath = path.join(REPO_ROOT, path.normalize(urlPath));
    if (!filePath.startsWith(REPO_ROOT)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404).end('not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      res.end(data);
    });
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function startTunnel(key, localIdentifier) {
  const local = new browserstack.Local();
  return new Promise((resolve, reject) => {
    local.start({ key, localIdentifier, force: 'true', forceLocal: 'true' }, err => {
      if (err) return reject(err);
      resolve(local);
    });
  });
}

function stopTunnel(local) {
  return new Promise(resolve => local.stop(resolve));
}

function buildCapabilities(target, context) {
  const source = target.capabilities;
  const caps = {};
  const bstack = {
    projectName: context.projectName,
    buildName: context.buildName,
    buildIdentifier: context.buildIdentifier,
    sessionName: target.name,
    local: 'true',
    localIdentifier: context.localIdentifier,
    userName: context.user,
    accessKey: context.key,
    seleniumVersion: '4.0.0',
    // desktop sessions capture nothing by default, and the browser console is
    // where WebGL driver complaints surface — they never reach the page
    consoleLogs: 'verbose'
  };
  Object.keys(source).forEach(cap => {
    // browserName/browserVersion are W3C top-level, and vendor-prefixed caps
    // (goog:chromeOptions, moz:firefoxOptions) must stay top-level too --
    // that is how a temporary debug target can pass browser flags, e.g.
    // --enable-privileged-webgl-extensions to read ANGLE's translated HLSL
    // through WEBGL_debug_shaders. Everything else is BrowserStack's.
    if (cap === 'browserName' || cap === 'browserVersion' || cap.includes(':')) {
      caps[cap] = source[cap];
    } else {
      bstack[cap] = source[cap];
    }
  });
  caps['bstack:options'] = bstack;
  return caps;
}

async function setSessionStatus(driver, status, reason) {
  try {
    await driver.executeScript(
      'browserstack_executor: ' + JSON.stringify({
        action: 'setSessionStatus',
        arguments: { status, reason: String(reason).slice(0, 250) }
      })
    );
  } catch (e) {
    // annotating is best-effort; never let it mask the real result
  }
}

// Both suites report by mutating the page, so poll rather than race a load event.
async function poll(driver, extract, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await driver.executeScript(extract);
    if (last && last.done) return last;
    await new Promise(r => setTimeout(r, 2000));
  }
  const detail = last && last.progress ? ` (last seen: ${last.progress})` : '';
  throw new Error(`timed out after ${Math.round(timeoutMs / 1000)}s waiting for results${detail}`);
}

const EXTRACT_SMOKE = 'return window.__gpujsResults || null;';

const EXTRACT_VISUAL = 'return window.__gpujsVisual || null;';

// test/all-template.html installs a QUnit reporter that fills in
// window.__qunitResults; the DOM is only consulted for a progress hint.
const EXTRACT_QUNIT = `
  const results = window.__qunitResults;
  if (!results) {
    return { done: false, progress: 'suite has not started' };
  }
  if (!results.done) {
    return { done: false, progress: document.querySelectorAll('#qunit-tests > li').length + ' tests so far' };
  }
  return Object.assign({ env: { userAgent: navigator.userAgent } }, results);
`;

// BrowserStack occasionally fails to hand over a device — "Could not start
// Mobile Browser", "session not created". That is an allocation fault, not a
// result: the browser never ran, so retrying cannot mask a regression. Only
// session creation is retried; once a session exists its outcome stands.
const SESSION_ATTEMPTS = 3;

async function openSession(target, context) {
  let lastError = null;
  for (let attempt = 1; attempt <= SESSION_ATTEMPTS; attempt++) {
    try {
      return await new Builder()
        .usingServer(HUB)
        .withCapabilities(buildCapabilities(target, context))
        .build();
    } catch (e) {
      lastError = e;
      if (attempt === SESSION_ATTEMPTS) break;
      const reason = (e.message || '').split('\n')[0].slice(0, 70);
      console.log(`   ${target.name}: session did not start (${reason}) — retry ${attempt}/${SESSION_ATTEMPTS - 1}`);
      await new Promise(r => setTimeout(r, 5000 * attempt));
    }
  }
  throw new Error(`could not start a session after ${SESSION_ATTEMPTS} attempts: ${lastError && lastError.message}`);
}

async function runTarget(target, context) {
  const started = Date.now();
  let driver = null;
  try {
    driver = await openSession(target, context);

    const session = await driver.getSession();
    const sessionId = session.getId();

    await driver.get(context.url);
    const results = await poll(
      driver,
      context.suite === 'qunit' ? EXTRACT_QUNIT :
        context.suite === 'visual' ? EXTRACT_VISUAL : EXTRACT_SMOKE,
      context.timeout * 1000
    );

    const ok = results.failed === 0 && !results.error;
    await setSessionStatus(
      driver,
      ok ? 'passed' : 'failed',
      ok ? `${results.passed} passed` : `${results.failed} of ${results.total} failed`
    );
    return Object.assign({ target: target.name, ok, sessionId, durationMs: Date.now() - started }, results);
  } catch (e) {
    if (driver) await setSessionStatus(driver, 'failed', e.message);
    return {
      target: target.name,
      ok: false,
      error: e.message,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
      durationMs: Date.now() - started
    };
  } finally {
    if (driver) {
      try { await driver.quit(); } catch (e) { /* session may already be gone */ }
    }
  }
}

async function runPool(targets, concurrency, worker) {
  const results = new Array(targets.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, targets.length) }, async () => {
    while (next < targets.length) {
      const index = next++;
      results[index] = await worker(targets[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { user, key } = credentials();

  const set = BROWSER_SETS[args.browsers];
  if (!set) {
    throw new Error(`unknown browser set "${args.browsers}"; expected one of ${Object.keys(BROWSER_SETS).join(', ')}`);
  }
  const targets = args.only
    ? set.filter(target => target.name.toLowerCase().includes(args.only.toLowerCase()))
    : set;
  if (!targets.length) {
    throw new Error(`--only=${args.only} matched no target in the "${args.browsers}" set`);
  }
  if (!['smoke', 'visual', 'qunit'].includes(args.suite)) {
    throw new Error(`unknown suite "${args.suite}"; expected smoke, visual or qunit`);
  }
  if (!fs.existsSync(path.join(REPO_ROOT, 'dist', 'gpu-browser.js'))) {
    throw new Error('dist/gpu-browser.js is missing — run `npx gulp make` first');
  }

  const { server, port } = await startServer();
  const localIdentifier = `gpujs-${process.pid}-${Date.now()}`;
  // BrowserStack groups runs under a single build when the name is stable and
  // the identifier varies. A unique name per run instead creates a separate
  // build entry every time, which buries the project in the dashboard.
  const buildName = process.env.BROWSERSTACK_BUILD || 'gpu.js';
  const buildIdentifier = process.env.GITHUB_RUN_ID
    ? `CI ${process.env.GITHUB_RUN_ID}`
    : `local ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`;

  const suitePath = args.suite === 'qunit'
    ? `/test/all.html${args.filter ? `?filter=${encodeURIComponent(args.filter)}` : ''}`
    : args.suite === 'visual'
      ? `/test/browserstack/visual.html${args.measure ? '?measure=1' : ''}`
      : '/test/browserstack/smoke.html';
  const url = `http://${TUNNEL_HOST}:${port}${suitePath}`;

  console.log(`suite:    ${args.suite}`);
  console.log(`url:      ${url}`);
  console.log(`build:    ${buildName} (${buildIdentifier})`);
  console.log(`targets:  ${targets.length} (${args.browsers}), concurrency ${args.concurrency}\n`);

  if (args['dry-run']) {
    targets.forEach(target => {
      const caps = buildCapabilities(target, {
        user, key, localIdentifier, buildName, buildIdentifier, projectName: args.project
      });
      // never print the access key, even locally
      const shown = JSON.parse(JSON.stringify(caps));
      shown['bstack:options'].accessKey = '***';
      console.log(`--- ${target.name}\n${JSON.stringify(shown, null, 2)}\n`);
    });
    server.close();
    return;
  }

  console.log('starting BrowserStack Local tunnel...');
  const tunnel = await startTunnel(key, localIdentifier);
  console.log('tunnel up\n');

  const context = {
    user, key, localIdentifier, buildName, buildIdentifier, url,
    projectName: args.project,
    suite: args.suite,
    timeout: args.timeout
  };
  let results;
  try {
    results = await runPool(targets, args.concurrency, async target => {
      console.log(`>> ${target.name}: starting`);
      const result = await runTarget(target, context);
      const seconds = Math.round(result.durationMs / 1000);
      console.log(
        result.ok
          ? `   ${target.name}: PASS (${result.passed} passed, ${result.skipped} skipped, ${seconds}s)`
          : `   ${target.name}: FAIL (${result.error || `${result.failed} failed`}, ${seconds}s)`
      );
      return result;
    });
  } finally {
    await stopTunnel(tunnel);
    server.close();
  }

  console.log('\n================ BrowserStack results ================');
  results.forEach(result => {
    console.log(`\n${result.ok ? 'PASS' : 'FAIL'}  ${result.target}`);
    if (result.env && result.env.userAgent) console.log(`      ${result.env.userAgent}`);
    if (result.env && result.env.modes) console.log(`      modes: ${result.env.modes.join(', ')}`);
    if (result.error) console.log(`      error: ${result.error}`);
    if (result.total) {
      console.log(`      ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped`);
    }
    result.tests
      .filter(t => t.status === 'fail')
      .forEach(t => console.log(`      x ${t.name}${t.message ? ` — ${t.message}` : ''}`));
  });

  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} targets passed`);

  const reportPath = path.join(REPO_ROOT, 'browserstack-results.json');
  fs.writeFileSync(reportPath, JSON.stringify({ buildName, buildIdentifier, suite: args.suite, results }, null, 2));
  console.log(`report written to ${path.relative(REPO_ROOT, reportPath)}`);

  process.exitCode = failed.length ? 1 : 0;
}

main().catch(e => {
  console.error(e.stack || e.message);
  process.exitCode = 1;
});
