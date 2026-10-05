# Release Workflow Plan

Add a GitHub Actions workflow that creates a GitHub Release for every version
tag, with the result of `npm run providedZip` attached. Also make the UI show a
plain version only on tagged commits (see "Version display").

## Ground rules

- Work in a feature branch based on `main`. Merging it back into `main` is left
  to the maintainer, who also checks the version in the live footer after the
  first Pages deployment with this change.
- **Every commit message has a terse summary as its title and a reference to
  this plan as its body.** Nothing else goes into the body (see `CLAUDE.md`).

## Current state

- `.github/workflows/pages.yml` is the only workflow. It runs on pushes to
  `main` (plus `workflow_dispatch`): `npm ci`, `npm run release`, Pages deploy.
- `npm run providedZip` is
  `npm run release && cd build && zip -r ../jmh-visualizer.zip ./*`. It already
  includes lint, typecheck, tests and the production build, so the workflow
  needs no separate check step.
- README release flow: `npm version X -m "Release %s"`, then
  `git push --follow-tags`. Tags have no `v` prefix (`0.9.6`, see `.npmrc`).
  The tag goes up together with the commit on `main`: Pages deploys from the
  branch push, the new workflow triggers from the tag, and the two don't
  interfere.
- **Caveat:** the local clone has 25 old tags that `origin` lacks, and
  `git push --follow-tags` would push them all, so the workflow would silently
  never run. See "Prerequisite".
- `package.json` is already at `1.0.0` with no `1.0.0` tag, so the first
  `npm version 1.0.0 -m "Release %s"` fails with "Version not changed"; it needs
  `--allow-same-version` once.

## Design

New file `.github/workflows/release.yml`:

1. **Trigger:** `on: push: tags: ['[0-9]+.[0-9]+.[0-9]+']` (a glob matching the
   unprefixed semver tags). No `workflow_dispatch`: a release always
   corresponds to a tag.
2. **Permissions:** `contents: write`.
3. **Single job** on `ubuntu-latest`, same action versions as `pages.yml`
   (`checkout@v7`, `setup-node@v7`, node `lts/*`, npm cache):
   - Guard (first, as it needs only `node`): fail if `$GITHUB_REF_NAME` differs
     from `package.json`'s version (`node -p "require('./package.json').version"`).
     Catches a hand-pushed tag that skipped `npm version`.
   - `npm ci`
   - `npm run providedZip`. It re-runs the full check that `pages.yml` also
     runs, which is accepted: a release never ships unverified.
   - Version assertion: fail unless `node -p "require('./version').resolve()"`
     (the helper from "Version display") equals `$GITHUB_REF_NAME`, so a draft
     with a non-bare version (dirty tree, wrong tag picked by `git describe`)
     is never created. It runs after the build, so it sees the final tree.
   - `gh release create "$GITHUB_REF_NAME" jmh-visualizer.zip --title "$GITHUB_REF_NAME" --generate-notes --verify-tag --draft`
     with `GH_TOKEN: ${{ github.token }}`. The preinstalled `gh` CLI avoids a
     third-party action.

No concurrency block: every run belongs to its own tag.

Choices behind the last step:

- **Asset name:** `jmh-visualizer.zip`, without the version, exactly as the
  script produces it (no rename step).
- **Draft:** each release is created as a draft (visible only to repo writers)
  and published manually in the GitHub UI after checking the zip and notes.
- **Notes:** `--generate-notes` pre-fills the draft; edit them in the GitHub UI
  before publishing (e.g. paste in the "Major Changes" entry for major
  releases).

## Prerequisite (before the first real release)

GitHub creates no push events when more than three tags are pushed at once, so
push the old tags to `origin` once, on their own: `git push origin --tags`.
This must be a separate push from the release tag (it creates no push events
itself, being more than three tags). It doesn't recreate any old releases: a
tag-triggered workflow runs the workflow file from the tagged commit, and the
old tags point at commits that predate `release.yml`. Afterwards
`git push --follow-tags` only has the new tag to push, and the README flow
stays as it is.

## Version display

Today `webpack.config.js` injects `npm_package_version` as `process.env.version`
(shown in `Footer.tsx` and `DefaultTopBar.tsx`), so any build between two
releases claims the last bumped version. Instead, derive it from git at build
time, in a small helper. It lives in its own CommonJS module, `version.js` in
the repo root, exporting `resolve()`, so that `webpack.config.js`, the unit
test and `release.yml` (see "Design") all use the same code. Like
`webpack.config.js`, the module is added to the path lists of `lint`, `format`
and `format-unsafe` and to `biome.json`.

One call does it all: parse the output of
`git describe --tags --long --dirty --match '[0-9]*.[0-9]*.[0-9]*'`, which has
the form `<tag>-<count>-g<hash>[-dirty]` (drop the `g` prefix; the hash has
git's default abbreviation length). Then:

- **Count is 0 (HEAD is tagged) and the tree is clean:** the bare version, e.g.
  `1.0.0`.
- **Anything else:** `<nearest version tag>+dev.<count>.<hash>`, e.g.
  `0.9.6+dev.113.fae9867`, with a `.dirty` suffix if the tree is dirty, e.g.
  `1.0.0+dev.0.fae9867.dirty` (a modified tagged commit is not the release
  either). It is semver build metadata (after the `+`), so it never sorts before
  the tag it builds on, unlike a `-` prerelease suffix.
- **Dirty** means tracked files differ from `HEAD` (`git describe --dirty`
  ignores untracked files, so the ignored `build/` and zip don't count).
- **No usable git** (source tarball, no tags): fall back to
  `<package.json version>+dev`, so the build never fails over this.
- The `DefinePlugin` entry keeps the name `version`, so the two components and
  `env.d.ts` stay as they are.

CI consequences:

- `pages.yml` must check out with `fetch-depth: 0`. A default checkout is a
  depth-1 clone with no parents and no tags (tags only come along when the
  pushed ref is itself a tag, not for a push to `main`), so `git describe`
  would always fail and the fallback would show `+dev` even for a release
  commit. With full history, a release commit pushed with `--follow-tags`
  deploys as the bare version, anything else as `+dev.…`.
- No CI step may modify tracked files before the build (`npm ci` and the
  checks don't), or the deployed version would end in `dirty`.
- `release.yml` needs no extra fetch: a tag-triggered checkout has the tag, so
  the zip shows the bare version, which the version assertion enforces.

## Other changes

- **README:** in the "Release" section, note that after `git push --follow-tags`
  a draft GitHub Release with `jmh-visualizer.zip` is created automatically and
  has to be published manually after a quick check. If the version is still
  `1.0.0`, also document the one-time `--allow-same-version`.
- **.gitignore:** add `jmh-visualizer.zip` (the output of `npm run providedZip`,
  written to the repo root), next to the existing `build/` entry.

## Verification

- Version helper: unit-test the string logic (bare, past the tag, dirty,
  fallback, `-rc` tags and several tags). The spec is a `.spec.js` (mocha picks
  it up, and `tsc -p test` ignores it), so no `version.d.ts` or `allowJs` is
  needed for it. The parsing is separate from the `git` call, so the test needs
  no repository. Besides that, run the helper once on the branch (`+dev.…`) and
  once with the repository unavailable, e.g. `GIT_DIR=/nonexistent`
  (fallback).
- Lint the workflow YAML (e.g. `actionlint`, if available).
- End-to-end test with a throwaway tag. This plan never publishes a release;
  the draft is checked and then deleted, and the tag is removed again so the
  version stays free for the real release:
  1. On a throwaway local branch containing the new workflow, run
     `npm version <test version> -m "Release %s"` (the guard step compares the
     tag with `package.json`). Use a version that differs from the current
     one, e.g. `1.0.1`, since `npm version` refuses an unchanged version.
  2. Push only that tag, explicitly: `git push origin refs/tags/<tag>`. Not
     `--follow-tags`, which would push the 25 old tags and start no run. No
     branch is pushed: the workflow runs from the tagged commit, so it doesn't
     have to be on `main`, and Pages is not triggered.
  3. Check the Actions run (including the version assertion), the draft
     release, the generated notes and the asset: download it and check with
     `unzip -l` that `index.html` and the bundle are at the zip's root, not
     inside a `build/` folder.
  4. Clean up and confirm: `gh release delete <tag> --cleanup-tag --yes -R
     mlangc/jmh-visualizer` (the `-R` is needed because `gh` would otherwise
     resolve to the `upstream` remote; this deletes the draft first, then the
     remote tag, as deleting the tag first would leave an "untagged-..." draft).
     Then `git tag -d <tag>`, delete the local throwaway branch, and check that
     `gh release list -R mlangc/jmh-visualizer` and
     `git ls-remote --tags origin` no longer show the version. If gh can't find
     the draft, delete it in the GitHub UI and the tag with
     `git push origin --delete <tag>`.
  Never click "Publish" on the test draft. If the workflow has to be re-run,
  delete the draft first: `gh release create` fails if the release exists.

## Review

**→ Checkpoint (final)**, before merging into `main`: an Opus review per
`CLAUDE.md`'s "Agentic Reviews — By Subagents" protocol, scoped to the whole
branch against `main`, with this plan as the brief. The reviewer is also told:

- To check the version helper against each case in "Version display", and
  `pages.yml` and `release.yml` against the plan's CI consequences and "Design".
- Not to push tags or create releases: the throwaway-tag test in
  "Verification" is the implementer's.

Findings are addressed in a separate commit.
