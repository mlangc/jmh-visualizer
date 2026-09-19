import { expect, test } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';
import { watchDialogsAndErrors } from '../support/page-watchers';
import { expectTwoRunCompare, LINKED_HASH_PAIR_COMPARE } from '../support/two-run-compare-assertions';

// The two-run Compare screen is the one main view the rest of the suite never reaches:
// specs that load 2 runs stop at the Summary screen, and the 3-fixture specs toggling
// Compare land in MultiRunView instead. Reaching it needs exactly 2 runs loaded --
// RunSelectionBar's run buttons only ever select a *single* run, so 3 loaded runs can
// never be narrowed to 2.
//
// This covers the screen, not all of components/two/: DiffBarChartView also renders on
// the Details screen with 2 runs loaded (DetailScreen.jsx's twoRunsChartGenerator),
// which nothing here exercises, and TwoRunsHistogramChart is imported nowhere in src/
// at all.

const LINKED_HASH_PAIR = [
  'linked-hash-first-vs-iter-next-benchmark.json',
  'linked-hash-first-vs-iter-next-on-battery-benchmark.json'
];

test('toggling Compare with 2 runs loaded renders the per-method difference chart', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReports(LINKED_HASH_PAIR);
  // Both runs are already selected, so this toggles Summary -> Compare.
  await app.clickAllRunsButton();

  // The same declines the Summary tables show, here as unrounded per-bar labels:
  // every score is < 1, so util.js's round() leaves them alone.
  await expectTwoRunCompare(page, LINKED_HASH_PAIR_COMPARE);

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('the Compare screen JSON panels show one run at a time', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReports(LINKED_HASH_PAIR);
  await app.clickAllRunsButton();
  await expect(page.getByRole('button', { name: 'Show JSON 1' })).toBeVisible();

  // Identify the panels by content rather than position: each of these scores occurs
  // in one fixture and not the other, so this also proves panel 1 holds run 1 and
  // panel 2 holds run 2.
  const firstRunJson = page.locator('pre', { hasText: '7.949607915875453e-10' });
  const secondRunJson = page.locator('pre', { hasText: '1.6047252190570438e-9' });

  await page.getByRole('button', { name: 'Show JSON 1' }).click();
  await expect(firstRunJson).toBeVisible();
  await expect(secondRunJson).toBeHidden();

  // Opening the second panel closes the first (TwoRunBundle keeps them exclusive).
  await page.getByRole('button', { name: 'Show JSON 2' }).click();
  await expect(secondRunJson).toBeVisible();
  await expect(firstRunJson).toBeHidden();

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('the Compare screen lists benchmarks added and removed between the runs', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  // Needs runs whose benchmark sets differ, which the vendored fixtures can't express
  // (they hold the same class, methods and params) — the bundled examples can.
  await app.loadBundledExample('two');
  await app.clickAllRunsButton();

  await expect(page.getByText('Comparing').first()).toBeVisible();
  for (const listed of [
    'Removed benchmarks: someImplementation',
    'Removed benchmarks: doA, doB, doC',
    'New benchmarks: withThreads1, withThreads2, withThreads4'
  ]) {
    await expect(page.getByText(listed, { exact: false })).toBeVisible();
  }

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});
