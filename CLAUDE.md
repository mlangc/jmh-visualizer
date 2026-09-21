# jmh-visualizer — notes for Claude

## Commands

- Build (dev): `npm run build` (webpack --mode development)
- Watch: `npm run watch`
- Release build: `npm run release-build`
- Lint: `npm run lint`
- Test: `npm run test` (mocha 5.2.0, uses the deprecated `--compilers` flag —
  don't bump mocha without also fixing this, see below)
- `npm run check` = lint + test; `npm run release` = check + release-build

All webpack scripts (`build`/`watch`/`release-build`) need
`NODE_OPTIONS=--openssl-legacy-provider` set when you invoke them — it's
*not* baked into the npm scripts themselves — because this is webpack 4 +
Node's newer OpenSSL. Without it, `npm run build` fails with
`ERR_OSSL_EVP_UNSUPPORTED`. e.g. `NODE_OPTIONS=--openssl-legacy-provider npm
run build`.

`e2e/` is a separate, isolated Playwright/TS black-box test suite (own
`package.json`/`node_modules`) — see `e2e/CLAUDE.md`. It's excluded in the
root `.eslintignore`: ESLint 4 doesn't ignore nested `node_modules` the way
newer versions do, so without that exclusion `npm run lint` (and `check`/
`release`) crashes trying to resolve `.eslintrc` files inside `e2e`'s own
dependency tree.

## Commit message style

The maintainer's own commits are almost always a single-line subject with no
body — e.g. `Release 0.9.6`, `Quick hack for heterogenous test setups of a
class`, `Fix multi file gists`, `#35 Stabelize gist order`. The multi-line
ones in the log are squash-merged PRs or dependabot's auto-generated
messages, not commits the maintainer wrote by hand. Match this: keep the
subject terse and skip any descriptive body/bullet list. This is about the
message content only — Claude Code's own attribution trailer
(`Co-Authored-By:` / `Claude-Session:`), when the session's settings call for
it, still gets appended mechanically and doesn't count as "body prose."

One narrow exception: when working from a tracked implementation plan (e.g.
`plans/*.md`), the body may contain a bare reference to that plan and
nothing else — no descriptive prose, no bullet list. A plan may state this
requirement itself (see its own Ground rules); absent that, still keep
bodies empty by default.

## Architecture quick map

- State: `src/javascript/store/store.js`, a `react-waterfall` store (single
  global store + actions, not Redux). Key state: `benchmarkRuns`,
  `selectedMetric`, `focusedBundles` (class-level solo/isolate filter, toggled
  by the sidebar eye icon), `deselectedMethods` (method-level hide filter,
  added for the nested checkbox feature — exclusion-style: empty = show all).
- Models: `BenchmarkBundle` (one per benchmark class) holds
  `benchmarkMethods: BenchmarkMethod[]` and `methodNames` (unique names;
  a method can repeat across params). `BenchmarkMethod` is one JMH method
  (possibly parameterized).
- Sidebar tree: `RunSideBar.jsx` → `TocList.jsx` → `TocLink.jsx` (react-scroll
  `ScrollLink`). `TocList` takes `linkControlsCreators` (inline icon controls
  per row) and `subListCreator` (renders a nested `<ul>` under a row — used
  for the per-method checkboxes). Any click handler on something nested
  inside a `TocLink` must call `e.stopPropagation()` or it'll trigger the
  link's scroll-to-section behavior.
- Chart rendering fans out from `RunScreen.jsx` into `SingleRunView` /
  `TwoRunsView` / `MultiRunView` depending on run count. `RunScreen.jsx` is
  where bundle/method filtering happens — filtered bundles get passed to the
  chart views, but the *unfiltered* bundles go to the sidebar so toggles stay
  visible/reversible.
- **Gotcha**: chart code (e.g. `BarDataSet.js`) assumes every bundle passed
  to it has at least one method (`benchmarkMethods[0]` is accessed
  unconditionally). There's no error boundary, so a bundle with zero methods
  reaching the chart views crashes to a blank page. Any future filtering
  feature must drop empty bundles before they reach `SingleRunView` /
  `TwoRunsView` / `MultiRunView`.

## Known dependency landmines

- `recharts` 1.8.5 → 1.8.6 (patch bump, looks safe) breaks the build: 1.8.6
  bumps its internal `core-js` dependency to `^3.4.2`, but this project's
  `webpack.config.js` overrides `resolve.modules` to an absolute path at the
  top-level `node_modules` only, so webpack can't resolve the nested
  `recharts/node_modules/core-js@3`. Stay pinned at `^1.3.1` (currently
  resolving to 1.8.5) until this is deliberately fixed. **Hit for real once**
  already: a "version bumps" commit on a feature branch drifted the
  *lockfile* resolution to 1.8.6 without touching the declared range, so
  `npm ci` silently reproduced the exact webpack failure above. Fixed there
  with a lockfile-only commit pinning the resolution back to 1.8.5. If a
  `package-lock.json` update ever bumps `recharts` past 1.8.5, re-pin it the
  same way.
- Open Dependabot PRs needing real migration work, not just a version bump:
  - #47/#48 — mocha 5→10: hard-pinned nested `minimatch`/`minimist` copies,
    plus mocha 6+ dropped `--compilers` (used in the `test` npm script).
  - #45 — css-loader/html-webpack-plugin bumps require webpack 5; project is
    still on webpack 4.
  - #42 — `d3-scale-chromatic` 3.x is ESM-only (risky under webpack4/Babel6);
    `recharts` 2.x is a breaking rewrite.
- Several other minor/patch Dependabot bumps have already been applied
  safely (via `npm update` / `npm install --no-save`, within their existing
  `package.json` ranges), each verified with a real build.

## General notes

- Don't reference files that are deliberately untracked (via `.gitignore` or
  `.git/info/exclude`) from files that are checked into git — it'll puzzle
  whoever checks out the project anew.
- Let the code speak for itself, and only add comments where they clearly add
  value. A comment is no excuse for bad code. Try to make the code readable
  first.

## Agentic Reviews

### By Subagents

When I ask you to let a subagent review your work, please consider this:
- Use Opus as a reviewer, in a fresh subagent — not a fork, since a fork
  inherits your full context and always runs on your own model, which
  defeats the point of an independent pair of eyes.
- Tell the subagent what you were tasked to do.
- Where I gave you a specific instruction, constraint, or correction that
  shapes what the review should check, quote my own words directly rather
  than only your paraphrase of them — a paraphrase can silently carry your
  own misreading forward, and the reviewer has no way to catch that if it
  only ever sees your restatement. Don't dump the whole conversation on it
  though; a fresh pair of eyes is the point.
- The reviewer must not modify the implementer's worktree, and is expected
  to report findings back rather than fix anything itself. It's encouraged
  to create its own temporary worktree off the implementer's branch to
  experiment, confirm suspicions, or verify proposed fixes.

### By You

If I ask you to review something directly, don't change anything in the
worktree — just report your findings. Base them on evidence rather than
speculation: as with the subagent reviewer above, you're encouraged to create
your own temporary worktree to experiment in and confirm your suspicions.
