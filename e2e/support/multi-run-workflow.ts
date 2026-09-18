import { expect, type Page } from '@playwright/test';
import type { JmhApp } from './jmh-app';
import type { PageWatchers } from './page-watchers';
import { escapeRegExp } from './regex-util';
import { expectCostOfAllocRateNormReport } from './report-assertions';
import { expectStartScreen } from './start-screen-assertions';
import {
  expectDeclinedBenchmarks,
  expectUnchangedBenchmarks,
  LINKED_HASH_PAIR_ROWS,
  LINKED_HASH_PAIR_ROWS_MINUS_SURVIVOR,
  LINKED_HASH_PAIR_SURVIVING_ROW
} from './summary-comparison-assertions';

/**
 * The full Summary/Compare/drill-down/sidebar/reset workflow shared by the
 * "load all 3 fixtures at once" specs that need it in full -- currently the
 * file-upload and multi-file-gist specs (the `?sources=`/`?gists=` spec
 * asserts a deliberately cheaper subset inline, since its focus is which run
 * names each query param produces, not the whole workflow). Callers register
 * their own `dialogs`/`pageErrors` listeners (before their mechanism-specific
 * load call, so nothing during the load itself is missed) and do their own
 * network mocking, then hand the populated-so-far arrays in here once `app`
 * has all 3 runs loaded; `runNames` supplies each fixture's run name as that
 * mechanism assigns it (file upload strips `.json`; URL/Gist name runs
 * differently, see `report-assertions.ts`).
 */
export async function expectMultiRunWorkflow(
  page: Page,
  app: JmhApp,
  runNames: { costOfAllocRateNorm: string; linkedHash: string; linkedHashOnBattery: string },
  watched: PageWatchers
): Promise<void> {
  const { dialogs, pageErrors } = watched;
  // 1. slider present, "Declined Benchmarks (4)" at the default 5% threshold
  await expect(page.getByText('Ignoring deviations below 5%', { exact: true })).toBeVisible();
  await expectDeclinedBenchmarks(page, LINKED_HASH_PAIR_ROWS);

  // 2. slider can be moved: pushing it to its max (50%) demonstrates a real
  // filtering effect. The real fixture score declines are ~45-51%, so only
  // the ~50.46% entry (entryIteratorNext/size=10) still clears the
  // threshold and the other 3 drop into "Unchanged"
  await app.moveMinDeviationSliderToMax();
  await expect(page.getByText('Ignoring deviations below 50%', { exact: true })).toBeVisible();
  await expectDeclinedBenchmarks(page, [LINKED_HASH_PAIR_SURVIVING_ROW]);
  await expectUnchangedBenchmarks(page, LINKED_HASH_PAIR_ROWS_MINUS_SURVIVOR);
  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);

  // 3. all 3 run names + "Summary" in the top nav
  for (const runName of Object.values(runNames)) {
    await expect(page.getByRole('button', { name: runName, exact: true })).toBeVisible();
  }
  // getByText would also match the SplitButton's hidden dropdown menu item
  // (an <a role="menuitem">Summary</a>, present but display:none until the
  // caret is opened): scope to the <button> tag to exclude it.
  await expect(page.locator('button', { hasText: /^Summary$/ })).toBeVisible();

  // 4. drill into each run individually
  await app.selectRun(runNames.costOfAllocRateNorm);
  await expectCostOfAllocRateNormReport(page, { runName: runNames.costOfAllocRateNorm });

  await app.selectRun(runNames.linkedHash);
  await expect(page.getByText(new RegExp(`for single run '${escapeRegExp(runNames.linkedHash)}'`))).toBeVisible();
  await expect(page.getByRole('heading', { name: /LinkedHashFirstVsIterNextBenchmark/ })).toBeVisible();
  await expect(page.locator('.recharts-wrapper').getByText('entryIteratorNext')).toBeVisible();
  await expect(page.locator('.recharts-wrapper').getByText('firstEntry')).toBeVisible();

  await app.selectRun(runNames.linkedHashOnBattery);
  await expect(
    page.getByText(new RegExp(`for single run '${escapeRegExp(runNames.linkedHashOnBattery)}'`))
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: /LinkedHashFirstVsIterNextBenchmark/ })).toBeVisible();

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);

  // 5. "Summary" returns to the summary view: only 1 run is selected right
  // now, so this click reselects all 3 without touching runView
  await app.clickAllRunsButton();
  await expectDeclinedBenchmarks(page, LINKED_HASH_PAIR_ROWS);

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
  // renders above LinkedHashFirstVsIterNextBenchmark's, but at the default
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
}
