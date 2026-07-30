# Working on gpu.js

## Build environment

Node 22. Node 23 breaks headless-gl, and early 22.x hits a vinyl-fs bug, so
pin something recent within 22.

`npm run make` runs build → beautify → minify → build-tests, from plain Node
scripts in `scripts/`. It rewrites `dist/` and regenerates `test/all.html`, so
run it before anything that loads the browser bundle, and commit `dist/` with
the change. Individual steps are available as `npm run build`, `minify`,
`beautify`, `build-tests`; `npm run dev` serves the repo for test/all.html.

Bundling is rolldown, minifying is terser. Two things there are load-bearing:

- `gl` and (for the core build) `acorn` are aliased to `scripts/empty-module.js`.
  That is browserify's old `.ignore()`. They must be aliased, not `external` —
  external leaves a live `require()` that throws in a browser.
- both the bundle and the minified bundle are run through terser with
  `ascii_only`. acorn ships its unicode tables already escaped, but rolldown
  decodes string literals and prints the characters, which puts ~68k raw UTF-8
  bytes in the bundle. Serving that without a matching charset is #743/#744.

The banner interpolates `new Date()`, so two builds are never byte-identical —
compare `dist/` with the `@date` lines normalized. All four bundles of one run
share a timestamp: the minify step passes the banner through (terser keeps it
via `output.comments`, since it carries `@license`) rather than prepending its
own. Prepending is what used to put the banner in the minified files twice,
seconds apart.

Note `beautify` reformats `src/`, so `npm run make` can produce unrelated
whitespace churn in files you did not touch. That is expected.

## Tests

`npm test` runs qunit over `test/issues test/internal test/features`.

The suite has platform-dependent failures that are **not** regressions:

- **Linux/Mesa**: a set of failures baselined in
  `.github/known-test-failures.txt`. CI compares against it with
  `.github/compare-test-failures.js` and fails only on *new* failures, so the
  raw exit code is not the signal.
- `test/internal/math.random.js` "unique every time" is flaky (seed
  collisions, related to #850). A single failure there is not meaningful.

Confirm any new regression test actually catches the bug by reverting the fix
and watching it fail — a test that passes both ways is worse than none.

## Real devices

Bugs that only reproduce on real GPU drivers are a recurring theme here; three
were found this way in 2.19.8 alone, none of which any CI runner could have
caught. See the Testing section of README.md for how to run it.

```bash
npm run make                     # devices load dist/, so build first
npm run test:browserstack        # real iOS/Android
node test/browserstack/run.js --dry-run --browsers=desktop   # inspect caps, no session
```

Credentials live in gitignored `test/browserstack/.credentials.json`, and as
`BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY` repo secrets for CI.

BrowserStack groups runs into one build by `buildName`, distinguishing them by
`buildIdentifier`. Keep `buildName` stable — a name that varies per run creates
a separate build every time and there is no single `gpu.js` entry to find in
the dashboard.

## Releasing

Every step below is required; skipping the npm publish is the usual mistake —
2.19.5 and 2.19.7 have tags and GitHub releases but were never published, so
their release notes tell people to install a version that does not exist.

```bash
npm version <version> --no-git-tag-version   # package.json only
npm run make                                 # dist/ carries the version header
npm test                                     # expect the known baseline

git add -A && git commit -m "chore: Release <version>"
git tag <version>
git push origin develop && git push origin <version>

gh release create <version> --title "<version>" --notes-file <notes>
```

### Publishing

`npm publish` requires 2FA and prompts for a one-time code. Two things that
otherwise waste time:

- `npm view gpu.js version` lags a publish by up to a minute. `curl -s
  https://registry.npmjs.org/gpu.js` is authoritative.
- `E404 PUT ... not found` on publish means the npm token expired, not that
  anything is wrong with the package. Run `npm login`.

### Pushing workflow files

Changes under `.github/workflows/` are rejected unless the credential pushing
them carries the `workflow` scope. Push with one that does, or add the file
through the GitHub API.
