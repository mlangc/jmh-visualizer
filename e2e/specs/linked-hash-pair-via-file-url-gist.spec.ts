import { expect, test } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';
import { blockOffOrigin, mockGistApi, mockRawUrls } from '../support/mock-remote-fixtures';
import { GISTS, gistRunName } from '../support/gist-fixtures';
import { expectDeclinedBenchmarks, LINKED_HASH_PAIR_ROWS } from '../support/summary-comparison-assertions';
import { watchDialogsAndErrors } from '../support/page-watchers';

// Unlike multi-run-summary-and-compare.spec.ts (all 3 fixtures), this loads
// just the linked-hash pair on its own -- a subset the existing suite never
// exercises in isolation -- via all 3 mechanisms. Loaded in this order
// (regular, then on-battery) the pair always declines on
// LINKED_HASH_PAIR_ROWS; see linked-hash-pair-reversed-order.spec.ts for the
// opposite order/direction. Run names differ per mechanism (see
// gist-fixtures.ts/getUniqueNames), so each test asserts its own expected
// nav-button names.

test.beforeEach(async ({ page }) => {
  await blockOffOrigin(page);
});

test('uploading just the linked-hash pair via file selects them and declines every metric', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReports([
    'linked-hash-first-vs-iter-next-benchmark.json',
    'linked-hash-first-vs-iter-next-on-battery-benchmark.json',
  ]);
  await expectDeclinedBenchmarks(page, LINKED_HASH_PAIR_ROWS);
  for (const runName of ['linked-hash-first-vs-iter-next-benchmark', 'linked-hash-first-vs-iter-next-on-battery-benchmark']) {
    await expect(page.getByRole('button', { name: runName, exact: true })).toBeVisible();
  }

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('loading just the linked-hash pair via URL (regular, then on-battery) declines every metric', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  await mockRawUrls(page, 'linkedHash', 'linkedHashOnBattery');
  const app = new JmhApp(page);
  await page.goto('/');
  await app.loadFromUrls([GISTS.linkedHash.rawUrl, GISTS.linkedHashOnBattery.rawUrl]);
  await expectDeclinedBenchmarks(page, LINKED_HASH_PAIR_ROWS);

  // getUniqueNames strips the shared "-benchmark.json" suffix off both URLs.
  for (const runName of ['test-fixture-linked-hash-first-vs-iter-next', 'test-fixture-linked-hash-first-vs-iter-next-on-battery']) {
    await expect(page.getByRole('button', { name: runName, exact: true })).toBeVisible();
  }

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('loading just the linked-hash pair via Gist (regular, then on-battery) declines every metric', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  await mockGistApi(page, 'linkedHash', 'linkedHashOnBattery');
  const app = new JmhApp(page);
  await page.goto('/');
  await app.loadFromGists([GISTS.linkedHash.id, GISTS.linkedHashOnBattery.id]);
  await expectDeclinedBenchmarks(page, LINKED_HASH_PAIR_ROWS);

  for (const runName of [gistRunName('linkedHash'), gistRunName('linkedHashOnBattery')]) {
    await expect(page.getByRole('button', { name: runName, exact: true })).toBeVisible();
  }

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});
