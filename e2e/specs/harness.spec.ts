import { expect, type Page, test } from '@playwright/test';
import { expectBrandMenu } from '../support/brand-menu-assertions';
import { JmhApp } from '../support/jmh-app';
import { expectCostOfAllocRateNormReport } from '../support/report-assertions';
import { expectStartScreen } from '../support/start-screen-assertions';
import {
  expectDeclinedBenchmarks,
  expectImprovedBenchmarks,
  expectUnchangedBenchmarks,
  LINKED_HASH_PAIR_ROWS,
  LINKED_HASH_PAIR_ROWS_MINUS_SURVIVOR,
  LINKED_HASH_PAIR_SURVIVING_ROW
} from '../support/summary-comparison-assertions';

// This timeout is used for negative assertions, where failure means success.
// Using the default value makes these tests slow. Using a value that is too low
// risks making these tests pass for the wrong reason.
const NEG_TIMEOUT = { timeout: 1_000 };

// This suite tests the assertion routines themselves, not the app. Every
// routine here must reject on a blank page, and must reject on a real page
// whose state doesn't match the claim -- wrong table data for the two
// data-dependent routines below, the wrong screen for expectStartScreen, etc.
test.describe('expectCostOfAllocRateNormReport falsification checks', () => {
  test('rejects on a blank page', async ({ page }) => {
    await page.goto('about:blank');
    await expect(expectCostOfAllocRateNormReport(page, NEG_TIMEOUT)).rejects.toThrow();
    await expect(page.getByText('JMH Visualizer')).toHaveCount(0);
  });

  for (const kind of ['single', 'two', 'multi'] as const) {
    test(`rejects on the bundled ${kind}-run example`, async ({ page }) => {
      await page.goto('/');
      await new JmhApp(page).loadBundledExample(kind);
      await expect(page.locator('.recharts-wrapper').first()).toBeVisible(); // a chart *did* render
      await expect(expectCostOfAllocRateNormReport(page, NEG_TIMEOUT)).rejects.toThrow();
    });
  }
});

// expectDeclinedBenchmarks/expectImprovedBenchmarks/expectUnchangedBenchmarks
// (summary-comparison-assertions.ts) share one expectComparisonRows routine,
// so falsifying expectDeclinedBenchmarks/expectImprovedBenchmarks/
// expectUnchangedBenchmarks here covers all three.
test.describe('expectComparisonRows falsification checks', () => {
  test('rejects on a blank page', async ({ page }) => {
    await page.goto('about:blank');
    await expect(expectDeclinedBenchmarks(page, LINKED_HASH_PAIR_ROWS, NEG_TIMEOUT)).rejects.toThrow();
  });

  test('rejects when the claimed table has no rows at all', async ({ page }) => {
    await loadLinkedHashMapBenchmarks(page);

    // Confirm the real state first -- regular-then-on-battery always declines.
    await expectDeclinedBenchmarks(page, LINKED_HASH_PAIR_ROWS);

    // With 0 improved rows, SummaryTable.jsx renders no "Improved Benchmarks"
    // heading at all (and no second <table>), so this rejects at the very
    // first assertion (the heading lookup) -- it proves the heading lookup is
    // parameterized by table name, not that the *rows* are looked up inside
    // the right table (the next test covers that).
    await expect(expectImprovedBenchmarks(page, LINKED_HASH_PAIR_ROWS, NEG_TIMEOUT)).rejects.toThrow();
  });

  test('rejects when a row belongs to a different table on the same page, despite a matching row count', async ({
    page
  }) => {
    const app = await loadLinkedHashMapBenchmarks(page);

    // At the slider's 50% max, both a real Declined and a real Unchanged
    // table exist on the same page -- confirm the real state first.
    await app.moveMinDeviationSliderToMax();
    await expectDeclinedBenchmarks(page, [LINKED_HASH_PAIR_SURVIVING_ROW]);
    await expectUnchangedBenchmarks(page, LINKED_HASH_PAIR_ROWS_MINUS_SURVIVOR);

    // Right row count (3) for the Unchanged heading, but the first entry
    // actually lives in the Declined table on this same page -- only the
    // `following-sibling::table[1]` scoping in expectComparisonRows can
    // reject this; a page-wide (unscoped) row lookup would find it and pass.
    const rowFromTheOtherTable = [LINKED_HASH_PAIR_SURVIVING_ROW, ...LINKED_HASH_PAIR_ROWS_MINUS_SURVIVOR.slice(0, 2)];
    await expect(expectUnchangedBenchmarks(page, rowFromTheOtherTable, NEG_TIMEOUT)).rejects.toThrow();
  });

  test('rejects when a row has the wrong params', async ({ page }) => {
    await loadLinkedHashMapBenchmarks(page);

    // Confirm the real state first -- otherwise a routine that regressed to
    // rejecting at the heading check (rather than the per-row loop this test
    // means to exercise) would still pass here, proving nothing.
    await expectDeclinedBenchmarks(page, LINKED_HASH_PAIR_ROWS);

    // Same method/row count as the real Declined table (so the heading match
    // alone can't reject this), but the last entry's params don't exist --
    // proving the per-row loop, not just the heading's row count, is checked.
    const rowsWithOneWrongParams = [...LINKED_HASH_PAIR_ROWS.slice(0, 3), { method: 'firstEntry', params: 'size=999' }];
    await expect(expectDeclinedBenchmarks(page, rowsWithOneWrongParams, NEG_TIMEOUT)).rejects.toThrow();
  });
});

test.describe('start screen falsification checks', () => {
  test('rejects on a blank page', async ({ page }) => {
    await page.goto('about:blank');
    await expect(expectStartScreen(page, NEG_TIMEOUT)).rejects.toThrow();
  });

  test('rejects if benchmarks are already loaded', async ({ page }) => {
    await loadLinkedHashMapBenchmarks(page);
    await expect(expectStartScreen(page, NEG_TIMEOUT)).rejects.toThrow();
  });
});

test.describe('brand menu falsification checks', () => {
  test('rejects on a blank page', async ({ page }) => {
    await page.goto('about:blank');
    await expect(expectBrandMenu(page, { ...NEG_TIMEOUT, visible: true })).rejects.toThrow();
  });

  test('rejects if the menu is hidden, but expected to be visible', async ({ page }) => {
    await page.goto('/');
    await expect(expectBrandMenu(page, { ...NEG_TIMEOUT, visible: true })).rejects.toThrow();
  });

  test('rejects if the menu is visible, but expected to be hidden', async ({ page }) => {
    const app = new JmhApp(page);
    await page.goto('/');
    await app.toggleBrandMenu();
    await expect(expectBrandMenu(page, { ...NEG_TIMEOUT, visible: false })).rejects.toThrow();
  });
});

async function loadLinkedHashMapBenchmarks(page: Page): Promise<JmhApp> {
  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReports([
    'linked-hash-first-vs-iter-next-benchmark.json',
    'linked-hash-first-vs-iter-next-on-battery-benchmark.json'
  ]);
  return app;
}
