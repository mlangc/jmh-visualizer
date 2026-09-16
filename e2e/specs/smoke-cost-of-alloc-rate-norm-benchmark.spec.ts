import { expect, test } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';
import { expectCostOfAllocRateNormReport } from '../support/report-assertions';
import { watchDialogsAndErrors } from '../support/page-watchers';

test('cost-of-alloc-rate-norm-benchmark.json renders a complete single-run report', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  await page.goto('/');
  await new JmhApp(page).uploadReport('cost-of-alloc-rate-norm-benchmark.json');
  await expectCostOfAllocRateNormReport(page);

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});
