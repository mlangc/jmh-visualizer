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
  returns cleanly. Also holds a `@filters`-tagged test, excluded by default —
  see Constraints and `INCLUDE_FILTERS` below.
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
- `specs/bundled-examples.spec.ts` — characterizes the three bundled examples
  (`exampleBenchmark{1,2,3}.js`), the only data here that is broad rather than
  deep: 18-19 benchmark classes, two benchmark modes and five score units in
  one report, 1-3 parameter benchmarks, and classes present in one run but not
  another. Deliberately structural (counts, modes, units, run names, table
  sizes) — exact values are the vendored fixtures' job. Everywhere else the
  examples appear only as *negative* data in `harness.spec.ts`.
- `specs/two-runs-compare.spec.ts` — the two-run Compare screen
  (`TwoRunsView`/`TwoRunBundle`/`DiffBarChartView`), which nothing else
  reaches: specs that load 2 runs stop at the Summary screen, and the
  3-fixture specs toggling Compare land in `MultiRunView`. Covers the diff
  chart's categories and per-bar percentages, the mutually exclusive
  "Show JSON 1"/"Show JSON 2" panels, and (on the bundled two-run example,
  since the fixtures hold identical benchmark sets) the "Removed
  benchmarks:"/"New benchmarks:" lists.
- `specs/secondary-metrics.spec.ts` — the sidebar metric dropdown switching the
  Run screen onto a secondary metric. `RunSideBar` only offers options starting
  with JMH's `·`, which no vendored fixture has (their JMH wrote
  `gc.alloc.rate` unprefixed), so this runs on the bundled example. The second
  test pins the flip side: with those fixtures the picker stays *enabled* with
  a single option and its "No secondary metrics found!!" hint suppressed.
- `specs/summary-header.spec.ts` — the Summary screen's "Comparing … for 'X'
  and 'Y' …" sentence, the only place the app names *which* two runs the
  comparison tables are about. The 3-run test is `@needs-fix`-tagged (see
  Commands below).
- `specs/load-errors.spec.ts` — the failure paths every other spec asserts
  *don't* happen: an unparseable upload (an inline buffer, not a vendored
  broken file) alerting and leaving the start screen usable, and a 404 on a
  URL/gist alerting and stranding the app on a blank screen. The gist case also
  pins a real bug — `fetchFromGists` alerts inside its own `.catch` and then
  reads `json.files` off the `undefined` that resolves to.
- `specs/harness.spec.ts` — tests the assertion routines back, proving they
  aren't vacuously green: `expectCostOfAllocRateNormReport` must reject on a
  blank page and on the three bundled examples (real JMH data the routine
  isn't written for). `expectDeclinedBenchmarks`/`expectImprovedBenchmarks`/
  `expectUnchangedBenchmarks` (shared `expectComparisonRows` routine) must
  reject on a blank page, reject a table that renders no heading at all (0
  improved rows), reject a row that's real but lives in a *different* table
  on the same page despite a matching row count (the two-real-tables case at
  the slider's 50% max), and reject a row set with one wrong `params` value
  despite a matching row count. `expectSummaryHeader` must reject swapped run
  names and a wrong result count; `expectTwoRunCompare` must reject the
  *Summary* screen of the very same two runs (which also says "Comparing",
  also renders charts, and also names both runs) and a single wrong score
  difference.
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
- `support/report-assertions.ts` — `expectCostOfAllocRateNormReport()`, the 14
  shared checks the smoke spec and harness spec call — presence, plus both bar
  labels and two axis ticks by value, so a migration that changes number
  formatting or bar scaling fails here instead of passing. Takes an
  optional `runName` (defaults to the file-upload name) for the URL/Gist
  variants, which name the same fixture differently.
- `support/summary-header-assertions.ts` — `expectSummaryHeader()`, the Summary
  screen's header sentence including both `<Badge>` counts, matched as one
  whitespace-tolerant regex since React splits it across text nodes.
- `support/two-run-compare-assertions.ts` — `expectTwoRunCompare()` plus
  `LINKED_HASH_PAIR_COMPARE`, the expectation the Compare spec and the harness
  spec share. Categories and bar labels are checked for presence, not pairing:
  tying a label to its category needs recharts' internal class names, which
  this suite doesn't use.
- `support/start-screen-assertions.ts` — `expectStartScreen()`, shared by the
  start-screen spec and the post-reset check in the multi-run spec.
- `support/summary-comparison-assertions.ts` —
  `expectDeclinedBenchmarks()`/`expectImprovedBenchmarks()`/
  `expectUnchangedBenchmarks()`, shared checks for the Summary screen's 3
  comparison tables (an optional `opts.timeout` lets the harness spec's
  falsification checks fail fast), plus `LINKED_HASH_PAIR_ROWS` (the
  method/param combinations the linked-hash pair always produces, regardless
  of which table load order sends them to).
- `support/linked-hash-first-vs-iter-next-filters-assertions.ts` —
  `expectFiltersBeingPresent()`, the `@filters`-tagged test's own assertion:
  checkbox presence for both methods (`entryIteratorNext`, `firstEntry`) and
  both `size` param values (`10`, `100`) they share.
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
npm run lint                                # biome check (formatting + lint), no writes
npm run format                              # biome check --write, applies safe fixes
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

`INCLUDE_FILTERS` (env var; `1`/`true`/`yes` to opt in, `0`/`false`/`no`,
empty or unset to skip — anything else aborts the run) opts into
`@filters`-tagged specs —
tests for the benchmark/param filter checkboxes added on
`add-filters-for-large-result-files`. That UI doesn't exist on `master`, so
these specs are excluded by default (`grepInvert` in `playwright.config.ts`)
and only make sense run against a build of that branch — combine with
`APP_BUILD_DIR` the same way as above:

```bash
INCLUDE_FILTERS=1 APP_BUILD_DIR=<path-to-filters-branch>/build npm test
```

The same `grepInvert` toggle also excludes the mirror-image `@no-filters`
tag whenever `INCLUDE_FILTERS` is set — `harness.spec.ts`'s "rejects filters
are not implemented" falsification check, which only holds against a
`master` build (the filters branch actually implements them, so the check
would fail there for the right reason but for the wrong test).

`SKIP_NEEDS_FIX` (env var, same parsing as `INCLUDE_FILTERS`) opts *out* of
`@needs-fix`-tagged tests — tests that need an app fix this suite ships
alongside. Unlike `@filters`, they run by default: the fix is in this branch's
`src/`, so the default build has it. Set the flag when `APP_BUILD_DIR` points
at a build that predates the fix (an older branch, `master` before the fix
lands, a bisect):

```bash
SKIP_NEEDS_FIX=1 APP_BUILD_DIR=<path-to-older-build>/build npm test
```

The two tag axes are independent and combine — checking the filters branch
before the fix is merged there needs both:

```bash
INCLUDE_FILTERS=1 SKIP_NEEDS_FIX=1 APP_BUILD_DIR=<filters-branch>/build npm test
```

The only fix currently tagged is `SummaryScreen.jsx` passing the full run-name
list to `SummaryView`: before it, a Summary comparing 3+ runs indexed an
already-sliced 2-element array with absolute run indices, so with 3 runs it
named the *last* run first and left the second name empty — and with 4+ runs
both names came out empty. `/@needs-fix/` is
matched without a trailing `\b`, so a per-fix tag (`@needs-fix-summary-run-names`)
would be covered by the same switch if a second one ever earns its own name.

## Formatting & linting

[Biome](https://biomejs.dev) (`biome.json`), scoped to this directory only —
`src/` isn't covered yet. Bundles formatting, linting (`recommended` preset),
and import sorting into one `check` command (`npm run lint`/`npm run
format`). `fixtures/*.json` are excluded: those are vendored, unmodified JMH
tool output (note the `"key" : value` space-before-colon — that's JMH's own
JSON writer, not a style choice), and reformatting them would trade that
authenticity for a purely cosmetic diff.

Formatter settings (2-space indent, single quotes, semicolons, no trailing
commas, 120-col width) were picked to match `src/`'s own dominant
conventions where one exists, so extending Biome to `src/` later stays a
small diff — indent width is the one exception (`src/` splits ~58/68 files
at 4-space with no discernible pattern; 2-space was a deliberate call to
match Biome/Prettier's own default instead). The lint preset is
`recommended` as-is; nothing's been relaxed yet since it hasn't produced any
noise here (all violations to date: one rule, `useImportType`, always
safe-fixable). Expect some of `recommended` to need relaxing once Biome
extends to `src/`'s older patterns.

## Constraints

- **No app-source changes for the suite's own benefit** — no test-only hooks,
  ids or attributes were ever added to `src/` to make something testable, and
  the suite runs unmodified against a vanilla checkout apart from the
  `@needs-fix` tests described below, which need a genuine behavioural fix
  (not a test affordance) that older builds lack. Where semantic locators (`getByRole`/`getByText`) fall short, only
  four non-semantic hooks are used: `.recharts-wrapper`, `ul.nav ul.nav`,
  `div.btn`, and `Tooltipped.jsx`'s `data-tooltip` attribute. No generated /
  hashed class names.
- **Exact-pinned deps, no retries** — a characterization suite is for signal;
  a silent dependency bump or a retry-hidden flake both defeat the purpose.
  `@biomejs/biome` is pinned the same way.
- Every spec must pass unmodified on both `master` and
  `add-filters-for-large-result-files` — it characterizes *shared* behaviour,
  not branch-only UI. Two deliberate exceptions, both tagged and both
  switchable from the environment. First, `@filters`-tagged tests
  characterize the filter checkboxes that only exist on
  `add-filters-for-large-result-files`. They're excluded by default (opt in
  with `INCLUDE_FILTERS=1`, see Commands above), so plain `npm test` still
  passes unmodified against a `master` build. `@no-filters` is this
  exception's mirror image: a falsification check that only holds against
  `master` (see Commands above), excluded the other way by the same
  `INCLUDE_FILTERS` toggle.
- Second, `@needs-fix` cuts the other way: those tests describe behaviour only a build
  carrying this branch's `src/` fix has, so they run by default and get
  excluded with `SKIP_NEEDS_FIX=1` when testing an older build (see Commands
  above). Both directions are verified: the full suite is green against the
  filters-branch build with `INCLUDE_FILTERS=1 SKIP_NEEDS_FIX=1`, and against
  a pre-fix build with `SKIP_NEEDS_FIX=1`.
