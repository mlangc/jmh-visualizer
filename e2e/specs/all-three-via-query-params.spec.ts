import { expect, test } from '@playwright/test';
import { GISTS, gistRunName } from '../support/gist-fixtures';
import { JmhApp } from '../support/jmh-app';
import { blockOffOrigin, mockGistApi, mockRawUrls } from '../support/mock-remote-fixtures';
import { watchDialogsAndErrors } from '../support/page-watchers';
import {
  expectDeclinedBenchmarks,
  expectUnchangedBenchmarks,
  LINKED_HASH_PAIR_ROWS,
  LINKED_HASH_PAIR_ROWS_MINUS_SURVIVOR,
  LINKED_HASH_PAIR_SURVIVING_ROW
} from '../support/summary-comparison-assertions';

// Companion to multi-run-summary-and-compare.spec.ts's file-upload case: all
// 3 fixtures, same (alphabetical) order, loaded instead via the ?sources=/
// ?gists= query params -- the only way to load 3+ URLs/Gists at once, since
// the "Load from URL(s)/Gist(s)" dialogs cap at 2 fields. Same order as the
// file-upload spec means the same 2 runs (linked-hash regular/on-battery)
// end up as the Summary screen's "last two selected" comparison, so the
// declined-benchmarks math is identical to that spec -- only the run names
// on the nav buttons differ per mechanism.

test.beforeEach(async ({ page }) => {
  await blockOffOrigin(page);
});

test('loading all 3 fixtures via ?sources= (same order as the file-upload spec) declines the linked-hash pair', async ({
  page
}) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  await mockRawUrls(page, 'costOfAllocRateNorm', 'linkedHash', 'linkedHashOnBattery');
  const app = new JmhApp(page);
  await app.gotoWithSources([
    GISTS.costOfAllocRateNorm.rawUrl,
    GISTS.linkedHash.rawUrl,
    GISTS.linkedHashOnBattery.rawUrl
  ]);

  await expectDeclinedBenchmarks(page, LINKED_HASH_PAIR_ROWS);

  // Same filtering effect as the file-upload spec: only the ~50.46% entry
  // (entryIteratorNext/size=10) survives the slider's 50% max.
  await app.moveMinDeviationSliderToMax();
  await expectDeclinedBenchmarks(page, [LINKED_HASH_PAIR_SURVIVING_ROW]);
  await expectUnchangedBenchmarks(page, LINKED_HASH_PAIR_ROWS_MINUS_SURVIVOR);

  for (const runName of [
    'test-fixture-cost-of-alloc-rate-norm',
    'test-fixture-linked-hash-first-vs-iter-next',
    'test-fixture-linked-hash-first-vs-iter-next-on-battery'
  ]) {
    await expect(page.getByRole('button', { name: runName, exact: true })).toBeVisible();
  }

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('loading all 3 fixtures via ?gists= (same order as the file-upload spec) declines the linked-hash pair', async ({
  page
}) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  await mockGistApi(page, 'costOfAllocRateNorm', 'linkedHash', 'linkedHashOnBattery');
  const app = new JmhApp(page);
  await app.gotoWithGists([GISTS.costOfAllocRateNorm.id, GISTS.linkedHash.id, GISTS.linkedHashOnBattery.id]);

  await expectDeclinedBenchmarks(page, LINKED_HASH_PAIR_ROWS);

  await app.moveMinDeviationSliderToMax();
  await expectDeclinedBenchmarks(page, [LINKED_HASH_PAIR_SURVIVING_ROW]);
  await expectUnchangedBenchmarks(page, LINKED_HASH_PAIR_ROWS_MINUS_SURVIVOR);

  for (const key of ['costOfAllocRateNorm', 'linkedHash', 'linkedHashOnBattery'] as const) {
    await expect(page.getByRole('button', { name: gistRunName(key), exact: true })).toBeVisible();
  }

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});
