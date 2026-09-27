# recharts 3.x migration plan

Goal: move `recharts` from 2.x (`^2.15.4`, whose last release was 2.15.4 in 2025-06) to the current 3.10.x line, without
a visual or behavioral regression slipping through unnoticed. This is the follow-up the modernization plan
(`2026-09-21-MODERNIZATION-PLAN.md`, Step 2.f) deliberately deferred.

This plan stays high-level on purpose: it names the gates to pass and the one known pitfall, not the concrete code
changes. Those are the implementer's call.

The migration happens in its own feature branch/worktree off `main`. Merging it back into `main` is left to the
maintainer; the implementer doesn't merge.

**Status:** not started. The implementer keeps this line current, including when it hands over for the maintainer's
comparison.

## Ground rules

- **Every commit passes `npm run check`, the full `e2e` suite, and `npm run release-build`**, so every intermediate
  commit is a bisectable state.
- **Every commit message has a terse summary as its title and a reference to this plan as its body.** Nothing else goes
  into the body.
- **No unrelated cleanup, except docs the migration makes stale.** Behavior stays identical unless this plan says
  otherwise. Looks need not be pixel-identical: fix regressions (missing or misplaced labels, broken legends or
  tooltips, clipping), but don't fight recharts 3's own styling changes; list them for the maintainer instead. Updating
  the root `../CLAUDE.md` ("Known dependency debt"), `../e2e/CLAUDE.md` and any e2e comments that name a recharts
  version is part of finishing the job.
- **E2E and mocha adaptation policies:** same as in the modernization plan. Superficial, verified-backwards-compatible
  e2e locator changes are fine and get flagged for review; anything that would assert different behavior stops the work
  for a discussion first. No mocha test should need to change.

## References

- The official [3.0 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide).
- The release notes of every 3.x minor up to the target version. The guide only covers 3.0, so later breaking or visible
  changes must be checked there.

## Non-obvious pitfall

`SummaryHistogramChart` hands `Legend` an explicit `payload`, which 3.x no longer accepts. It exists so that series
toggled off (and thus not rendered as `<Bar>`s) keep their legend entry and can be toggled back on. Whatever replaces it
must preserve that.

## Decisions

- **Target version is 3.10.1**, the latest 3.x release (2026-07-25).
- **`accessibilityLayer` stays on** (the 3.x default), an accepted exception to "behavior stays identical". If it causes
  headaches along the way (e.g. visible differences for mouse users, or e2e changes), switch it off with
  `accessibilityLayer={false}` and flag that for review.

## Steps

1. **Bump and make it build.** Upgrade `recharts` to 3.10.1 and fix whatever `npm run typecheck` and the build flag.
   Keep this commit as small as possible: the smallest change that makes everything compile and stay green, so any
   regression later is easy to pin down.
2. **Fix behavior and looks.** Work through the guide and release notes until the charts behave like they did on 2.x,
   and their looks have no regressions. Commit granularity is the implementer's call.
3. **Docs.** Update the root `../CLAUDE.md`, `../e2e/CLAUDE.md` and stale recharts-version comments in e2e.

**→ Checkpoint (final)**, before merging into `main`:

- An Opus review per `../CLAUDE.md`'s "Agentic Reviews — By Subagents" protocol, scoped to the whole branch against
  `main`, with this plan as the brief. It is explicitly handed any e2e changes, with an instruction to check whether a
  fix without a test change existed. Findings are addressed in a separate commit.
- The maintainer's own side-by-side comparison against a 2.x build (e.g. a `git worktree` of `main`). To prepare it, the
  implementer lists every area where the migration visibly changed the charts in `tmp/recharts-3-visual-changes.md` in
  its worktree (the root `.gitignore` already ignores `/tmp/`, so it stays untracked). One bullet per area to
  scrutinize, each saying where to look (screen, chart, and the example data or gist that shows it), what changed
  compared to 2.x, and whether it is a recharts 3 default or a change the implementer made. Every bullet starts as `⬜`
  (open); the maintainer flips it to `✅` once reviewed. Findings that need a change go back to the implementer, who
  addresses them in separate commits.
