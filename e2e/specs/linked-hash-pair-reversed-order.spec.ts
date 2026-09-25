import { expect, test } from '@playwright/test';
import { GISTS, gistRunName } from '../support/gist-fixtures';
import { JmhApp } from '../support/jmh-app';
import { blockOffOrigin, mockGistApi, mockRawUrls } from '../support/mock-remote-fixtures';
import { watchDialogsAndErrors } from '../support/page-watchers';
import { expectImprovedBenchmarks, LINKED_HASH_PAIR_ROWS } from '../support/summary-comparison-assertions';

// URL/Gist-only companion to linked-hash-pair-via-file-url-gist.spec.ts: the
// same 2 fixtures, loaded on-battery-first instead -- an ordering file upload
// can't express, since it's always alphabetical and
// "...-benchmark.json" alphabetically precedes "...-on-battery-benchmark.json".
//
// This is NOT a simple mirror of the forward direction's assertion.
// SummaryView.tsx's scoreDiff formula divides by whichever run was loaded
// *second*, not by whichever run is worse, so reversing load order swaps
// which value is the denominator -- not just the sign. The same 4
// method/param combinations land in Improved Benchmarks instead of Declined,
// but at a different magnitude (~82-102%, vs. the forward direction's
// ~45-51%) -- comfortably clearing even the 50% max deviation slider, unlike
// the forward direction where only 1 of 4 rows clears it (asserted below).

test.beforeEach(async ({ page }) => {
  await blockOffOrigin(page);
});

test('loading the linked-hash pair via URL, on-battery first, improves every metric', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  await mockRawUrls(page, 'linkedHashOnBattery', 'linkedHash');
  const app = new JmhApp(page);
  await page.goto('/');
  await app.loadFromUrls([GISTS.linkedHashOnBattery.rawUrl, GISTS.linkedHash.rawUrl]);
  await expectImprovedBenchmarks(page, LINKED_HASH_PAIR_ROWS);

  for (const runName of [
    'test-fixture-linked-hash-first-vs-iter-next-on-battery',
    'test-fixture-linked-hash-first-vs-iter-next'
  ]) {
    await expect(page.getByRole('button', { name: runName, exact: true })).toBeVisible();
  }

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('loading the linked-hash pair via Gist, on-battery first, improves every metric even at the deviation slider max', async ({
  page
}) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  await mockGistApi(page, 'linkedHashOnBattery', 'linkedHash');
  const app = new JmhApp(page);
  await page.goto('/');
  await app.loadFromGists([GISTS.linkedHashOnBattery.id, GISTS.linkedHash.id]);
  await expectImprovedBenchmarks(page, LINKED_HASH_PAIR_ROWS);

  for (const runName of [gistRunName('linkedHashOnBattery'), gistRunName('linkedHash')]) {
    await expect(page.getByRole('button', { name: runName, exact: true })).toBeVisible();
  }

  // Unlike the forward direction (only 1 of 4 rows survives the slider's
  // 50% max), all 4 rows here are well above 50%, so all 4 stay in Improved.
  await app.moveMinDeviationSliderToMax();
  await expectImprovedBenchmarks(page, LINKED_HASH_PAIR_ROWS);

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});
