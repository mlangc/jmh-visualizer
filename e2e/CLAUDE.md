# e2e — black-box characterization suite

Playwright + TypeScript, fully isolated from the app's own toolchain (own
`package.json`/`node_modules`/`tsconfig.json`). Never touches app source or
the app's Babel 6 / webpack 4 stack.

## What this tests

Loads a real JMH result file into the built app and asserts the single-run
report renders completely — text, roles, presence of chart, via user-visible
DOM only. No knowledge of React/webpack/recharts. The point is to survive a
stack migration: as long as this suite stays green, the app's rendered
behaviour hasn't regressed.

Most of the suite is pure characterization (upload, assert presence, no
interactions beyond the upload itself). One spec goes further and drives real
UI interactions (the scale toggle, and Details/Back navigation) to check
their effects too — see below.

- `specs/smoke-cost-of-alloc-rate-norm-benchmark.spec.ts` — the static
  characterization test.
- `specs/linked-hash-first-vs-iter-next-benchmark.spec.ts` — interaction
  test: on top of the initial render, clicks the log/linear scale toggle and
  asserts the chart changes without error, then Show Details / Back and
  asserts the fixture's secondary GC metrics (`gc.alloc.rate`,
  `gc.alloc.rate.norm`, `gc.count`, `gc.time`) are listed and navigation
  returns cleanly.
- `specs/harness.spec.ts` — tests the assertions back: they must reject on a
  blank page and on the three bundled examples (real JMH data the routine
  isn't written for). Proves the checks aren't vacuously green.
- `support/report-assertions.ts` — `expectCostOfAllocRateNormReport()`, the 13
  shared presence checks the smoke spec and harness spec call.
- `support/jmh-app.ts` — page object; the only place that knows app-specific
  selectors (upload input, "Load … Example" links, scale/details/back
  controls).
- `fixtures/cost-of-alloc-rate-norm-benchmark.json` — vendored JMH report used
  by the smoke spec.
- `fixtures/linked-hash-first-vs-iter-next-benchmark.json` — vendored JMH
  report (with populated `secondaryMetrics`) used by the interaction spec.

## Commands

```bash
npm ci && npx playwright install chromium   # one-time
npm test                                    # headless run
npm run test:headed                         # headed, for debugging
npm run report                              # open the HTML report
```

Needs a built app to serve. From the repo root:

```bash
NODE_OPTIONS=--openssl-legacy-provider npm run build   # writes ../build
```

`APP_BUILD_DIR` (env var, default `../build`) is just the path to whatever
`build/` the suite should serve and test — this checkout's own, or one built
elsewhere. The latter is how you check another branch without touching this
checkout: build it in a `git worktree` and point `APP_BUILD_DIR` there.

```bash
git worktree add /tmp/jmh-other <branch>
( cd /tmp/jmh-other && npm ci && NODE_OPTIONS=--openssl-legacy-provider npm run build )
APP_BUILD_DIR=/tmp/jmh-other/build npm test
```

## Constraints

- **No app-source changes** — the suite must run unmodified against a vanilla
  checkout. Where semantic locators (`getByRole`/`getByText`) fall short, only
  four non-semantic hooks are used: `.recharts-wrapper`, `ul.nav ul.nav`,
  `div.btn`, and `Tooltipped.jsx`'s `data-tooltip` attribute. No generated /
  hashed class names.
- **Exact-pinned deps, no retries** — a characterization suite is for signal;
  a silent dependency bump or a retry-hidden flake both defeat the purpose.
- Every spec must pass unmodified on both `master` and
  `add-filters-for-large-result-files` — it characterizes *shared* behaviour,
  not branch-only UI.
