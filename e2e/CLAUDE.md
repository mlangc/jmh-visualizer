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
  together, then delegates to `support/multi-run-workflow.ts`'s shared
  assertions: the "Ignoring deviations below" slider (moved to its max to
  prove a real filtering effect, not just a label change), the "Declined"/
  "Unchanged Benchmarks" tables, drilling into each run individually via the
  top-nav run buttons, switching back to Summary and on to Compare via the
  same title button, the "Benchmarks" sidebar's scroll-to-section links, and
  "Reset & Upload New" returning to the start screen.
- `specs/start-screen.spec.ts` — characterizes the empty upload/start screen
  on a fresh page load (the cold-load path, as opposed to the post-reset
  path exercised at the end of `support/multi-run-workflow.ts`'s shared
  assertions — those two are driven by genuinely different code that only
  coincidentally produces the same screen today).
- `specs/harness.spec.ts` — tests the assertion routines back, proving they
  aren't vacuously green: `expectCostOfAllocRateNormReport` must reject on a
  blank page and on the three bundled examples (real JMH data the routine
  isn't written for). `expectDeclinedBenchmarks`/`expectImprovedBenchmarks`/
  `expectUnchangedBenchmarks` (shared `expectComparisonRows` routine) must
  reject on a blank page, reject a table that renders no heading at all (0
  improved rows), reject a row that's real but lives in a *different* table
  on the same page despite a matching row count (the two-real-tables case at
  the slider's 50% max), and reject a row set with one wrong `params` value
  despite a matching row count.
- `specs/single-run-via-url-and-gist.spec.ts` — the smoke spec's fixture,
  loaded via a single "Load from URL(s)"/"Load from Gist(s)" entry instead
  of file upload, against mocked network responses (see
  `support/mock-remote-fixtures.ts`).
- `specs/linked-hash-pair-via-file-url-gist.spec.ts` — just the linked-hash
  pair (not all 3 fixtures), loaded regular-then-on-battery via file, URL,
  and Gist — a subset the multi-run spec doesn't exercise in isolation.
  Always declines on every method/param combination in this order.
- `specs/linked-hash-pair-reversed-order.spec.ts` — the same pair loaded
  on-battery-first via URL/Gist (file upload can't express this order —
  it's always alphabetical). Same 4 method/param combinations, but landing
  in Improved Benchmarks instead of Declined, and at a different magnitude —
  the Summary screen's percentage is relative to whichever run loaded
  *second*, not to whichever run is worse.
- `specs/all-three-via-query-params.spec.ts` — all 3 fixtures, same order as
  the multi-run spec's file upload, loaded instead via the `?sources=`/
  `?gists=` query params — the only way to load 3+ URLs/Gists at once, since
  the "Load from URL(s)/Gist(s)" dialogs cap at 2 fields.
- `specs/all-three-via-multi-file-gist.spec.ts` — all 3 fixtures loaded from
  a single gist ID that holds all 3 as separate files, via the "Load from
  Gist(s)" dialog's single Gist 1 field — the one spec that exercises
  `fetchFromGists`' one-run-per-file-in-the-gist fan-out (every other Gist
  spec mocks a single-file gist). Reuses the same
  `support/multi-run-workflow.ts` assertions as the file-upload spec.
- `support/report-assertions.ts` — `expectCostOfAllocRateNormReport()`, the 13
  shared presence checks the smoke spec and harness spec call. Takes an
  optional `runName` (defaults to the file-upload name) for the URL/Gist
  variants, which name the same fixture differently.
- `support/start-screen-assertions.ts` — `expectStartScreen()`, shared by the
  start-screen spec and the post-reset check in the multi-run spec.
- `support/summary-comparison-assertions.ts` —
  `expectDeclinedBenchmarks()`/`expectImprovedBenchmarks()`/
  `expectUnchangedBenchmarks()`, shared checks for the Summary screen's 3
  comparison tables (an optional `opts.timeout` lets the harness spec's
  falsification checks fail fast), plus `LINKED_HASH_PAIR_ROWS` (the
  method/param combinations the linked-hash pair always produces, regardless
  of which table load order sends them to).
- `support/regex-util.ts` — `escapeRegExp()`, shared by the two support files
  above wherever fixture-derived text (run names, param values) is
  interpolated into a `RegExp`.
- `support/page-watchers.ts` — `watchDialogsAndErrors()`, registers the
  `dialog`/`pageerror` listeners nearly every spec uses to assert nothing
  fired. Must be called before the load/action under test, same as the
  manual version it replaced — an event that fires before the listener is
  registered is missed.
- `support/multi-run-workflow.ts` — `expectMultiRunWorkflow()`, the shared
  Summary/Compare/drill-down/sidebar/reset assertions for "all 3 fixtures
  loaded at once", parameterized by each fixture's run name so it works
  unchanged across file upload, `?sources=`/`?gists=`, and the multi-file
  gist — used by `multi-run-summary-and-compare.spec.ts` and
  `all-three-via-multi-file-gist.spec.ts`.
- `support/jmh-app.ts` — page object; the only place that knows app-specific
  selectors (upload input, "Load … Example" links, "Load from URL(s)/Gist(s)"
  dialogs, scale/details/back controls, the multi-run top nav and sidebar).
  `loadFromGists()` takes an optional `expectedRunCount` (defaults to
  `gistIds.length`) for a gist holding more than 1 file.
- `support/gist-fixtures.ts` — the 3 real gists (owned by mlangc) that are
  1:1 in content with the 3 local fixtures below, used by the URL/Gist specs,
  plus `ALL_THREE_GIST_ID` — a placeholder ID (not a real gist yet) for a
  gist holding all 3 as separate files, used only by
  `all-three-via-multi-file-gist.spec.ts` against a mocked response. Nothing
  re-verifies the 3 real gists against their live counterparts, so if one
  were ever edited or deleted, the mocked tests would stay green while this
  file's "1:1 in content" claim quietly went stale.
- `support/mock-remote-fixtures.ts` — `page.route()` helpers backing the
  URL/Gist specs: `mockGistApi()`/`mockRawUrls()` serve local fixture content
  in place of the real GitHub API/raw URLs, `mockMultiFileGistApi()` mocks
  one gist ID's response with several files bundled into it (for the
  one-run-per-file fan-out), and `blockOffOrigin()` aborts any other
  off-origin request so a spec that forgets to mock fails fast and clearly
  instead of silently hitting the real network or hanging on a swallowed
  `alert()`.
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
git worktree add <path> <branch>
( cd <path> && npm ci && NODE_OPTIONS=--openssl-legacy-provider npm run build )
APP_BUILD_DIR=<path>/build npm test
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
