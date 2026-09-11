# e2e — black-box characterization suite

Playwright + TypeScript, fully isolated from the app's own toolchain (own
`package.json`/`node_modules`/`tsconfig.json`). Never touches app source or
the app's Babel 6 / webpack 4 stack. See `../E2E_POC_PLAN.md` (untracked, see
`.git/info/exclude`) for the full design rationale.

## What this tests

Loads a real JMH result file into the built app and asserts the single-run
report renders completely — text, roles, presence of chart, via user-visible
DOM only. No interactions (no toggles/filters), no knowledge of React/webpack/
recharts. The point is to survive a stack migration: as long as this suite
stays green, the app's rendered behaviour hasn't regressed.

- `specs/smoke-randomize-rerun.spec.ts` — the one characterization test.
- `specs/harness.spec.ts` — tests the assertions back: they must reject on a
  blank page and on the three bundled examples (real JMH data the routine
  isn't written for). Proves the checks aren't vacuously green.
- `support/report-assertions.ts` — `expectCompleteSingleRunReport()`, the 13
  shared presence checks both specs above call.
- `support/jmh-app.ts` — page object; the only place that knows app-specific
  selectors (upload input, "Load … Example" links).
- `fixtures/randomize-rerun.json` — vendored JMH report used by the smoke spec.

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
