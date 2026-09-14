import { expect, test, Page } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';
import { expectCostOfAllocRateNormReport } from '../support/report-assertions';
import { expectStartScreen } from '../support/start-screen-assertions';

const FIXTURES = [
  'cost-of-alloc-rate-norm-benchmark.json',
  'linked-hash-first-vs-iter-next-benchmark.json',
  'linked-hash-first-vs-iter-next-on-battery-benchmark.json',
];

// The on-battery fixture is a deliberate companion to
// linked-hash-first-vs-iter-next-benchmark.json (same class/methods/params,
// ~45-51% worse avgt scores throughout), so with all 3 fixtures selected the
// Summary screen's "last two selected runs" comparison lands on these two and
// declines on every method x param combination -- CostOfAllocRateNormBenchmark
// has no entry in either compared run and is dropped from the comparison
// entirely. Single-consumer helper (used twice in the one spec below, no
// negative-test consumer), so it stays local rather than in e2e/support/.
async function expectDeclinedBenchmarks(
  page: Page,
  rows: { method: string; params: string }[],
): Promise<void> {
  const heading = page.getByRole('heading', { name: `Declined Benchmarks (${rows.length})`, exact: true });
  await expect(heading).toBeVisible();

  // Scope to the Declined table specifically via its immediate DOM sibling
  // (SummaryTable.jsx renders each of Improved/Declined/Unchanged as its own
  // <h3><Table> pair) rather than assuming Declined is the only <table> on
  // the page -- at the 50% threshold used below, 3 of the 4 declines drop
  // into a second, real "Unchanged Benchmarks" table instead of disappearing.
  const table = heading.locator('xpath=following-sibling::table[1]');
  const tableRows = table.locator('tbody').getByRole('row');
  await expect(tableRows).toHaveCount(rows.length);

  for (const { method, params } of rows) {
    // `params` (e.g. "size=10") must be matched with a negative lookahead,
    // not a plain substring -- "size=100".includes("size=10") is true, which
    // would double-count the size=100 row under size=10 too.
    await expect(
      tableRows.filter({ hasText: method }).filter({ hasText: new RegExp(`${params}(?!\\d)`) }),
    ).toHaveCount(1);
  }
}

const ALL_DECLINED_ROWS = [
  { method: 'entryIteratorNext', params: 'size=10' },
  { method: 'entryIteratorNext', params: 'size=100' },
  { method: 'firstEntry', params: 'size=10' },
  { method: 'firstEntry', params: 'size=100' },
];

test('uploading 3 reports supports Summary/Compare switching, single-run drill-down, sidebar scrolling, and reset', async ({ page }) => {
  const dialogs: string[] = [];
  page.on('dialog', async (d) => {
    dialogs.push(d.message());
    await d.dismiss();
  });
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReports(FIXTURES);

  // 1. slider present, "Declined Benchmarks (4)" at the default 5% threshold
  await expect(page.getByText('Ignoring deviations below 5%', { exact: true })).toBeVisible();
  await expectDeclinedBenchmarks(page, ALL_DECLINED_ROWS);

  // 2. slider can be moved -- pushing it to its max (50%) demonstrates a
  // real filtering effect: the real fixture score declines are ~45-51%, so
  // only the ~50.46% entry (entryIteratorNext/size=10) still clears the
  // threshold and the other 3 drop into "Unchanged"
  await app.moveMinDeviationSliderToMax();
  await expect(page.getByText('Ignoring deviations below 50%', { exact: true })).toBeVisible();
  await expectDeclinedBenchmarks(page, [{ method: 'entryIteratorNext', params: 'size=10' }]);
  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);

  // 3. all 3 filenames + "Summary" in the top nav
  for (const fixtureName of FIXTURES) {
    const runName = fixtureName.replace(/\.json$/, '');
    await expect(page.getByRole('button', { name: runName, exact: true })).toBeVisible();
  }
  // getByText would also match the SplitButton's hidden dropdown menu item
  // (an <a role="menuitem">Summary</a>, present but display:none until the
  // caret is opened) -- scope to the <button> tag to exclude it.
  await expect(page.locator('button', { hasText: /^Summary$/ })).toBeVisible();

  // 4. drill into each run individually
  await app.selectRun('cost-of-alloc-rate-norm-benchmark');
  await expectCostOfAllocRateNormReport(page);

  await app.selectRun('linked-hash-first-vs-iter-next-benchmark');
  await expect(page.getByText(/for single run 'linked-hash-first-vs-iter-next-benchmark'/)).toBeVisible();
  await expect(page.getByRole('heading', { name: /LinkedHashFirstVsIterNextBenchmark/ })).toBeVisible();
  await expect(page.locator('.recharts-wrapper').getByText('entryIteratorNext')).toBeVisible();
  await expect(page.locator('.recharts-wrapper').getByText('firstEntry')).toBeVisible();

  await app.selectRun('linked-hash-first-vs-iter-next-on-battery-benchmark');
  await expect(page.getByText(/for single run 'linked-hash-first-vs-iter-next-on-battery-benchmark'/)).toBeVisible();
  await expect(page.getByRole('heading', { name: /LinkedHashFirstVsIterNextBenchmark/ })).toBeVisible();

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);

  // 5. "Summary" returns to the summary view: only 1 run is selected right
  // now, so this click reselects all 3 without touching runView
  await app.clickAllRunsButton();
  await expectDeclinedBenchmarks(page, ALL_DECLINED_ROWS);

  // 6. switching Summary -> Compare: all runs are already selected, so this
  // click toggles the view instead of reselecting
  await app.clickAllRunsButton();
  const costHeading = page.getByRole('heading', { name: /CostOfAllocRateNormBenchmark/ });
  const linkedHashHeading = page.getByRole('heading', { name: /LinkedHashFirstVsIterNextBenchmark/ });
  await expect(costHeading).toBeVisible();
  await expect(linkedHashHeading).toBeVisible();
  await expect(page.getByText(/Ignoring deviations below/)).toHaveCount(0);

  // 7. sidebar scroll-to-section round trip. Class insertion order follows
  // sorted run/filename order, so CostOfAllocRateNormBenchmark's chart
  // renders above LinkedHashFirstVsIterNextBenchmark's -- but at the default
  // viewport size both charts are short enough to already fit on screen at
  // once, which would make a "not yet in viewport" precondition vacuously
  // false. Shrink the viewport just for this check to force a genuinely
  // scrollable page, restoring it afterward.
  const defaultViewport = page.viewportSize();
  await page.setViewportSize({ width: 1280, height: 400 });

  await expect(linkedHashHeading).not.toBeInViewport();
  await app.clickBenchmarkClassLink('LinkedHashFirstVsIterNextBenchmark');
  await expect(linkedHashHeading).toBeInViewport();

  await expect(costHeading).not.toBeInViewport();
  await app.clickBenchmarkClassLink('CostOfAllocRateNormBenchmark');
  await expect(costHeading).toBeInViewport();

  if (defaultViewport) {
    await page.setViewportSize(defaultViewport);
  }

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);

  // 8. Reset & Upload New -> start screen
  await app.resetAndUploadNew();
  await expectStartScreen(page);

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});
