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

The suite is a mix of pure characterization specs (upload, assert presence,
no interactions beyond the upload itself) and interaction specs that drive
real UI — the scale toggle, Details/Back navigation, the multi-run
Summary/Compare workflow — and check their effects too. See below for which
is which.

- `specs/smoke-cost-of-alloc-rate-norm-benchmark.spec.ts` — the static
  characterization test.
- `specs/linked-hash-first-vs-iter-next-benchmark.spec.ts` — interaction
  test: on top of the initial render, clicks the log/linear scale toggle and
  asserts the chart changes without error, then Show Details / Back and
  asserts the fixture's secondary GC metrics (`gc.alloc.rate`,
  `gc.alloc.rate.norm`, `gc.count`, `gc.time`) are listed and navigation
  returns cleanly.
- `specs/multi-run-summary-and-compare.spec.ts` — uploads all 3 fixtures
  together and drives the multi-run workflow: the "Ignoring deviations
  below" slider (moved to its max to prove a real filtering effect, not just
  a label change), the "Declined Benchmarks" table, drilling into each
  uploaded file individually via the top-nav run buttons, switching back to
  Summary and on to Compare via the same title button, the "Benchmarks"
  sidebar's scroll-to-section links, and "Reset & Upload New" returning to
  the start screen.
- `specs/start-screen.spec.ts` — characterizes the empty upload/start screen
  on a fresh page load (the cold-load path, as opposed to the post-reset
  path exercised inline at the end of the multi-run spec above — those two
  are driven by genuinely different code that only coincidentally produces
  the same screen today).
- `specs/harness.spec.ts` — tests the assertions back: they must reject on a
  blank page and on the three bundled examples (real JMH data the routine
  isn't written for). Proves the checks aren't vacuously green.
- `support/report-assertions.ts` — `expectCostOfAllocRateNormReport()`, the 13
  shared presence checks the smoke spec and harness spec call.
- `support/start-screen-assertions.ts` — `expectStartScreen()`, shared by the
  start-screen spec and the post-reset check in the multi-run spec.
- `support/jmh-app.ts` — page object; the only place that knows app-specific
  selectors (upload input, "Load … Example" links, scale/details/back
  controls, the multi-run top nav and sidebar).
- `fixtures/cost-of-alloc-rate-norm-benchmark.json` — vendored JMH report used
  by the smoke spec (and, via a single-file drill-down, the multi-run spec).
- `fixtures/linked-hash-first-vs-iter-next-benchmark.json` — vendored JMH
  report (with populated `secondaryMetrics`) used by the interaction spec.
- `fixtures/linked-hash-first-vs-iter-next-on-battery-benchmark.json` —
  deliberate companion to the fixture above: same benchmark class, methods,
  and params, with worse (~45-51%) scores throughout, used by the multi-run
  spec to drive a real "Declined Benchmarks" comparison.

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
