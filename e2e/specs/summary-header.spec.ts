import { expect, test } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';
import { watchDialogsAndErrors } from '../support/page-watchers';
import { expectSummaryHeader } from '../support/summary-header-assertions';

// The Summary screen's header sentence is what tells the user which two runs the
// Improved/Declined/Unchanged tables are about. Kept in its own spec rather than
// folded into multi-run-workflow.ts: the 3-run case needs an app fix that older
// builds don't have (see @needs-fix in playwright.config.ts), and tagging it here
// keeps that dependency off the shared workflow every other multi-run spec uses.

const LINKED_HASH_PAIR = [
  'linked-hash-first-vs-iter-next-benchmark.json',
  'linked-hash-first-vs-iter-next-on-battery-benchmark.json'
];

const ALL_THREE = ['cost-of-alloc-rate-norm-benchmark.json', ...LINKED_HASH_PAIR];

test('the Summary header names both runs when exactly 2 are loaded', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReports(LINKED_HASH_PAIR);

  // Both runs hold the same single class, and all 4 of its method/param combinations
  // appear in both -- so every result is comparable.
  await expectSummaryHeader(page, {
    results: 4,
    benchmarkClasses: 1,
    runName1: 'linked-hash-first-vs-iter-next-benchmark',
    runName2: 'linked-hash-first-vs-iter-next-on-battery-benchmark'
  });

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('the Summary header names the last two runs when 3 are loaded', { tag: '@needs-fix' }, async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReports(ALL_THREE);

  // 2 classes are loaded but only the linked-hash pair's 4 results are comparable:
  // CostOfAllocRateNormBenchmark appears in neither of the last two runs.
  await expectSummaryHeader(page, {
    results: 4,
    benchmarkClasses: 2,
    runName1: 'linked-hash-first-vs-iter-next-benchmark',
    runName2: 'linked-hash-first-vs-iter-next-on-battery-benchmark'
  });

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});
