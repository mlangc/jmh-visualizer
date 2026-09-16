import fs from 'node:fs';
import path from 'node:path';
import { Page } from '@playwright/test';
import { GISTS, GistKey, ALL_THREE_GIST_ID } from './gist-fixtures';

const FIXTURES = path.join(__dirname, '..', 'fixtures');

/**
 * Blocks every request that isn't to the local test server (127.0.0.1) or
 * already covered by a `mockGistApi`/`mockRawUrls` route registered before
 * it -- Playwright matches routes most-recently-registered-first, so the
 * per-gist mocks still win. Every gist ID in `gist-fixtures.ts` is a real,
 * live, public gist: without this, a spec that forgets to mock would still
 * pass on a networked machine (silently hitting the real GitHub API) and
 * only fail -- slowly and with an unhelpful bare timeout, since the app
 * swallows the fetch error into a dismissed `alert()` -- offline or
 * rate-limited. Call once per test, before navigating.
 */
export async function blockOffOrigin(page: Page): Promise<void> {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') {
      return route.continue();
    }
    return route.abort();
  });
}

/**
 * Intercepts `fetch('https://api.github.com/gists/:id')` (processParameters.js's
 * `fetchFromGists`) for each given gist, returning the minimal subset of the
 * real GitHub API's response shape the app actually reads --
 * `{ id, files: { <filename>: { content: <JSON string> } } }` -- but backed
 * by the local fixture content instead of a live network call.
 */
export async function mockGistApi(page: Page, ...keys: GistKey[]): Promise<void> {
  for (const key of keys) {
    const gist = GISTS[key];
    const content = fs.readFileSync(path.join(FIXTURES, gist.fixture), 'utf-8');
    await page.route(`https://api.github.com/gists/${gist.id}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: gist.id,
          files: { [gist.filenameInGist]: { content } },
        }),
      }),
    );
  }
}

/**
 * Intercepts `fetch('https://api.github.com/gists/${ALL_THREE_GIST_ID}')` with
 * a single response bundling all `keys` as separate files -- unlike
 * `mockGistApi`, which mocks one route per (single-file) gist, this mocks one
 * route whose response's `files` object has multiple entries, exercising
 * `fetchFromGists`' `Object.entries(json.files)` fan-out into one run per
 * file. `keys`' order becomes the mocked `files` object's key order, which
 * `Object.entries(json.files)` in `fetchFromGists` turns into run order --
 * run order matters here, since the Summary screen compares the *last two*
 * selected runs.
 */
export async function mockMultiFileGistApi(page: Page, ...keys: GistKey[]): Promise<void> {
  const files: Record<string, { content: string }> = {};
  for (const key of keys) {
    const gist = GISTS[key];
    if (files[gist.filenameInGist]) {
      throw new Error(`Duplicate filenameInGist '${gist.filenameInGist}' -- would silently collapse to 1 run.`);
    }
    files[gist.filenameInGist] = { content: fs.readFileSync(path.join(FIXTURES, gist.fixture), 'utf-8') };
  }
  await page.route(`https://api.github.com/gists/${ALL_THREE_GIST_ID}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: ALL_THREE_GIST_ID, files }),
    }),
  );
}

/**
 * Intercepts `fetch()` of each gist's real raw-content URL (processParameters.js's
 * `fetchFromUrls`), returning the local fixture's JSON directly -- the shape
 * `fetchFromUrls` expects, unlike the Gist API's wrapped `{files: {...}}`.
 * Uses the gists' real raw URLs (not synthetic ones) so `getUniqueNames`'s
 * prefix/suffix stripping over these URLs matches what it would do against
 * the real gists.
 */
export async function mockRawUrls(page: Page, ...keys: GistKey[]): Promise<void> {
  for (const key of keys) {
    const gist = GISTS[key];
    const content = fs.readFileSync(path.join(FIXTURES, gist.fixture), 'utf-8');
    await page.route(gist.rawUrl, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: content,
      }),
    );
  }
}
