# e2e — black-box characterization suite

Playwright + TypeScript, fully isolated from the app's own toolchain (own
`package.json`/`node_modules`/`tsconfig.json`). Never touches app source or
the app's own build toolchain.

## What this tests

Loads a real JMH result file into the built app and asserts the single-run
report renders completely — text, roles, presence of chart, via user-visible
DOM only. No knowledge of React/webpack/recharts. The point is to survive a
stack migration: as long as this suite stays green, the app's rendered
behaviour hasn't regressed.

The suite is a mix of pure characterization specs (upload, assert presence,
no interactions beyond the upload itself) and interaction specs that drive
real UI — the scale toggle, Details/Back navigation, the multi-run
Summary/Compare workflow — and check their effects too.

## Layout

- `specs/` — one spec per screen or feature; each opens with a comment saying
  what it covers and why it runs on the data it does (several can only run on
  the bundled examples, since each vendored fixture holds a single class).
- `support/` — the shared pieces: `jmh-app.ts` is the page object and the only
  place that knows app-specific selectors; the `*-assertions.ts` files hold
  assertion routines that several specs share, each with its own falsification
  check in `specs/harness.spec.ts`; `mock-remote-fixtures.ts` and
  `gist-fixtures.ts` back the URL/Gist specs with mocked network responses;
  `tags.ts` names the test tags (see Flags and tags below).
- `fixtures/` — vendored, unmodified JMH reports. The linked-hash on-battery
  report is a deliberate companion to the plain one (same class, methods and
  params, ~45-51% worse scores), used to drive a real "Declined Benchmarks"
  comparison.

## Commands

```bash
npm ci && npx playwright install chromium   # one-time
npm test                                    # headless run
npm run test:headed                         # headed, for debugging
npm run report                              # open the HTML report
npm run typecheck                           # tsc, no emit
npm run check                               # typecheck + lint + test
npm run lint                                # biome check (formatting + lint), no writes
npm run format                              # biome check --write, applies safe fixes
```

Needs a built app to serve. From the repo root:

```bash
npm run build   # writes ../build
```

`APP_BUILD_DIR` (env var, default `../build`) is just the path to whatever
`build/` the suite should serve and test — this checkout's own, or one built
elsewhere. The latter is how you check another branch without touching this
checkout: build it in a `git worktree` and point `APP_BUILD_DIR` there.

```bash
git worktree add <path> <branch>
# Add NODE_OPTIONS=--openssl-legacy-provider before `npm run build` if <branch>
# predates the webpack 5 upgrade (webpack 4 + Node's newer OpenSSL).
( cd <path> && npm ci && npm run build )
APP_BUILD_DIR=<path>/build npm test
```

### Flags and tags

Some specs only hold against builds that have a certain UI or app fix. Each is
tagged, and an env var decides whether the tag is run. All flags are booleans
(`1`/`true`/`yes` or `0`/`false`/`no`; empty or unset means the default,
anything else aborts the run) and all default to **on**, since a default build
(this checkout's own) has everything. Set one to `0` only when `APP_BUILD_DIR`
points at a build that predates the feature or fix — an older branch, `master`,
a bisect. The flags are independent and combine.

| Flag | Default | Set to `0` when the build… |
| --- | --- | --- |
| `INCLUDE_FILTERS` | on | predates the benchmark/param filter checkboxes (`master`, or an older `main` commit). They were added on `add-filters-for-large-result-files` and are now merged into `main`. |
| `HAS_FIX_FOR_SUMMARY_RUN_NAMES` | on | predates the fix of `SummaryScreen.tsx` passing the full run-name list to `SummaryView` (see below). |
| `HAS_FIX_FOR_SINGLE_METHOD` | on | predates the guard that disables the checkbox of a class's last selected method (see below). |

| Tag | Runs when | Description |
| --- | --- | --- |
| `@filters` | `INCLUDE_FILTERS` on | Tests for the benchmark/param filter checkboxes. |
| `@no-filters` | `INCLUDE_FILTERS` off | Mirror image of `@filters`: `harness.spec.ts`'s "rejects filters are not implemented" falsification check, which only holds against a build without filters. |
| `@needs-fix-for-summary-run-names` | `HAS_FIX_FOR_SUMMARY_RUN_NAMES` on | The Summary header naming the last two of 3 loaded runs correctly. |
| `@needs-fix-for-single-method` | `HAS_FIX_FOR_SINGLE_METHOD` on | Tests of the guard: the last selected method's checkbox is disabled, so a class can't be emptied. |
| `@must-not-have-fix-for-single-method` | `HAS_FIX_FOR_SINGLE_METHOD` off | Mirror image of the above: the old tests that deselect every method of a class. They only hold against builds without the guard. |

The tag names live in `support/tags.ts`, the switches in `playwright.config.ts`.

Examples, each combined with `APP_BUILD_DIR` the same way as above:

```bash
# A build with the filters and the Summary fix, but without the single-method guard
HAS_FIX_FOR_SINGLE_METHOD=0 APP_BUILD_DIR=<path-to-older-build>/build npm test

# An old `master` build that predates all of it
INCLUDE_FILTERS=0 HAS_FIX_FOR_SINGLE_METHOD=0 HAS_FIX_FOR_SUMMARY_RUN_NAMES=0 \
  APP_BUILD_DIR=<old-master-build>/build npm test
```

The fixes the `HAS_FIX_FOR_*` flags stand for:

- **Summary run names:** before it, a Summary comparing 3+ runs indexed an
  already-sliced 2-element array with absolute run indices, so with 3 runs it
  named the *last* run first and left the second name empty — and with 4+ runs
  both names came out empty.
- **Single method:** the sidebar checkbox of a class's last selected method is
  disabled, so the selection can never be emptied (and a class with just one
  method can't be deselected at all). Before it, deselecting every method left
  a report with nothing in it.

## Gotchas

- **Don't click while the bar labels are animating in.** `BarChartView`'s
  `LabelList` animates over ~540ms after a load, and on builds still on
  recharts 1.x (anything before the modernization's recharts 2 bump, e.g.
  `master`), a re-render during that window — a sort, or a filter
  click the app refuses — drops the labels permanently: the chart keeps its
  bars, axes and category names, but the per-bar value labels never come
  back. A spec
  that interacts straight after `uploadReport()` and then asserts on a label
  will fail there in a way that looks like a filtering bug. Wait the labels
  out first (`await expect(chart.getByText(/s\/op/)).toHaveCount(4)`), which
  several specs do as their first assertion anyway. recharts 2 fixed it (and
  3.x kept it fixed), so it's deliberately not pinned either way.
- **A tooltip changes what `.recharts-wrapper` matches.** `SingleRunChartTooltip`
  renders its "Raw Data" iteration charts as recharts charts of their own, so
  while one is open the page has several wrappers nested inside the first. Use
  `.first()` (or `benchmarkSection(...)`) whenever a hover is in play.

## Formatting & linting

[Biome](https://biomejs.dev) (`biome.json`), scoped to this directory only.
Bundles formatting, linting (`recommended` preset), and import sorting into
one `check` command (`npm run lint`/`npm run format`). `fixtures/*.json` are
excluded: those are vendored, unmodified JMH tool output (note the `"key" :
value` space-before-colon — that's JMH's own JSON writer, not a style
choice), and reformatting them would trade that authenticity for a purely
cosmetic diff.

The app's `src/`/`test/` use their own standalone root `../biome.json`, not
this one, and not a shared/extended config (the outer config path-scopes
itself, since Biome 2.x treats this nested `biome.json` as a conflicting root
otherwise). Keep the two configs' formatter settings (2-space indent, single
quotes, semicolons, no trailing commas, 120-col width) in sync. Both use the
`recommended` lint preset; only the root config turns a few rules off, for
`src/`'s patterns.

## Constraints

- **No app-source changes for the suite's own benefit** — no test-only hooks,
  ids or attributes were ever added to `src/` to make something testable, and
  the suite runs unmodified against a vanilla checkout apart from the
  `@needs-fix-for-*` tests described below, which need a genuine behavioural fix
  (not a test affordance) that older builds lack. Where semantic locators (`getByRole`/`getByText`) fall short, only
  four non-semantic hooks are used: `.recharts-wrapper`, `ul.nav ul.nav`,
  `div.btn`, and `Tooltipped.tsx`'s `data-tooltip` attribute. No generated /
  hashed class names.
- **Exact-pinned deps, no retries** — a characterization suite is for signal;
  a silent dependency bump or a retry-hidden flake both defeat the purpose.
  `@biomejs/biome` is pinned the same way.
- Every spec must pass unmodified on both `master` and `main` (which carries
  the filter checkboxes, merged in from `add-filters-for-large-result-files`)
  — it characterizes *shared* behaviour, not branch-only UI. Two deliberate
  exceptions, both tagged and both switchable from the environment (see Flags
  and tags above). First, `@filters`-tagged tests characterize the filter
  checkboxes that only exist on `main`. They run by default, so plain
  `npm test` passes unmodified against a `main` build; testing against an
  older, pre-filters `master` build needs `INCLUDE_FILTERS=0`. `@no-filters` is
  this exception's mirror image, a falsification check that only holds against
  a build without filters.
- Second, `@needs-fix-for-*` cuts the other way: those tests describe
  behaviour only a build carrying `main`'s `src/` fix has, so they run by
  default and get excluded with the matching `HAS_FIX_FOR_*=0` when testing an
  older build. A `master` build needs all the switches:
  `INCLUDE_FILTERS=0 HAS_FIX_FOR_SINGLE_METHOD=0 HAS_FIX_FOR_SUMMARY_RUN_NAMES=0`.
  Where a fix changes behaviour rather than fixing a bug, the old behaviour's
  tests are tagged `@must-not-have-fix-for-*` and run only against builds
  without it.
