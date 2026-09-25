# jmh-visualizer — notes for Claude

## Commands

- Dev server: `npm start` (webpack-dev-server on localhost, opens the
  browser; serves from memory, not `build/`, and reloads the page on changes,
  hot-swapping CSS without a reload)
- Build (dev): `npm run build` (webpack --mode development)
- Watch: `npm run watch` (rebuilds `build/` only; since `bundle.js` has no
  content hash, a plain browser reload may show a cached copy)
- Release build: `npm run release-build`
- Lint: `npm run lint` (Biome — formatting + lint, no writes)
- Format: `npm run format` (same checks as `lint`, but applies formatting,
  import sorting and safe lint fixes; keep its path list in sync with `lint`)
- Test: `npm run test` (mocha 12, via `@babel/register`)
- `npm run check` = lint + test; `npm run release` = check + release-build

Webpack is on 5.x — no `NODE_OPTIONS=--openssl-legacy-provider` needed
anymore (that was a webpack-4-with-modern-OpenSSL workaround; webpack 5's
default hasher doesn't touch Node's crypto module).

`e2e/` is a separate, isolated Playwright/TS black-box test suite (own
`package.json`/`node_modules`, own `biome.json`) — see `e2e/CLAUDE.md`. The
root Biome config (`biome.json`) deliberately only targets `src`, `test` and
`webpack.config.js` (not a bare `.`) — Biome 2.x treats `e2e/biome.json` as a
conflicting nested root config otherwise, and there's no reason to run the
root linter over e2e's independently-versioned Biome setup anyway.

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

- `recharts` is on 2.x (`^2.15.4`), a deliberate stop short of 3.x — the
  modernization plan (`plans/2026-09-21-MODERNIZATION-PLAN.md`, Step 2.f)
  treats 3.x as a second breaking rewrite, out of scope for now. The old
  1.8.5/1.8.6 landmine (a webpack `resolve.modules` absolute path couldn't
  reach `recharts/node_modules/core-js@3`) no longer applies: that override
  was changed to a bare `'node_modules'` string as part of the webpack 5
  bump, restoring webpack's normal nested-lookup resolution.
- `d3-scale-chromatic` is on 3.x — its ESM-only packaging (previously
  blocked under webpack 4/Babel 6) resolves cleanly now that both are
  modernized.
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
