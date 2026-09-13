import { expect, test } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';
import { expectCompleteSingleRunReport } from '../support/report-assertions';

// This suite tests the assertion routine itself (expectCompleteSingleRunReport),
// not the app. Two generic falsification checks every data-dependent
// characterization routine must pass: it must reject on a blank page, and it
// must reject on real-but-wrong data.
test.describe('expectCompleteSingleRunReport falsification checks', () => {
  // Modest, not sub-second: the routine checks a couple of always-present
  // chrome elements before the first report-specific one, so a too-tight
  // budget risks a spurious timeout on those instead of a real rejection.
  const NEG_TIMEOUT = { timeout: 1_000 };

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
