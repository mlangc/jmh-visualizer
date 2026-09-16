/**
 * The 3 real gists (owned by mlangc) that are 1:1 in content with the local
 * fixtures under `fixtures/` -- used to drive "Load from URL(s)"/"Load from
 * Gist(s)" tests against mocked (never real) network responses. `rawUrl` is
 * the gist's actual raw-content URL (real gist ID + commit hash), reused
 * verbatim so that `getUniqueNames`'s prefix/suffix stripping (see
 * `mock-remote-fixtures.ts` and the specs that assert on multi-URL run
 * names) produces the same result it would against the real gists.
 *
 * Nothing in the suite re-verifies these against the live gists -- if one
 * were ever edited or deleted, these tests would stay green (they mock the
 * network) while this "1:1 in content" claim quietly went stale.
 */
export const GISTS = {
  costOfAllocRateNorm: {
    id: 'b75a453e93ab8cb1c0c7983d3a9fc778',
    filenameInGist: 'test-fixture-cost-of-alloc-rate-norm-benchmark.json',
    fixture: 'cost-of-alloc-rate-norm-benchmark.json',
    rawUrl:
      'https://gist.githubusercontent.com/mlangc/b75a453e93ab8cb1c0c7983d3a9fc778/raw/1d97ce84dba6192879197948eb2deb8cb61c6c83/test-fixture-cost-of-alloc-rate-norm-benchmark.json',
  },
  linkedHash: {
    id: '583ba9b1b1c9b239d7688480a936dd30',
    filenameInGist: 'test-fixture-linked-hash-first-vs-iter-next-benchmark.json',
    fixture: 'linked-hash-first-vs-iter-next-benchmark.json',
    rawUrl:
      'https://gist.githubusercontent.com/mlangc/583ba9b1b1c9b239d7688480a936dd30/raw/aa18756580a7d0cf899021dcae5022ba9620ec0e/test-fixture-linked-hash-first-vs-iter-next-benchmark.json',
  },
  linkedHashOnBattery: {
    id: '5d7a72f3cffcaddfa79373067a107037',
    filenameInGist: 'test-fixture-linked-hash-first-vs-iter-next-on-battery-benchmark.json',
    fixture: 'linked-hash-first-vs-iter-next-on-battery-benchmark.json',
    rawUrl:
      'https://gist.githubusercontent.com/mlangc/5d7a72f3cffcaddfa79373067a107037/raw/71f618f549c42026c18cf07f971b17cf98e16528/test-fixture-linked-hash-first-vs-iter-next-on-battery-benchmark.json',
  },
} as const;

export type GistKey = keyof typeof GISTS;

/** The run name `fetchFromGists` (processParameters.js) assigns a gist-loaded run: `${gistId}/${filenameInGist}`. */
function gistRunNameIn(gistId: string, key: GistKey): string {
  return `${gistId}/${GISTS[key].filenameInGist}`;
}

export function gistRunName(key: GistKey): string {
  return gistRunNameIn(GISTS[key].id, key);
}

/**
 * A single gist containing all 3 fixtures as separate files (same
 * `filenameInGist`s as the individual gists above), used by
 * `all-three-via-multi-file-gist.spec.ts` to exercise `fetchFromGists`'
 * one-run-per-file-in-the-gist path -- distinct from the 3 single-file gists
 * above, which each only ever produce 1 run.
 *
 * PLACEHOLDER: not a real gist ID yet (real ones are 32 lowercase hex chars;
 * this deliberately isn't, so it can't be mistaken for one). That spec only
 * ever hits this ID through `mockMultiFileGistApi`'s mocked route, and
 * nothing derives from the ID's *shape* the way `GISTS`' `rawUrl`s feed
 * `getUniqueNames`' prefix/suffix stripping above -- so a real gist here
 * would only buy the ability to cross-check this fixture's content by hand,
 * not correctness. Swap in a real gist's ID if that cross-check is wanted.
 */
export const ALL_THREE_GIST_ID = 'REPLACE-WITH-REAL-GIST-ID';

/** The run name a file within `ALL_THREE_GIST_ID` gets, reusing that fixture's individual-gist `filenameInGist`. */
export function allThreeGistRunName(key: GistKey): string {
  return gistRunNameIn(ALL_THREE_GIST_ID, key);
}

/**
 * The run name a *single* URL load assigns this fixture (getUniqueNames'
 * single-element branch: the URL's last path segment, unchanged) -- true
 * only because each raw URL's last segment happens to equal `filenameInGist`,
 * spelled out here so call sites don't rely on that coincidence implicitly.
 */
export function urlRunName(key: GistKey): string {
  return GISTS[key].filenameInGist;
}
