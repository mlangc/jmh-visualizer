import { expect, test } from '@playwright/test';
import { GISTS } from '../support/gist-fixtures';
import { JmhApp } from '../support/jmh-app';
import { blockOffOrigin } from '../support/mock-remote-fixtures';
import { watchDialogsAndErrors } from '../support/page-watchers';
import { expectStartScreen } from '../support/start-screen-assertions';

// Every other spec asserts that no dialog and no page error fired. These assert the
// opposite: what the app does when a load *fails*. The fetch/parse layer is the part
// of the app a TypeScript port is most likely to rewrite wholesale, so today's
// behaviour — including the parts that are plainly bugs — is pinned here rather than
// left to be rediscovered afterwards.
//
// The two remote cases leave the app on a blank screen: `store.ts` starts with
// `initialLoading: true` whenever a source parameter is present, and neither failure
// path ever calls `initBenchmarks`, so nothing takes it out of that state. The upload
// path is the only one that recovers, because `loadBenchmarksAsync` catches and falls
// back to an empty run list.

test('an unparseable upload alerts and leaves the start screen usable', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  // Inline buffer rather than a vendored broken fixture: `fixtures/` holds real JMH
  // output, and nothing else here needs a malformed file on disk.
  await app.uploadRawFile({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{ not json') });

  // The message is V8's own JSON parser text, so match it loosely — it changes with
  // the browser, not with this app.
  await expect.poll(() => dialogs).toHaveLength(1);
  expect(dialogs[0]).toMatch(/SyntaxError/);

  await expectStartScreen(page);
  expect(pageErrors).toEqual([]);
});

test('a URL that 404s alerts and leaves the app on a blank screen', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);
  await blockOffOrigin(page);
  const url = GISTS.costOfAllocRateNorm.rawUrl;
  await page.route(url, (route) => route.fulfill({ status: 404, body: 'not found' }));

  await page.goto(`/?sources=${url}`);

  await expect.poll(() => dialogs).toEqual([`Could not fetch data from ${url}: Error: Not Found`]);
  // No report, and no way back: the start screen never appears either.
  await expect(page.locator('.recharts-wrapper')).toHaveCount(0);
  await expect(page.getByText('Drop your JMH JSON report file(s) here!')).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test('a gist that 404s alerts and then throws on the failed response', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);
  await blockOffOrigin(page);
  const gistId = GISTS.costOfAllocRateNorm.id;
  const apiUrl = `https://api.github.com/gists/${gistId}`;
  await page.route(apiUrl, (route) => route.fulfill({ status: 404, body: 'not found' }));

  await page.goto(`/?gists=${gistId}`);

  await expect.poll(() => dialogs).toEqual([`Could not fetch data from ${apiUrl}: Error: Not Found`]);

  // ...and then a second, unhandled failure: `fetchFromGists` alerts inside its own
  // `.catch`, which resolves that promise to `undefined`, and the next `.then` reads
  // `json.files` off it regardless. Pinned deliberately — it's a real bug, and a
  // rewrite that "tidies" the promise chain should have to decide about it explicitly.
  // Matched loosely for the same reason as the SyntaxError above: the wording is
  // V8's, and this particular message has already been reworded once upstream.
  await expect.poll(() => pageErrors).toHaveLength(1);
  expect(pageErrors[0]).toMatch(/reading 'files'/);
  await expect(page.locator('.recharts-wrapper')).toHaveCount(0);
});
