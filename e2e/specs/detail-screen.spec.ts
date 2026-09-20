import { expect, test } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';
import { watchDialogsAndErrors } from '../support/page-watchers';

// The Details screen below its metric list. `linked-hash-first-vs-iter-next-
// benchmark.spec.ts` gets as far as the metric names in the nav and the "Back.." link;
// everything the screen actually draws -- a chart per metric, each with its own
// extractor and unit -- plus the sidebar's class chooser, its Sort/Scale controls and
// the "no results" branch were uncovered.
//
// Also the browser's own Back/Forward, which is the entire reason `store.js` registers
// a `history.listen` POP handler: only the in-app "Back.." link was ever exercised.

test('the Details screen draws a chart per metric, each in its own unit', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReport('linked-hash-first-vs-iter-next-benchmark.json');
  await app.showDetails();

  await expect(page.getByRole('heading', { name: /Details of .*LinkedHashFirstVsIterNextBenchmark/ })).toBeVisible();
  // Score plus the fixture's 4 secondary metrics -- DetailView renders one section per
  // metric, and the same numbers no other screen shows: the Run screen's dropdown
  // can't reach these (their names lack JMH's '·' prefix, see secondary-metrics.spec.ts).
  await expect(page.locator('.recharts-wrapper')).toHaveCount(5);
  //
  // Each heading is "<metric> <badge>", and every secondary badge here repeats the
  // metric name: MetricType keys its display names by JMH's '\u00b7'-prefixed spelling, which
  // this fixture doesn't use, so getMetricType falls back to the raw key.
  for (const [heading, label] of [
    ['Score Average Time', '7.949607915875453e-10 s/op'],
    ['gc.alloc.rate gc.alloc.rate', '13,549 MB/sec'],
    ['gc.alloc.rate.norm gc.alloc.rate.norm', '0.00001101649961041975 B/op'],
    ['gc.count gc.count', '40 counts'],
    ['gc.time gc.time', '17 ms']
  ]) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    // Scoped to that metric's own section: which chart carries the value is the point,
    // and the same figure can well show up under another metric too.
    await expect(app.benchmarkSection(heading).getByText(label, { exact: true })).toBeVisible();
  }

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('the Details sidebar switches class, sorts and rescales every chart, and keeps its metric list', async ({
  page
}) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.loadBundledExample('single');
  await app.showDetailsFromSidebar('ListCreationBenchmark');
  await expect(page.locator('.recharts-wrapper')).toHaveCount(9); // Score + 8 '·gc.*' metrics

  // The sidebar's Sort control, which reaches every metric's chart at once -- and each
  // sorts in its own direction, since BarDataSet keys that on MetricType's
  // `increaseIsGood`: more throughput is better, less allocation is. This screen is the
  // only place two metric types are charted side by side, so it is the only place that
  // difference is observable.
  const methodOrder = (metricHeading: string) =>
    app
      .benchmarkSection(metricHeading)
      .locator('.recharts-wrapper')
      .first()
      .locator('text')
      .filter({ hasText: /^(arrayList|immutableList)/ });
  const BY_NAME = ['arrayList', 'arrayList_preSized', 'arrayList_preSized_reUsed', 'immutableList'];
  await expect(methodOrder('Score')).toHaveText(BY_NAME);
  await expect(methodOrder('·gc.alloc.rate')).toHaveText(BY_NAME);

  await app.toggleSortForAllCharts();
  await expect(methodOrder('Score')).toHaveText([
    'arrayList_preSized',
    'arrayList_preSized_reUsed',
    'arrayList',
    'immutableList'
  ]); // descending score
  await expect(methodOrder('·gc.alloc.rate')).toHaveText([
    'arrayList',
    'arrayList_preSized_reUsed',
    'immutableList',
    'arrayList_preSized'
  ]); // ascending allocation rate
  await app.toggleSortForAllCharts();
  await expect(methodOrder('Score')).toHaveText(BY_NAME);

  // Switching class without leaving the screen -- DetailSideBar's <select>, which is
  // the only way to get from one class's details to another's.
  await app.selectDetailedBenchmarkClass('NullIndexBenchmark');
  await expect(page.locator('.recharts-wrapper')).toHaveCount(1); // this class carries no secondary metrics
  await expect(page.getByText('162 ms/op', { exact: true })).toBeVisible();

  // The sidebar's own Scale control, which applies to the whole screen (the Details
  // screen has no per-chart headers of its own).
  const axisTicks = page
    .locator('.recharts-wrapper')
    .first()
    .locator('text')
    .filter({ hasText: /^[0-9][0-9.]*$/ });
  await expect(axisTicks).toHaveText(['0', '50', '100', '150', '200']);
  await app.toggleScaleForAllCharts();
  await expect(axisTicks).toHaveText(['30', '40', '50', '60', '70', '80', '90', '100', '200']);
  await app.toggleScaleForAllCharts();
  await expect(axisTicks).toHaveText(['0', '50', '100', '150', '200']);
  await expect(page.locator('[data-tooltip^="Sort by"]')).toHaveCount(1);

  // The "Metrics" category link. TocList wires it to `actions.selectCategory`; the
  // Details screen hardcodes its own active category, so clicking it changes nothing
  // here (it does clear the Run screen's `focusedBundles` behind the scenes) and must
  // above all not blank the list out.
  await page.getByText('Metrics', { exact: true }).click();
  await expect(page.locator('ul.nav ul.nav').getByText('Score', { exact: true })).toBeVisible();
  await expect(page.locator('.recharts-wrapper')).toHaveCount(1);

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('detailing a class that the selected run never ran says so', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  // RemovedBenchmark exists in run1 only, so narrowing to run2 leaves its bundle with
  // no methods at all -- the one way into DetailScreen's error branch, and example-only
  // (the vendored fixtures' runs all hold the same class).
  await app.loadBundledExample('multi');
  await app.clickAllRunsButton(); // Summary -> Compare, where every class has a chart
  await app.showDetailsFromSidebar('RemovedBenchmark');
  await expect(page.locator('.recharts-wrapper')).toHaveCount(1);

  await page.getByRole('button', { name: 'run2', exact: true }).click();
  await expect(page.getByText('No benchmark results for run run2')).toBeVisible();
  await expect(page.locator('.recharts-wrapper')).toHaveCount(0);
  // Still the Details screen, so the way out is still there.
  await expect(page.getByText('Back..')).toBeVisible();

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('the browser Back button leaves the Details screen, and Forward does not return to it', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReport('linked-hash-first-vs-iter-next-benchmark.json');

  await app.showDetails();
  await expect(page).toHaveURL(/#details$/); // `detailBenchmarkBundle` pushes this

  await page.goBack();
  await expect(page.getByText('Back..')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /LinkedHashFirstVsIterNextBenchmark/ })).toBeVisible();
  await expect(page).not.toHaveURL(/#details$/);

  // Forward puts `#details` back in the address bar but not the screen: store.js's
  // history listener undetails on *any* POP, which Forward is too. Pinned as the
  // behaviour that exists, not as the behaviour one would want.
  await page.goForward();
  await expect(page).toHaveURL(/#details$/);
  await expect(page.getByText('Back..')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /LinkedHashFirstVsIterNextBenchmark/ })).toBeVisible();

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});
