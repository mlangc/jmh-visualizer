# Modernization plan

Goal: modernize the stack and dependencies to their latest versions, apply
Biome across the whole codebase (already used in `../e2e`), and migrate
everything to TypeScript — without a visual/behavioral regression slipping
through unnoticed. The e2e suite is built specifically to survive a
React/recharts major bump. It reduces, but doesn't eliminate, the need for
manual verification — especially for anything visual, which is exactly what
e2e structurally can't pin.

**Status:** `add-fixture-tests` and `add-filters-for-large-result-files` are
both merged into `main`. The migration itself happens in its own feature
branch/worktree off `main`. Merging back into `main` is planned once Step 3
and the final checkpoint are done. Progress: Step 1 and 2.a–2.g are done and
Checkpoint 1 is signed off; next up is 2.h.

## Ground rules

- **Every commit passes `npm run check` (biome/lint + mocha), the full `e2e`
  suite, and `npm run release-build`** (not just the dev build — that's what
  actually ships), not just checkpoint commits. This is what makes "walk back
  in git to find the culprit" actually work if a checkpoint turns up a
  problem — every intermediate commit has to be a runnable, bisectable state,
  not just the checkpoints.
- **Every commit message contains a terse summary in its title, and a reference
  to this plan in its body.** Don't add anything else to the body.
- **Checkpoints gate manual verification, not commit granularity.** Commits
  inside Step 2 can be as fine-grained as makes sense; only the checkpoints
  below cost manual review time, by design, so commit count doesn't drive
  that cost up.
- **Item order within a checkpoint-bounded segment is the implementer's
  call.** The `2.a`–`2.k` lettering (and Step 1's bullets) is a checklist,
  not a required sequence — reorder freely to route around friction (a stuck
  peer-dependency install, an awkward merge), as long as each checkpoint
  still gates what it's meant to gate. One real exception, not a preference:
  `2.i` and `2.j` both declare a hard `react >= 18` peer requirement, so they
  can't move ahead of `2.h`.
- **No unrelated cleanup — except docs a step makes stale.** Behavior stays
  identical except where a step explicitly says otherwise (e.g. the recharts/
  react-bootstrap swap). But updating a doc that describes exactly what a
  step just changed (root `../CLAUDE.md`'s toolchain notes, the `Dockerfile`'s
  `NODE_OPTIONS` line, …) is finishing that step, not scope creep.
- **Peer-dependency conflicts during Step 2 are expected and transient.**
  Bumping React while `react-waterfall`/`react-toggle` still declare an
  older peer range will need `--legacy-peer-deps` or a targeted `overrides`
  entry mid-step — that's fine, but nothing should still need one by
  Checkpoint 2.

## E2E adaptation policy

If a dependency bump forces an e2e test to change to stay green:

- **Superficial and backwards-compatible** (e.g. a locator needs to change
  because a DOM/class shape changed, but the same assertion still holds):
  make the change without stopping to ask, but only after **verifying** it —
  build a `git worktree` of the commit *before* the change and run the
  modified spec against it via `APP_BUILD_DIR`, the same mechanism the suite
  already documents for cross-branch checks. If it passes there too, it's
  confirmed backwards-compatible. Be transparent about the change in the
  summary, and flag it explicitly for the next Opus review (see below) to
  double-check whether a better fix existed.
- **Anything else** — the test would need to assert genuinely different
  behavior, or confirming "backwards-compatible" would require a judgment
  call about whether the behavior is *really* the same: **stop before
  reaching the checkpoint** and discuss how to move forward, rather than
  deciding unilaterally.

## Mocha adaptation policy

`../test` covers dependency-free utility/model code (`parse.js`, `util.js`,
`BenchmarkBundle.js`) — nothing there touches React, recharts, react-bootstrap,
or any other library on the upgrade list. Different treatment than e2e:

- **Step 1:** touching `../test` is expected here — Biome reformatting the
  whole codebase, and the mocha-runner fix (dropping `--compilers`, bumping
  off 5.x) may need matching tweaks to how test files are wired up to run.
  In scope by definition, same as Step 3's TS conversion below: fine as long
  as it doesn't change what a test actually asserts, just how it's run.
- **Step 2:** no mocha test should need to change at all — none of these
  dependency bumps touch what `../test` exercises. If one does, that's
  surprising rather than routine — treat it like the "anything else" e2e
  case (stop and discuss) rather than reaching for a backwards-compatible
  fast path. The `APP_BUILD_DIR`-worktree verification doesn't apply here
  anyway (mocha runs against source directly, not a built bundle).
- **Step 3:** converting `../test` to TypeScript alongside the source it covers
  is in scope for that step by definition, not an exception to this policy —
  annotating types and adjusting a fixture's shape to satisfy the compiler is
  just doing the migration. Flag it for review only if a tweak changes what's
  actually being asserted, not just how it's typed.

## Review discipline

Before each checkpoint, an Opus review runs per `../CLAUDE.md`'s "Agentic
Reviews — By Subagents" protocol:

- Fresh subagent (not a fork) — an independent pair of eyes, not one that
  inherited the implementer's context.
- Scoped to the diff since the previous checkpoint (or the start of the plan,
  for the first one). Edits to this plan itself are not under review; the
  plan is the brief to review against.
- Briefed with what the step was trying to do, pointing it to this plan as the
  authoritative source of truth.
- Explicitly handed any e2e/mocha test changes made in that span, with a
  direct instruction to double-check whether a better, non-test-modifying fix
  existed.
- Works in its own temporary worktree off the implementer's branch if it
  wants to experiment or confirm something; never modifies the implementer's
  worktree; reports findings rather than fixing them itself.
- Findings get addressed in a **separate commit**, before the branch is
  handed over for manual review.

Three checkpoints in total, detailed under each step below.

---

## Step 1 — Biome + toolchain

- Apply Biome to the entire codebase (not just `../e2e`) and fix everything it
  flags — including replacing the `// eslint-disable-line no-undef` comments
  in `store.js`/`DefaultTopBar.jsx` (for the `settings.js`/`provided.js`
  globals, still plain `<script>`-loaded, not real imports) with Biome's own
  equivalent.
- Fix the mocha `test` script: drop the deprecated `--compilers` flag and
  bump mocha off 5.x — this also clears the nested `minimatch`/`minimist`
  copies pinned under mocha's own `node_modules` (Dependabot #47/#48; they
  aren't a blocker, bumping mocha removes them).
- Babel 6 → Babel 7 (or swap to an esbuild/swc-based loader) — this is also
  what unblocks TypeScript support later, so it belongs here rather than
  being deferred. Not entirely dependency-free: `core-js` sits in
  `dependencies` (not dev), backing `babel-plugin-transform-runtime`, and
  Babel 7's equivalent needs core-js 3 plus an explicit browserslist/targets
  decision (there's none today).
- Webpack 4 → 5 (chosen over Vite as the more conservative option — the
  existing config/loader setup carries over, vs. a rewrite for Vite). Resolves
  Dependabot #45 (css-loader/html-webpack-plugin needing webpack 5).
  `resolve.modules` has two entries in `../webpack.config.js` — keep the first
  (`JAVASCRIPT_DIR`, the app's own import root that every bare
  `from 'store/store.js'`-style import in `src/` depends on); re-check
  whether the second (the absolute `./node_modules` path, the actual
  recharts/`core-js` workaround documented in `../CLAUDE.md`) is still needed.
  On the OpenSSL flag: webpack 5's default `md4` hasher is its own bundled,
  non-crypto implementation (confirmed in webpack's source — it never calls
  `crypto.createHash`), so `NODE_OPTIONS=--openssl-legacy-provider` drops
  once the upgrade lands, no config change required; `output.hashFunction:
  'xxhash64'` is a speed optimization on top of that, not the fix. Also
  update the `Dockerfile`, which hardcodes that same flag plus a Node 18
  base image.
- Retire ESLint once Biome covers `../src` — remove eslint and its plugins from
  `package.json`, update `lint`/`check` scripts.

## Step 2 — Modernize & upgrade

Small, low-risk items first; the two highest-risk items isolated in their own
commits; React + state layer last (so a regression there is unambiguous,
not tangled up with an old library that predates it). Not every dependency
gets its own item — `@appigram/react-rangeslider`, `react-spinkit`,
`prop-types`, `chai`, and `core-js` aren't called out below; give them a
compatible bump wherever they're touched incidentally, but they don't need a
dedicated commit unless one turns out to be load-bearing somewhere.

- **2.a** Drop the unused `react-tooltip` and `react-overlays` dependencies —
  both confirmed dead: `Tooltipped.jsx` is a home-grown `data-tooltip`
  wrapper, not the `react-tooltip` package, and `AutoAffix` is already gone
  from `SplitPane.jsx` on `main` (the sticky positioning itself lives in
  `../src/css/sidenavi.css`, not inline).
- **2.b** `react-icons` 2.x → latest (import paths changed across majors —
  ~7 files).
- **2.c** `react-toggle` — already resolves to its latest published version
  (`4.1.3`); check whether a newer one exists before assuming there's a bump
  to make. Its peer range caps at `react < 19`, so 2.h replaces it.
- **2.d** `react-scroll` bump (`TocElement`/`TocLink`/`TocList`) — also
  already at latest (`1.9.3`) as of this writing; same caveat as 2.c.
- **2.e** `d3-scale-chromatic` bump (now unblocked — Dependabot #42's
  ESM-only concern was tied to webpack 4, resolved by Step 1).
- **2.f** recharts 1.x → 2.x (not the actual latest, 3.x — 2.x is the
  deliberate target since 3.x is a second breaking rewrite; revisit as an
  open item if going all the way to latest matters). Isolated alone — the
  single highest-risk commit in the plan, a breaking rewrite touching 11
  files, including the custom `content`-prop tooltips and `LabelList`
  animation behavior.
- **2.g** react-bootstrap 0.32 / Bootstrap 3 → a modern equivalent (or a
  replacement library). Wider than the 21 files importing `react-bootstrap`
  itself: `entry.jsx` also imports the raw `bootstrap` npm package's CSS
  directly, and a couple of components hand-write Bootstrap 3 classes
  outside any react-bootstrap component (`UploadSideBar.jsx`'s
  `btn btn-default`, `TocList.jsx`'s bare `nav` — both of which e2e also
  uses as locators). Check `../src/css/sidenavi.css` too: it's hand-written
  against Bootstrap 3's `.nav` markup specifically. `SplitPane.jsx`'s
  `<Col xs={14} md={10}>` also uses a column count outside Bootstrap 3's own
  12-column grid — worth understanding before porting it.

  **→ Checkpoint 1** (+ Opus review). Manual verification here specifically
  targets chart rendering (bar shapes/colors/tooltips) and Bootstrap-based
  layout/styling — the two things e2e structurally can't fully pin.

  **Signed off** on 2026-09-25 at `abd12f0`.

- **2.h** React 16 → 19 + `react-dom` (`ReactDOM.render` → `createRoot`).
  React 18 is effectively unmaintained (last release 18.3.1, April 2024).
  `react-toggle` caps its peer range at `react < 19`, so first, in its own
  commit, replace it with react-bootstrap's `<Form.Check type="switch">`
  (its only use is the "Sync Axis Scales" toggle in `SingleRunView.jsx`). The
  switch looks different from `react-toggle`; that's accepted. No StrictMode:
  it would flag the three `UNSAFE_componentWillReceiveProps` in
  `Single`/`Two`/`MultiRunBundle.jsx`, and rewriting those is out of scope.
- **2.i** `react-dropzone` 3.x → latest. Placed after 2.h deliberately: the
  latest release requires `react >= 18`. Not a children-render-prop rewrite
  (this app never used that API) — the real changes are `activeStyle`/
  `rejectStyle` going away in favor of `isDragActive`-driven styling, and
  `accept` moving from a file-extension string to a MIME-type object.
- **2.j** Replace `react-waterfall` with [Zustand](https://github.com/pmndrs/zustand)
  in `store.js` — actively maintained (unlike `react-waterfall`, last
  published in 2019), and its plain-function actions match how this app
  already calls `actions.xxx` directly, including outside `connect`ed
  components. Also placed after 2.h deliberately: Zustand's peer range
  requires `react >= 18` too. Keep `store.js`'s exported surface
  (`Provider`/`connect`/`actions`, plus a few standalone helpers like
  `methodKey`) stable so the swap stays contained there and the 18 consuming
  files don't need to change — the specific approach (e.g. how `connect` and
  `Provider` get reimplemented on top of Zustand) is an implementation
  decision, not fixed by this plan. One real constraint worth stating rather
  than leaving to be discovered as a crash: every `connect(...)` call in this
  app returns a freshly-allocated object (some, like `RunScreen.jsx`, even
  construct a new `BenchmarkSelection` inside the selector) — `react-waterfall`
  tolerates that, but Zustand's `useSyncExternalStore`-based subscriptions
  compare snapshots with `Object.is` and can loop or warn if a selector never
  returns a stable reference. Whatever the chosen approach needs to account
  for that (memoizing, `useShallow`, restructuring the selectors —
  implementer's call).
- **2.k** `history` 4 → 5. The `listen` callback signature changed from
  `(location, action)` to a single object, and `goBack`/`goForward` were
  removed in favor of `back`/`forward` — `store.js` uses both (the POP
  handler and the in-app "Back.." link), so both need updating. Worth its
  own commit: this directly touches the Back/Forward behavior
  `detail-screen.spec.ts` already pins.

  **→ Checkpoint 2** (+ Opus review of `abd12f0..HEAD`, end of Step 2). Confirms the React
  major + store swap didn't change any state-transition or timing behavior
  (e.g. the documented ~540ms label-animation race) before Step 3 starts
  from a clean, human-confirmed base — deliberately not folded into Step 3,
  so a fix here stays in plain JS with nothing downstream depending on it yet.
  Manual verification also covers the new "Sync Axis Scales" switch.

## Step 3 — TypeScript migration

- Convert the codebase to TypeScript — renames, type annotations, and
  whatever the toolchain needs (a TS-aware loader, a `tsconfig.json` with a
  `paths`/`baseUrl` equivalent for the `resolve.modules` import style, and
  updating every import's explicit `.js`/`.jsx` extension). Not literally
  zero dependency changes, but no *behavior* changes — mechanical by intent.
  Done last so types are written against already-modern, properly-typed
  dependencies (recharts 2.x and a modern react-bootstrap both ship real
  types) instead of against libraries about to be replaced.
  `settings.js`/`provided.js` stay plain untyped globals (loaded via
  `<script>` tags, meant to be user-editable post-build per their own
  comments) — they need ambient `.d.ts` declarations, not conversion.
  Strictness level, whether `prop-types` gets dropped in favor of the new
  types, and whether the three generated `exampleBenchmark*.js` data files
  are worth converting at all are implementation calls, not fixed here.

  **→ Checkpoint 3 (final)** — the most important one, since it's the
  shipping candidate. Two Opus review rounds instead of one:
  1. Scoped only to the Step 3 diff (TS migration alone) — checks the
     mechanical conversion didn't slip in a behavior change, without the
     noise of the rest of the branch.
  2. Scoped to the entire modernization, Steps 1 through 3 against `main` —
     a holistic pass over the whole branch before merge, since this is the
     first and only point anyone looks at it as one cumulative change rather
     than step by step.

  Followed by the maintainer's own close look at the code before considering
  it done.

---

## Open items

Resolved:

- react-bootstrap: bumped to 2.x (Bootstrap 5), not swapped (2.g).
- React: 19, replacing `react-toggle`, without StrictMode (see 2.h).
- Root Biome config: standalone, targeting only `src`, `test` and
  `webpack.config.js`; `../e2e` keeps its own (see `../CLAUDE.md`).

Out of scope for this plan, possible later:

- StrictMode, after rewriting the three `UNSAFE_componentWillReceiveProps`.
