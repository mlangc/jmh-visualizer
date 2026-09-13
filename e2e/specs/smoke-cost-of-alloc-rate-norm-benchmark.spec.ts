import { expect, test } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';
import { expectCostOfAllocRateNormReport } from '../support/report-assertions';

test('cost-of-alloc-rate-norm-benchmark.json renders a complete single-run report', async ({ page }) => {
  // collect dialogs (a JMH parse failure calls window.alert) and dismiss them;
  // assert none fired at the end
  const dialogs: string[] = [];
  page.on('dialog', async (d) => {
    dialogs.push(d.message());
    await d.dismiss();
  });

  await page.goto('/');
  await new JmhApp(page).uploadReport('cost-of-alloc-rate-norm-benchmark.json');
  await expectCostOfAllocRateNormReport(page);

  expect(dialogs).toEqual([]);
});
