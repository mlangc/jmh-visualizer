import { expect, test } from '@playwright/test';
import { GISTS, gistRunName, urlRunName } from '../support/gist-fixtures';
import { JmhApp } from '../support/jmh-app';
import { blockOffOrigin, mockGistApi, mockRawUrls } from '../support/mock-remote-fixtures';
import { watchDialogsAndErrors } from '../support/page-watchers';
import { expectStartScreen } from '../support/start-screen-assertions';

// Everything `processParameters.js` reads off the URL before the app has rendered
// anything, plus the `onbeforeunload` guard that only the upload path installs. The
// rest of the suite always arrives through the start screen or through `?sources=`/
// `?gists=`, so these branches decide what a shared link does and nothing checked them.

test.describe('bundled examples by URL', () => {
  for (const [kind, expected] of [
    ['single', /18 different benchmark classes for single run 'run1' and metric 'Score' detected/],
    ['two', /Comparing\s*95\s*results out of\s*19\s*benchmark classes/],
    // The multi-run case's header sentence is asserted in summary-header.spec.ts
    // instead -- naming the right two of three runs needs an app fix older builds
    // lack, and that dependency belongs on one @needs-fix test, not on this one.
    ['multi', /Comparing\s*98\s*results out of\s*19\s*benchmark classes/]
  ] as const) {
    test(`?example=${kind} loads the ${kind}-run example`, async ({ page }) => {
      const { dialogs, pageErrors } = watchDialogsAndErrors(page);

      await page.goto(`/?example=${kind}`);
      await expect(page.getByText(expected)).toBeVisible();

      expect(dialogs).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    // The pre-2018 spelling, kept alive by getExampleFromHash's own fallback. Same
    // screen, reached through a completely different branch.
    const legacyHash = { single: '#singleRunExample', two: '#twoRunsExample', multi: '#multiRunExample' }[kind];
    test(`${legacyHash} still loads the ${kind}-run example`, async ({ page }) => {
      const { dialogs, pageErrors } = watchDialogsAndErrors(page);

      await page.goto(`/${legacyHash}`);
      await expect(page.getByText(expected)).toBeVisible();

      expect(dialogs).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }
});

test('?source= loads a single report, like the plural form with one URL', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);
  await blockOffOrigin(page);
  await mockRawUrls(page, 'costOfAllocRateNorm');

  await page.goto(`/?source=${GISTS.costOfAllocRateNorm.rawUrl}`);

  await expect(
    page.getByText(
      new RegExp(`1 different benchmark classes for single run '${urlRunName('costOfAllocRateNorm')}' and metric`)
    )
  ).toBeVisible();

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('?gist= loads a single gist, like the plural form with one ID', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);
  await blockOffOrigin(page);
  await mockGistApi(page, 'costOfAllocRateNorm');

  await page.goto(`/?gist=${GISTS.costOfAllocRateNorm.id}`);

  await expect(
    page.getByText(
      new RegExp(`1 different benchmark classes for single run '${gistRunName('costOfAllocRateNorm')}' and metric`)
    )
  ).toBeVisible();

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('?topBar= replaces or removes the navigation bar', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  // Default: the navbar with the brand dropdown, and no footer.
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'JMH Visualizer', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /^JMH Visualizer \d/ })).toHaveCount(0);

  // 'off': no navbar -- and Footer.jsx appears in its place, which is the only way the
  // app ever shows its version number.
  await page.goto('/?topBar=off');
  await expectStartScreen(page); // the report screens still work without it
  await expect(page.getByRole('link', { name: 'JMH Visualizer', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /^JMH Visualizer \d/ })).toBeVisible();

  // Anything else is taken as a headline for the embedding page to set.
  await page.goto('/?topBar=Our%20Nightly%20Benchmarks');
  await expect(page.getByRole('heading', { name: 'Our Nightly Benchmarks', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'JMH Visualizer', exact: true })).toHaveCount(0);

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('leaving the page after an upload warns about losing the benchmarks', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReport('cost-of-alloc-rate-norm-benchmark.json');

  // `parseBenchmarks` installs window.onbeforeunload on a successful upload, so the
  // browser asks before discarding the report. Chromium only honours that once the
  // page has seen a real user gesture, hence the click -- and the prompt itself has no
  // message of ours to assert: browsers ignore the returned string.
  await page.getByRole('button', { name: 'Show JSON' }).click();
  await page.close({ runBeforeUnload: true });
  await expect.poll(() => dialogs).toHaveLength(1);

  expect(pageErrors).toEqual([]);
});

test('leaving the page after loading an example does not warn', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  // Same screenful of charts, no guard: the examples come from `getExamples`, which
  // never touches window.onbeforeunload -- there is nothing of the user's to lose.
  await app.loadBundledExample('single');

  await page.getByRole('button', { name: 'Show JSON' }).first().click();
  await page.close({ runBeforeUnload: true });
  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});
