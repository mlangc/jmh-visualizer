# jmh-visualizer — notes for Claude

A browser-only React app that visualizes JMH benchmark results. `e2e/` (a
Playwright black-box suite) and `plans/` (implementation plans) have their own
`CLAUDE.md`.

## Commands

- `npm run check`: lint + typecheck + test. Run it before committing.
- `npm run lint`: Biome formatting + lint, no writes.
- `npm run format`: the same checks, but applies formatting, import sorting and
  safe lint fixes.
- `npm run format-unsafe`: like `format`, plus unsafe lint fixes. Run it on a
  clean tree.
- `npm run typecheck`: `tsc`, no emit. Babel strips the types for webpack and
  mocha, so only this catches type errors. `test/tsconfig.json` checks the
  mocha specs separately, keeping mocha's globals out of `src`.
- `npm run test`: mocha via `@babel/register`. To run a subset, use
  `npm run test -- --grep <pattern>`. Passing a spec path doesn't narrow the
  run, since mocha adds it to the `spec` glob of `.mocharc.json`.
- `npm start`: webpack-dev-server. It opens the browser, serves from memory
  (not from `build/`), reloads the page on changes and hot-swaps CSS.
- `npm run build`: development build into `build/`.
- `npm run watch`: rebuilds `build/` on changes. `bundle.js` has no content
  hash, so a plain browser reload may show a cached copy.
- `npm run release-build`: production build into `build/`.
- `npm run release`: `check` + `release-build`.
- `npm run build-and-check-all`: `check` + `build` + `e2e`'s own `check`, which
  serves `build/` and therefore needs the fresh build.

## Linting

- `lint`, `format` and `format-unsafe` each list the paths Biome runs on, and
  `biome.json` lists them again under `files.includes`: `src`, `test`,
  `webpack.config.js`, `version.js` and `tsconfig.json`. Keep all four lists in
  sync.
- Don't replace that list with a bare `.`: Biome 2.x would treat
  `e2e/biome.json` as a conflicting nested root config. `e2e/` is linted by its
  own, independently versioned Biome setup.

## Branches

- `main` is where development has taken place since the fork, and the target
  for PRs. GitHub's default branch is still `master`, so pass `--base main` to
  `gh pr create`.
- `master` is the legacy branch from before the fork (the `upstream` remote,
  `jzillmann/jmh-visualizer`). `main` descends from its tip, `50289e2`, and it
  isn't developed any further. It only serves as a baseline: the e2e suite is
  meant to pass against builds of both branches. Building it needs webpack 4
  and the OpenSSL legacy provider.

## Commit messages

- Write a single-line, terse subject and no body, e.g. `Release 0.9.6`,
  `Fix multi file gists`, `#35 Stabelize gist order`. No descriptive prose, no
  bullet list.
- The multi-line messages in the log are squash-merged PRs or dependabot's,
  not a style to copy.
- Claude Code's attribution trailer (`Co-Authored-By:`), when the session's
  settings call for it, still gets appended and doesn't count as a body.
- Exception: when working from a tracked plan (`plans/*.md`), the body may hold
  a bare reference to that plan and nothing else. Plans usually demand this in
  their own "Ground rules".

## Project history

Forked from the abandoned `jzillmann/jmh-visualizer`. The stack was then
modernized (React 19, TypeScript, Zustand, recharts 3, Biome) with the
deliberate goal of keeping behavior identical, see `plans/`.

- The remaining legacy patterns (class components with `this.state`,
  `UNSAFE_componentWillReceiveProps`) were left on purpose. Don't modernize
  them unprompted.
- New components should be function components.

## Code conventions

- TypeScript, `strict`. Imports are bare paths rooted at `src/app` with
  explicit `.ts`/`.tsx` extensions, e.g. `import ... from 'store/store.ts'`.
  Webpack's `resolve.modules`, `tsconfig.json`'s `paths` and mocha's
  `NODE_PATH` all resolve them, so a change to one needs the other two.
- Three kinds of files deliberately stay plain JS, typed by a sibling `.d.ts`:
  `src/settings.js` and `src/provided.js` (globals loaded via `<script>` tags,
  meant to be edited post-build) and the generated
  `src/app/exampleBenchmark*.js`.
- Let the code speak for itself, and only add comments where they clearly add
  value. A comment is no excuse for bad code. Try to make the code readable
  first.
- Don't reference files that are deliberately untracked (via `.gitignore` or
  `.git/info/exclude`) from files that are checked into git. It'll puzzle
  whoever checks out the project anew.

## Architecture quick map

- State: `src/app/store/store.ts`, a single global Zustand store with actions
  (not Redux). The filters in it:
  - `focusedBundles`: class-level solo/isolate filter, toggled by the
    sidebar's eye icon.
  - `deselectedMethods` and `deselectedParamValues`: method-level and
    param-value-level hide filters behind the sidebar's nested checkboxes.
    Both are exclusion-style: empty means show all.
- Models: `BenchmarkBundle` (one per benchmark class) holds
  `benchmarkMethods: BenchmarkMethod[]` and `methodNames`. A `BenchmarkMethod`
  is one JMH method with one set of param values, so a parameterized method
  appears several times in `benchmarkMethods` but once in `methodNames`.
- Sidebar tree: `RunSideBar.tsx` → `TocList.tsx` → `TocLink.tsx` (react-scroll
  `ScrollLink`). `TocList` takes `linkControlsCreators` (inline icon controls
  per row) and `subListCreator` (renders a nested `<ul>` under a row, used for
  the method and param checkboxes).
- Charts: `RunScreen.tsx` fans out into `SingleRunView`, `TwoRunsView` or
  `MultiRunView`, depending on the number of selected runs.
- Filtering happens in `RunScreen.tsx`. The chart views get the bundles after
  all filters. The sidebar gets them after the metric filter only, before the
  focus, method and param filters, so that its toggles stay visible and
  reversible.

## Gotchas

- A click handler on anything nested inside a `TocLink` must call
  `e.stopPropagation()`, or the click also triggers the link's
  scroll-to-section behavior.
- Never let a bundle without methods reach the chart views. Chart code (e.g.
  `BarDataSet.ts`) accesses `benchmarkMethods[0]` unconditionally and there's
  no error boundary, so an empty bundle crashes the app to a blank page.
  `filterBenchmarkBundle` returns `null` for such a bundle and `RunScreen.tsx`
  drops it. Any new filter must do the same.
- recharts 3 stacks a chart's `<Legend>` and `<Tooltip>` overlays in JSX
  order. Put the `<Tooltip>` after the `<Legend>`, so that it's drawn on top.
- recharts 3 sorts legend and tooltip entries by default (by name or value).
  Wherever chart order matters, pass an explicit `itemSorter`.
- A chart inside a `ResponsiveContainer` takes the container's size over its
  own `width`/`height`, and so do charts nested in its tooltip. That's why
  `BarChartView`, whose tooltip holds the "Raw Data" charts, uses the chart's
  own `responsive` prop instead.

## Known dependency debt

All of these still work in recharts 3.x, but avoid them in new code.

- `Cell` (deprecated in 3.7, to be removed in 4.0) is superseded by each
  graphical element's `shape` prop. Still used by `DiffBarChartView`,
  `SummaryChangeChart` and `SummaryHistogramChart`.
- `ResponsiveContainer` is only promised to keep working for the life of 3.x.
  Its successor is the charts' own `responsive` prop (3.3). Still used by every
  chart but `BarChartView` and the charts in its tooltip.
- `Legend`'s `align`/`verticalAlign` (deprecated in 3.10) are superseded by
  `position`. Still used by `DiffBarChartView` and `SummaryHistogramChart`.

## Agentic Reviews

### By Subagents

When I ask you to let a subagent review your work:

- Use Opus as the reviewer, in a fresh subagent. Don't use a fork: it inherits
  your full context and always runs on your own model, which defeats the point
  of an independent pair of eyes.
- Tell the subagent what you were tasked to do.
- Where I gave you a specific instruction, constraint or correction that
  shapes what the review should check, quote my own words directly instead of
  only paraphrasing them. A paraphrase can silently carry your own misreading
  forward, and the reviewer can't catch that if it only sees your restatement.
  Don't dump the whole conversation on it though.
- The reviewer must not modify the implementer's worktree. It reports its
  findings back and fixes nothing itself. It's encouraged to create its own
  temporary worktree off the implementer's branch to experiment, confirm
  suspicions or verify proposed fixes.

### By You

If I ask you to review something directly, don't change anything in the
worktree. Just report your findings, and base them on evidence, not on
speculation: like the subagent reviewer above, you're encouraged to create
your own temporary worktree to experiment in and confirm your suspicions.
