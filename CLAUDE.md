# Working on gpu.js

## Build environment

Use Node 22.23.1 via `~/.asdf/installs/nodejs/22.23.1/bin`. Node 23 breaks
headless-gl.

```bash
export PATH="$HOME/.asdf/installs/nodejs/22.23.1/bin:$PATH"
```

`npm run make` runs build → beautify → minify → build-tests, from plain Node
scripts in `scripts/`. It rewrites `dist/` and regenerates `test/all.html`, so
run it before anything that loads the browser bundle, and commit `dist/` with
the change. Individual steps are available as `npm run build`, `minify`,
`beautify`, `build-tests`; `npm run dev` serves the repo for test/all.html.

The banner interpolates `new Date()`, so two builds are never byte-identical —
compare `dist/` with the `@date` lines normalized. Note the minified bundles
carry the banner twice: terser preserves the original because it contains
`@license`, and the minify step prepends another.

Note `beautify` reformats `src/`, so `npm run make` can produce unrelated
whitespace churn in files you did not touch. That is expected.

## Tests

`npm test` runs qunit over `test/issues test/internal test/features`.

The suite has platform-dependent failures that are **not** regressions:

- **macOS**: 3 known failures, all `Infinity without float` (the unsigned
  encoding saturates to ~1.7e38 instead of producing NaN).
- **Linux/Mesa**: a different and larger set, baselined in
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
export PATH="$HOME/.asdf/installs/nodejs/22.23.1/bin:$PATH"

npm version <version> --no-git-tag-version   # package.json only
npm run make                                 # dist/ carries the version header
npm test                                     # expect the known baseline

git add -A && git commit -m "chore: Release <version>"
git tag <version>
git push origin develop && git push origin <version>

gh release create <version> --title "<version>" --notes-file <notes>
```

### npm publish without an OTP code

Publishing needs 2FA. Run it under a pty and npm offers **web** auth — it
prints a URL to approve in a browser, and no authenticator code changes hands:

```bash
script -q /tmp/npm-publish.log npm publish --auth-type=web &
# then read /tmp/npm-publish.log for:
#   Authenticate your account at:
#   https://www.npmjs.com/auth/cli/<uuid>
```

Without a pty this fails immediately with `EOTP` and no URL: npm's `otplease`
gates on `process.stdin.isTTY` and rethrows before it ever reaches the web
flow. `--auth-type=web` alone is not enough.

Two things that will waste time otherwise:

- Do not pipe the command through `tail`/`head` — the output buffers until
  exit and the URL never appears while you need it. Let `script` write its own
  transcript and read that.
- `npm view gpu.js version` lags behind a publish by up to a minute. Check
  `curl -s https://registry.npmjs.org/gpu.js` for the truth.

If publish fails with `E404 PUT ... not found`, the npm token expired — run
`npm login`.

### Pushing workflow files

`git push` rejects changes under `.github/workflows/` because the PAT in
`GITHUB_TOKEN` lacks the `workflow` scope. Either use the keyring credential:

```bash
env -u GITHUB_TOKEN git push
```

or push everything else and add the workflow file through the GitHub API.
