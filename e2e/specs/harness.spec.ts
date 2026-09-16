import { expect, Page, test } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';
import { expectCostOfAllocRateNormReport } from '../support/report-assertions';
import {
  expectDeclinedBenchmarks,
  expectImprovedBenchmarks,
  expectUnchangedBenchmarks,
  LINKED_HASH_PAIR_ROWS,
  LINKED_HASH_PAIR_ROWS_MINUS_SURVIVOR,
  LINKED_HASH_PAIR_SURVIVING_ROW,
} from '../support/summary-comparison-assertions';

// This suite tests the assertion routines themselves, not the app. Two
// generic falsification checks every data-dependent characterization routine
// must pass: it must reject on a blank page, and it must reject on real-but-
// wrong data.

test.describe('expectCostOfAllocRateNormReport falsification checks', () => {
  // Modest, not sub-second: the routine checks a couple of always-present
  // chrome elements before the first report-specific one, so a too-tight
  // budget risks a spurious timeout on those instead of a real rejection.
  const NEG_TIMEOUT = { timeout: 1_000 };

  test('rejects on a blank page', async ({ page }) => {
    await page.goto('about:blank');
    await expect(expectCostOfAllocRateNormReport(page, NEG_TIMEOUT)).rejects.toThrow();
    await expect(page.getByText('JMH Visualizer')).toHaveCount(0);
  });

  for (const kind of ['single', 'two', 'multi'] as const) {
    test(`rejects on the bundled ${kind}-run example`, async ({ page }) => {
      await page.goto('/');
      await new JmhApp(page).loadBundledExample(kind);
      await expect(page.locator('.recharts-wrapper').first()).toBeVisible();   // a chart *did* render
      await expect(expectCostOfAllocRateNormReport(page, NEG_TIMEOUT)).rejects.toThrow();
    });
  }
});

// expectDeclinedBenchmarks/expectImprovedBenchmarks/expectUnchangedBenchmarks
// (summary-comparison-assertions.ts) share one expectComparisonRows routine,
// so falsifying expectDeclinedBenchmarks/expectImprovedBenchmarks/
// expectUnchangedBenchmarks here covers all three.
test.describe('expectComparisonRows falsification checks', () => {
  // Unlike expectCostOfAllocRateNormReport's NEG_TIMEOUT above, every check
  // here can reject on its very first assertion (the heading lookup), so
  // there's no "always-present chrome" to budget past -- 1s is kept anyway,
  // since a too-tight budget makes a *spurious* timeout read as a pass
  // (see the "wrong params" test below).
  const NEG_TIMEOUT = { timeout: 1_000 };

  async function loadLinkedHashPair(page: Page): Promise<JmhApp> {
    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReports([
      'linked-hash-first-vs-iter-next-benchmark.json',
      'linked-hash-first-vs-iter-next-on-battery-benchmark.json',
    ]);
    return app;
  }

  test('rejects on a blank page', async ({ page }) => {
    await page.goto('about:blank');
    await expect(expectDeclinedBenchmarks(page, LINKED_HASH_PAIR_ROWS, NEG_TIMEOUT)).rejects.toThrow();
  });

  test('rejects when the claimed table has no rows at all', async ({ page }) => {
    await loadLinkedHashPair(page);

    // Confirm the real state first -- regular-then-on-battery always declines.
    await expectDeclinedBenchmarks(page, LINKED_HASH_PAIR_ROWS);

    // With 0 improved rows, SummaryTable.jsx renders no "Improved Benchmarks"
    // heading at all (and no second <table>), so this rejects at the very
    // first assertion (the heading lookup) -- it proves the heading lookup is
    // parameterized by table name, not that the *rows* are looked up inside
    // the right table (the next test covers that).
    await expect(expectImprovedBenchmarks(page, LINKED_HASH_PAIR_ROWS, NEG_TIMEOUT)).rejects.toThrow();
  });

  test('rejects when a row belongs to a different table on the same page, despite a matching row count', async ({ page }) => {
    const app = await loadLinkedHashPair(page);

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
    await loadLinkedHashPair(page);

    // Confirm the real state first -- otherwise a routine that regressed to
    // rejecting at the heading check (rather than the per-row loop this test
    // means to exercise) would still pass here, proving nothing.
    await expectDeclinedBenchmarks(page, LINKED_HASH_PAIR_ROWS);

    // Same method/row count as the real Declined table (so the heading match
    // alone can't reject this), but the last entry's params don't exist --
    // proving the per-row loop, not just the heading's row count, is checked.
    const rowsWithOneWrongParams = [
      ...LINKED_HASH_PAIR_ROWS.slice(0, 3),
      { method: 'firstEntry', params: 'size=999' },
    ];
    await expect(expectDeclinedBenchmarks(page, rowsWithOneWrongParams, NEG_TIMEOUT)).rejects.toThrow();
  });
});
