# Release Workflow Plan

Add a GitHub Actions workflow that creates a GitHub Release for every version
tag, with the result of `npm run providedZip` attached.

## Ground rules

- Commit messages: single terse subject, no body, except a bare reference to
  this plan if desired (see `CLAUDE.md`).

## Current state

- `.github/workflows/pages.yml` is the only workflow. It runs on pushes to
  `main` (plus `workflow_dispatch`): `npm ci`, `npm run release`, Pages deploy.
- `npm run providedZip` is
  `npm run release && cd build && zip -r ../jmh-visualizer.zip ./*`. It already
  includes lint, typecheck, tests and the production build, so the workflow
  needs no separate check step.
- README release flow: `npm version X -m "Release %s"`, then
  `git push --follow-tags`. Tags have no `v` prefix (`0.9.6`, see `.npmrc`).
- `--follow-tags` pushes the tag together with the commit on `main`. Pages still
  deploys from the branch push; the new workflow triggers from the tag. The two
  don't interfere.
- **Caveat:** GitHub creates no push events when more than three tags are
  pushed at once. `origin` (`mlangc/jmh-visualizer`) currently has no tags,
  while the local clone has 25 annotated ones (0.2.1 to 0.9.6), all of which
  `git push --follow-tags` would push along with the new one. The workflow
  would then silently never run. See "Prerequisite" below.
- `package.json` is already at `1.0.0` with no `1.0.0` tag, so the first
  `npm version 1.0.0 -m "Release %s"` fails with "Version not changed"; it needs
  `--allow-same-version` once.
- The clone has two remotes, `origin` (`mlangc`) and `upstream` (`jzillmann`),
  and no `gh` default repo, so `gh` resolves to `upstream`. The plan sets the
  default once (see Verification); this is stored in the clone's `.git/config`
  only, and `gh repo set-default --unset` reverts it.

## Design

New file `.github/workflows/release.yml`:

1. **Trigger:** `on: push: tags: ['[0-9]+.[0-9]+.[0-9]+']` (a glob matching the
   unprefixed semver tags). No `workflow_dispatch`: a release always
   corresponds to a tag.
2. **Permissions:** `contents: write`.
3. **Single job** on `ubuntu-latest`, same action versions as `pages.yml`
   (`checkout@v7`, `setup-node@v7`, node `lts/*`, npm cache):
   - `npm ci`
   - Guard: fail if `$GITHUB_REF_NAME` differs from `package.json`'s version
     (`node -p "require('./package.json').version"`). Catches a hand-pushed tag
     that skipped `npm version`.
   - `npm run providedZip`. It re-runs the full check that `pages.yml` also
     runs, which is accepted: a release never ships unverified.
   - `gh release create "$GITHUB_REF_NAME" jmh-visualizer.zip --title "$GITHUB_REF_NAME" --generate-notes --verify-tag --draft`
     with `GH_TOKEN: ${{ github.token }}`. The preinstalled `gh` CLI avoids a
     third-party action.
4. **Concurrency:** group `release-${{ github.ref }}`, no cancel-in-progress.

Choices behind the last step:

- **Asset name:** `jmh-visualizer.zip`, without the version, exactly as the
  script produces it (no rename step).
- **Draft:** `--draft` creates each release as a draft (visible only to repo
  writers), to be published manually in the GitHub UI after checking the zip
  and notes.
- **Notes:** `--generate-notes` pre-fills the draft; edit them by hand in the
  GitHub UI before publishing (e.g. paste in the "Major Changes" entry for
  major releases).

## Prerequisite (before the first real release)

Push the old tags to `origin` once, on their own: `git push origin --tags`.
This must be a separate push from the release tag (and, as it is more than
three tags, it creates no push events either way). It doesn't recreate any old
releases: a tag-triggered workflow runs the workflow file from the tagged
commit, and the old tags point at commits that predate `release.yml`, so no run
starts for them, whenever they are pushed. Afterwards `git push --follow-tags`
only has the new tag to push, and the README flow stays as it is.

## README

In the "Release" section, note that after `git push --follow-tags` a *draft*
GitHub Release with `jmh-visualizer.zip` is created automatically, and has to
be published manually after a quick check. If the version is still `1.0.0`,
also document the one-time `--allow-same-version`.

## .gitignore

Add `jmh-visualizer.zip` (the output of `npm run providedZip`, written to the
repo root), next to the existing `build/` entry.

## Verification

- One-time setup: `gh repo set-default mlangc/jmh-visualizer`, then confirm
  with `gh repo view --json nameWithOwner -q .nameWithOwner`. Note that this
  also changes the target of other `gh` commands in this clone, e.g.
  `gh pr create`.
- Remove any existing `jmh-visualizer.zip` (`zip -r` adds to an existing
  archive instead of replacing it), run `npm run providedZip` locally, and
  check with `unzip -l jmh-visualizer.zip` that `index.html` and the bundle are
  at the zip's root, not inside a `build/` folder.
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
     branch is pushed: the tag uploads its commit, and the workflow runs from
     the tagged commit, so it doesn't have to be on `main`. Pages is not
     triggered either way, as it only runs for `main`.
  3. Check the Actions run, the draft release, the generated notes and the
     asset (download it and check the zip layout as above). Also check that
     the guard step fails for a mismatching tag, if cheap to do (e.g. a second
     throwaway tag on the same commit; clean it up the same way).
  4. Clean up: `gh release delete <tag> --cleanup-tag
     --yes` (deletes the draft first, then the remote tag; deleting the tag
     first would leave an "untagged-..." draft). Then `git tag -d <tag>` and
     delete the local throwaway branch. If gh can't find the draft by tag,
     delete it by release id via `gh api -X DELETE
     repos/mlangc/jmh-visualizer/releases/<id>` or in the GitHub UI, and
     delete the tag with `git push origin --delete <tag>`.
  5. Confirm that `gh release list` and
     `git ls-remote --tags origin` no longer show the version.
  Never click "Publish" on the test draft. If the workflow has to be re-run,
  delete the draft first: `gh release create` fails if the release exists.
