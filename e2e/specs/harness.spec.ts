import { expect, test } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';
import { expectCompleteSingleRunReport } from '../support/report-assertions';

// This suite tests the §5 assertion routine itself (expectCompleteSingleRunReport),
// not the app — see E2E_POC_PLAN.md §2. Two generic falsification checks every
// data-dependent characterization routine must pass: it must reject on a blank
// page, and it must reject on real-but-wrong data.
test.describe('expectCompleteSingleRunReport falsification checks', () => {
  const NEG_TIMEOUT = { timeout: 1_000 };   // modest, not sub-second — see §2

  test('rejects on a blank page', async ({ page }) => {
    await page.goto('about:blank');
    await expect(expectCompleteSingleRunReport(page, NEG_TIMEOUT)).rejects.toThrow();
    await expect(page.getByText('JMH Visualizer')).toHaveCount(0);
  });

  for (const kind of ['single', 'two', 'multi'] as const) {
    test(`rejects on the bundled ${kind}-run example`, async ({ page }) => {
      await page.goto('/');
      await new JmhApp(page).loadBundledExample(kind);
      await expect(page.locator('.recharts-wrapper').first()).toBeVisible();   // a chart *did* render
      await expect(expectCompleteSingleRunReport(page, NEG_TIMEOUT)).rejects.toThrow();
    });
  }
});
