// One reported test per QUnit module, from a single page load.
//
// Reloading test/all.html per module would be the obvious shape, but the page
// pulls in the browser bundle and all ~300 test files on every load, so 335
// loads costs minutes for nothing. Instead a worker-scoped fixture runs the
// suite once and each module asserts against its own tally.
const fs = require('fs');
const path = require('path');
const { test: base, expect } = require('@playwright/test');
const { MODULES } = require('./modules');

const SUITE_TIMEOUT = 8 * 60 * 1000;
const POLL_MS = 2000;
// Per-test cap handed to QUnit. A test that throws from a callback QUnit is not
// inside -- an image onload, a promise -- never calls its done(), so without a
// cap it stops the run for good. Software WebGL is slow, but nothing here
// legitimately runs this long.
const TEST_TIMEOUT = 10_000;
// Backstop only: the page now recovers from a hung test on its own, so no
// progress for several test timeouts means something worse (a lost context, a
// dead tab) that the page cannot recover from.
const STALL_MS = TEST_TIMEOUT * 4;

// Absolute URL rather than the config's baseURL: the BrowserStack SDK replaces
// the projects in playwright.config.js with ones generated from
// browserstack.yml, and `use.baseURL` does not survive that.
const PORT = Number(process.env.PORT) || 8080;
const SUITE_URL = `http://localhost:${PORT}/test/all.html?testTimeout=${TEST_TIMEOUT}`;
const GOTO_TIMEOUT = 120_000;

const test = base.extend({
  // Worker-scoped: the suite runs once per browser, not once per module.
  //
  // Playwright discards the worker process after a failing test, which would
  // re-run this fixture — and the whole several-minute suite — once per failing
  // module. So the result is cached on disk and a restarted worker just reads
  // it. The cache lives in the project's output directory, which Playwright
  // clears at the start of every run, so it can never go stale across runs.
  suite: [async ({ browser }, use, workerInfo) => {
    const cacheFile = path.join(workerInfo.project.outputDir, `qunit-${workerInfo.project.name}.json`);
    if (fs.existsSync(cacheFile)) {
      await use(JSON.parse(fs.readFileSync(cacheFile, 'utf8')));
      return;
    }

    let page = await browser.newPage();
    const consoleErrors = [];
    page.on('pageerror', error => consoleErrors.push(String(error).split('\n')[0]));

    await page.goto(SUITE_URL, { waitUntil: 'domcontentloaded', timeout: GOTO_TIMEOUT });

    // Watch progress rather than just awaiting `done`: if the run does wedge,
    // failing fast while naming the test that was running is the actionable
    // part, and beats burning the whole timeout to report nothing.
    let results = null;
    let lastCount = -1;
    let stalledFor = 0;
    const deadline = Date.now() + SUITE_TIMEOUT;

    while (Date.now() < deadline) {
      await page.waitForTimeout(POLL_MS);
      const state = await page.evaluate(() => ({
        done: !!(window.__qunitResults && window.__qunitResults.done),
        count: document.querySelectorAll('#qunit-tests > li').length,
        running: (document.querySelector('#qunit-tests > li:last-child .test-name') || {}).textContent || null,
      }));

      if (state.done) {
        results = await page.evaluate(() => window.__qunitResults);
        break;
      }
      stalledFor = state.count === lastCount ? stalledFor + POLL_MS : 0;
      lastCount = state.count;

      if (stalledFor >= STALL_MS) {
        const partial = await page.evaluate(() => window.__qunitResults);
        await page.close();
        throw new Error(
          `the suite stopped after ${state.count} tests, while running "${state.running}".\n` +
          `Page errors: ${consoleErrors.join(' | ') || '(none)'}\n` +
          `QUnit's per-test timeout did not rescue it, so this is not one bad test — ` +
          `suspect a lost WebGL context or a crashed tab.\n` +
          `Modules completed: ${partial ? Object.keys(partial.modules).length : 0}`
        );
      }
    }

    if (!results) throw new Error(`suite did not finish within ${SUITE_TIMEOUT / 1000}s`);

    // Close before handing over. The results are a plain object by now, but the
    // page still holds a rendered <li> per test, and Playwright snapshots any
    // open page when a test fails — on a DOM this size that took minutes per
    // failing module and dwarfed the run itself.
    await page.close();
    page = null;

    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(results));

    await use(results);
  }, { scope: 'worker' }],
});

test.describe('QUnit browser suite', () => {
  test('the suite ran and reported results', async ({ suite }) => {
    expect(suite.total, 'no tests ran — the page probably failed to load the bundle').toBeGreaterThan(1000);
    // eslint-disable-next-line no-console
    console.log(
      `  ${suite.total} tests: ${suite.passed} passed, ${suite.failed} failed, ${suite.skipped} skipped` +
      ` across ${Object.keys(suite.modules).length} modules`
    );
  });

  // Errors thrown outside QUnit's reach no longer stop the run, but they are
  // still bugs, and the tally alone would not show them. Report them as one
  // failure naming the test each escaped from.
  test('no test crashed outside QUnit', async ({ suite }) => {
    const detail = suite.pageErrors
      .map(error => `during "${error.during}": ${error.message}`)
      .join('\n  ');
    expect(suite.pageErrors.length, detail ? `\n  ${detail}` : '').toBe(0);
  });

  // The webgl and webgl2 modes are the entire reason this runner exists; if
  // they skip here too, the browser is not providing the contexts and the run
  // proves nothing.
  test('the webgl modes actually executed', async ({ suite }) => {
    const ran = { webgl: 0, webgl2: 0 };
    for (const tally of Object.values(suite.modules)) {
      ran.webgl += tally.passed + tally.failed;
    }
    expect(ran.webgl, 'no tests executed at all').toBeGreaterThan(0);
    expect(
      suite.skipped,
      'everything skipped — WebGL is unavailable in this browser'
    ).toBeLessThan(suite.total);
  });

  for (const moduleName of MODULES) {
    test(moduleName, async ({ suite }) => {
      const tally = suite.modules[moduleName];
      test.skip(!tally, `module "${moduleName}" did not run in this browser`);
      const detail = tally.failures.map(f => `${f.name}\n    ${f.message}`).join('\n  ');
      expect(tally.failed, detail ? `\n  ${detail}` : 'failed').toBe(0);
    });
  }
});
