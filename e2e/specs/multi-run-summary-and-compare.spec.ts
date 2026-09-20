import { test } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';
import { expectMultiRunWorkflow } from '../support/multi-run-workflow';
import { watchDialogsAndErrors } from '../support/page-watchers';

const FIXTURES = [
  'cost-of-alloc-rate-norm-benchmark.json',
  'linked-hash-first-vs-iter-next-benchmark.json',
  'linked-hash-first-vs-iter-next-on-battery-benchmark.json'
];

// The on-battery fixture is a deliberate companion to
// linked-hash-first-vs-iter-next-benchmark.json (same class/methods/params,
// ~45-51% worse avgt scores throughout), so with all 3 fixtures selected the
// Summary screen's "last two selected runs" comparison lands on these two and
// declines on every method x param combination -- CostOfAllocRateNormBenchmark
// has no entry in either compared run and is dropped from the comparison
// entirely. See support/multi-run-workflow.ts for the shared assertions.

test('uploading 3 reports supports Summary/Compare switching, single-run drill-down, sidebar scrolling, and reset', async ({
  page
}) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReports(FIXTURES);

  await expectMultiRunWorkflow(
    page,
    app,
    {
      costOfAllocRateNorm: 'cost-of-alloc-rate-norm-benchmark',
      linkedHash: 'linked-hash-first-vs-iter-next-benchmark',
      linkedHashOnBattery: 'linked-hash-first-vs-iter-next-on-battery-benchmark'
    },
    { dialogs, pageErrors }
  );
});
