# e2e — black-box characterization suite

Playwright + TypeScript, fully isolated from the app's own toolchain (own
`package.json`, `node_modules`, `tsconfig.json` and `biome.json`).

## What this tests

The suite loads real JMH result files into the built app and asserts on what
gets rendered, via user-visible DOM only (text, roles, the presence of
charts). It knows nothing about React, webpack or recharts. The point is to
survive a stack migration: as long as the suite stays green, the app's
rendered behaviour hasn't regressed.

It's a mix of pure characterization specs (upload, assert presence, no
interactions beyond the upload itself) and interaction specs that drive real
UI (the scale toggle, Details/Back navigation, the filters, the multi-run
Summary/Compare workflow) and check the effects.

## Commands

Run these in `e2e/`:

```bash
npm ci && npx playwright install chromium   # one-time
npm test                                    # headless run
npx playwright test specs/filters.spec.ts   # a single spec
npx playwright test -g "<test title>"       # tests matching a title (finds none if a flag excludes their tag)
npm run test:headed                         # headed, for debugging
npm run report                              # open the HTML report
npm run typecheck                           # tsc, no emit
npm run lint                                # biome check (formatting + lint), no writes
npm run format                              # biome check --write, applies safe fixes
npm run check                               # typecheck + lint + test
```

The suite serves a built app and doesn't build it. Run `npm run build` in the
repo root first (it writes `../build`), and again after every change to `src/`.

`APP_BUILD_DIR` (env var, default `../build`) is the path of the build to
serve and test: this checkout's own, or one built elsewhere. The latter is how
to check another branch without touching this checkout. Build it in a
`git worktree` and point `APP_BUILD_DIR` there:

```bash
git worktree add <path> <branch>
# Add NODE_OPTIONS=--openssl-legacy-provider before `npm run build` if <branch>
# predates the webpack 5 upgrade (webpack 4 + Node's newer OpenSSL).
( cd <path> && npm ci && npm run build )
APP_BUILD_DIR=<path>/build npm test
```

## Layout

- `specs/`: one spec per screen or feature. Each opens with a comment saying
  what it covers and why it runs on the data it does (several can only run on
  the bundled examples, since each vendored fixture holds a single class).
- `support/jmh-app.ts`: the page object, where most app-specific selectors
  live.
- `support/*-assertions.ts`: assertion routines that several specs share. Each
  has its own falsification check in `specs/harness.spec.ts`. Give every new
  shared assertion routine its own falsification check there.
- `support/mock-remote-fixtures.ts` and `support/gist-fixtures.ts`: back the
  URL/Gist specs with mocked network responses.
- `support/tags.ts`: names the test tags (see "Flags and tags").
- `specs/plugin-compat.spec.ts`: guards the contract with the
  gradle-jmh-report Gradle plugin, which unpacks a release build and
  overwrites `provided.js` with the result embedded as globals.
  `support/plugin-report.ts` mirrors the plugin's
  `JmhReportTask.generateReport()` (keep it in step with the task) and lays out
  such a report in the test's output folder. The specs open it from `file://`,
  as users do, and read the build directly from `APP_BUILD_DIR`. They hold for
  dev and release builds alike.
- `fixtures/`: vendored, unmodified JMH reports.
  - The linked-hash on-battery report is a deliberate companion to the plain
    one (same class, methods and params, ~45-51% worse scores), used to drive
    a real "Declined Benchmarks" comparison.
  - The five `linked-hash-vs-hash-multiple-benchmarks-*` reports are the same
    class with 7 methods and 64 results, run with 1, 2, 3, 5 and 9 threads.
    They're large enough for the sidebar's list to overflow the suite's window
    on every screen, which `scrollable-sidebar.spec.ts` needs (with the first
    three), and enough runs to crowd the run-selection bar, which
    `run-selection-bar.spec.ts` loads together.

## Constraints

- Never change app source for the suite's own benefit: no test-only hooks, ids
  or attributes in `src/`.
- Prefer semantic locators (`getByRole`, `getByText`). Where they fall short,
  only five non-semantic hooks are in use: `.recharts-wrapper`,
  `ul.nav ul.nav`, `div.btn`, `Tooltipped.tsx`'s `data-tooltip` attribute and
  `.sidebar-scroll-list` (the box around the sidebar's list that scrolls on
  its own, which the app's own styling uses too). Don't add to them lightly,
  and never use generated or hashed class names.
- Keep dependencies exact-pinned (`@biomejs/biome` included) and retries at 0.
  A characterization suite is for signal, and a silent dependency bump or a
  retry-hidden flake both defeat the purpose.
- Every spec must pass unmodified against builds of both `master` (the legacy
  pre-fork branch) and `main`: the suite characterizes shared behaviour, not
  branch-only UI. A test that needs a feature or behavioural fix that only
  newer builds have (a genuine one, not a test affordance) gets a tag and an
  env flag, see below.

## Flags and tags

Some tests only hold against builds that have a certain feature or fix. Each
is tagged, and an env flag decides whether the tag runs.

- All flags are booleans: `1`/`true`/`yes` or `0`/`false`/`no`. Empty or unset
  means the default, anything else aborts the run.
- All default to on, since this checkout's own build has everything. Plain
  `npm test` therefore passes against a `main` build.
- Set a flag to `0` only when `APP_BUILD_DIR` points at a build that predates
  the feature or fix: an older commit, `master`, a bisect.
- The flags are independent and combine.

| Flag | Set to `0` when the build predates… |
| --- | --- |
| `INCLUDE_FILTERS` | the benchmark/param filter checkboxes in the sidebar. |
| `HAS_FIX_FOR_SUMMARY_RUN_NAMES` | the fix of `SummaryScreen.tsx` passing the full run-name list to `SummaryView`. |
| `HAS_FIX_FOR_SINGLE_METHOD` | the guard that disables the checkbox of a class's last selected method. |
| `INCLUDE_SCROLLING_ENHANCEMENTS` | the scrollable sidebar list and the charts that scroll it to a clicked method (`plans/2026-10-20-SCROLLABLE-SIDEBAR-PLAN.md`). |

| Tag | Runs when | Description |
| --- | --- | --- |
| `@filters` | `INCLUDE_FILTERS` on | Tests for the benchmark/param filter checkboxes. |
| `@no-filters` | `INCLUDE_FILTERS` off | Mirror image of `@filters`: `harness.spec.ts`'s "rejects filters are not implemented" falsification check, which only holds against a build without filters. |
| `@needs-fix-for-summary-run-names` | `HAS_FIX_FOR_SUMMARY_RUN_NAMES` on | The Summary header naming the last two of 3 loaded runs correctly. |
| `@needs-fix-for-single-method` | `HAS_FIX_FOR_SINGLE_METHOD` on | Tests of the guard: the last selected method's checkbox is disabled, so a class can't be emptied. |
| `@must-not-have-fix-for-single-method` | `HAS_FIX_FOR_SINGLE_METHOD` off | Mirror image of the above: the old tests that deselect every method of a class. They only hold against builds without the guard. |
| `@scrolling-enhancements` | `INCLUDE_SCROLLING_ENHANCEMENTS` on | Tests for the sidebar list scrolling on its own below a fixed header, and for clicks on a chart scrolling it to the clicked method. |

The tag names live in `support/tags.ts`, except `@no-filters`, a literal in
`harness.spec.ts`. The switches live in `playwright.config.ts`, which matches
both filter tags with literal regexes.

Which kind of tag a new test needs:

- A feature that only newer builds have: an `@<feature>` tag with an
  `INCLUDE_*` flag.
- A bug fix that only newer builds have: a `@needs-fix-for-*` tag with a
  `HAS_FIX_FOR_*` flag.
- A fix that changes behaviour instead of repairing a bug: additionally tag
  the old behaviour's tests `@must-not-have-fix-for-*`, so that they keep
  running against builds without it.

A new flag needs a `parseFlag` call and a `grepInvert` entry in
`playwright.config.ts`, a `Tags` entry and a row in both tables above.

Example, combined with `APP_BUILD_DIR` as shown under "Commands":

```bash
# A `master` build, which predates all of it
INCLUDE_FILTERS=0 HAS_FIX_FOR_SINGLE_METHOD=0 HAS_FIX_FOR_SUMMARY_RUN_NAMES=0 INCLUDE_SCROLLING_ENHANCEMENTS=0 \
  APP_BUILD_DIR=<master-build>/build npm test
```

The fixes the `HAS_FIX_FOR_*` flags stand for:

- Summary run names: before the fix, a Summary comparing 3+ runs indexed an
  already-sliced 2-element array with absolute run indices. With 3 runs it
  named the last run first and left the second name empty, and with 4+ runs
  both names came out empty.
- Single method: the sidebar checkbox of a class's last selected method is
  disabled, so the selection can never be emptied (and a class with just one
  method can't be deselected at all). Before the fix, deselecting every method
  left a report with nothing in it.

## Gotchas

- Don't click while the bar labels are animating in. `BarChartView`'s
  `LabelList` animates over ~540ms after a load. On builds still on recharts
  1.x (anything before the modernization's recharts 2 bump, e.g. `master`), a
  re-render during that window (a sort, or a filter click the app refuses)
  drops the labels permanently: the chart keeps its bars, axes and category names, but the
  per-bar value labels never come back. A spec that interacts straight after
  `uploadReport()` and then asserts on a label fails there in a way that looks
  like a filtering bug. Wait the labels out first
  (`await expect(chart.getByText(/s\/op/)).toHaveCount(4)`), which several
  specs do as their first assertion anyway. recharts 2 fixed it and 3.x kept
  it fixed, so the suite deliberately asserts neither behaviour.
- A tooltip changes what `.recharts-wrapper` matches. `SingleRunChartTooltip`
  renders its "Raw Data" iteration charts as recharts charts of their own, so
  while one is open the page has several wrappers nested inside the first. Use
  `.first()` (or `benchmarkSection(...)`) whenever a hover is in play.

## Formatting and linting

- [Biome](https://biomejs.dev) (`biome.json`), scoped to this directory only:
  formatting, linting (`recommended` preset) and import sorting in one `check`
  command (`npm run lint`, `npm run format`).
- `fixtures/` is excluded. The reports in it are unmodified JMH tool output
  (the `"key" : value` space before the colon is JMH's own JSON writer, not a
  style choice), and reformatting them would trade that authenticity for a
  purely cosmetic diff.
- The app's `src/` and `test/` use the standalone root `../biome.json`, not
  this one, and there's no shared or extended config. Keep the formatter
  settings of the two in sync (2-space indent, single quotes, semicolons, no
  trailing commas, 120-col width). Both use the `recommended` lint preset.
  Only the root config turns a few rules off, for `src/`'s patterns.
