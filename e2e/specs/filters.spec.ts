import { expect, test } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';
import { watchDialogsAndErrors } from '../support/page-watchers';
import { expectDeclinedBenchmarks, LINKED_HASH_PAIR_ROWS } from '../support/summary-comparison-assertions';

// The filter checkboxes beyond what `linked-hash-first-vs-iter-next-benchmark.spec.ts`
// already covers, which is single-run, single-class, sidebar-only. Everything here is
// `@filters`-tagged and only runs against a build of
// `add-filters-for-large-result-files` (see INCLUDE_FILTERS in CLAUDE.md).
//
// Mostly about the states the filters can put the *rest* of the app into: an empty
// bundle reaching the chart views, the Details screen, the two-run Compare screen, and
// the Summary screen that ignores the filters altogether.

const LINKED_HASH = 'LinkedHashFirstVsIterNextBenchmark';
const COST_OF_ALLOC = 'CostOfAllocRateNormBenchmark';
const LINKED_HASH_PAIR = [
  'linked-hash-first-vs-iter-next-benchmark.json',
  'linked-hash-first-vs-iter-next-on-battery-benchmark.json'
];

test('deselecting every method of the only class empties the report without breaking it', { tag: '@filters' }, async ({
  page
}) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  // A single-class fixture on purpose: with the 18-class example you can empty one
  // bundle but never reach zero, and zero bundles reaching SingleRunView is the state
  // that matters -- `BarDataSet` reads `benchmarkMethods[0]` unconditionally, and
  // there is no error boundary, so anything that let an empty bundle through would
  // blank the page out instead.
  await app.uploadReport('linked-hash-first-vs-iter-next-benchmark.json');
  await app.benchmarkFilter(LINKED_HASH, 'entryIteratorNext').click();
  await app.benchmarkFilter(LINKED_HASH, 'firstEntry').click();

  await expect(page.getByText(/^0 different benchmark classes for single run/)).toBeVisible();
  await expect(page.locator('.recharts-wrapper')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show JSON' })).toHaveCount(0);

  // The sidebar still lists the class and both methods -- RunScreen hands it the
  // unfiltered bundles, which is the only thing that makes this recoverable.
  await expect(page.locator('ul.nav ul.nav > li')).toHaveCount(1);
  await app.benchmarkFilter(LINKED_HASH, 'firstEntry').click();
  await expect(page.locator('.recharts-wrapper')).toHaveCount(1);
  await expect(page.getByText(/^1 different benchmark classes for single run/)).toBeVisible();

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('a param value whose method has none left is refused', { tag: '@filters' }, async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReport('linked-hash-first-vs-iter-next-benchmark.json');
  const chart = page.locator('.recharts-wrapper').first();
  const sizeTen = app.benchmarkFilter(LINKED_HASH, 'firstEntry', 'size', '10');
  const sizeHundred = app.benchmarkFilter(LINKED_HASH, 'firstEntry', 'size', '100');
  // Let the bar labels finish animating in (~540ms) before touching anything: a
  // re-render mid-animation drops them for good, which would make the assertions below
  // pass or fail for the wrong reason.
  await expect(chart.getByText(/s\/op/)).toHaveCount(4);

  await sizeTen.click();
  await expect(sizeTen).not.toBeChecked();
  // Wait the labels out again before the next click, and get the assertion for free:
  // firstEntry keeps one bar, entryIteratorNext both.
  await expect(chart.getByText(/s\/op/)).toHaveCount(3);
  await expect(chart.getByText('1.6888394101249562e-9 s/op')).toHaveCount(0);

  // `toggleParamValue` returns {} rather than hiding firstEntry's last instance, so
  // the checkbox stays checked and the chart doesn't move. The user gets no feedback
  // at all -- which is exactly the kind of silent no-op a rewrite would "simplify".
  await sizeHundred.click();
  await expect(sizeHundred).toBeChecked();
  await expect(sizeTen).not.toBeChecked();
  await expect(chart.getByText(/s\/op/)).toHaveCount(3);
  await expect(chart.getByText('1.816618712295571e-9 s/op')).toBeVisible();
  await expect(chart.getByText('firstEntry', { exact: true })).toBeVisible();

  // Unchecking the *method* is not refused, though -- only the param-value actions
  // carry that guard.
  await app.benchmarkFilter(LINKED_HASH, 'firstEntry').click();
  await expect(chart.getByText('firstEntry', { exact: true })).toBeHidden();

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('the Details screen filters too, down to having nothing left to show', { tag: '@filters' }, async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReport('linked-hash-first-vs-iter-next-benchmark.json');
  await app.showDetails();
  await expect(page.locator('.recharts-wrapper')).toHaveCount(5); // Score + 4 secondary metrics

  // DetailSideBar carries its own copy of the checkbox tree, over the *unfiltered*
  // bundle, so it stays usable no matter what is deselected.
  const firstEntry = page.getByRole('checkbox', { name: 'firstEntry', exact: true });
  await firstEntry.click();
  // gc.time comes from firstEntry alone, so its whole section goes with it.
  await expect(page.locator('.recharts-wrapper')).toHaveCount(4);
  await expect(page.getByRole('heading', { name: 'gc.time gc.time' })).toHaveCount(0);

  await page.getByRole('checkbox', { name: 'entryIteratorNext', exact: true }).click();
  // A different message from the "No benchmark results for run X" of an empty run:
  // the data is there, the filters are hiding it.
  await expect(page.getByText('All benchmark methods are filtered out')).toBeVisible();
  await expect(page.locator('.recharts-wrapper')).toHaveCount(0);

  await firstEntry.click();
  // firstEntry alone still carries every one of this fixture's secondary metrics, so
  // all 5 sections come back -- only entryIteratorNext's bars are missing from them.
  await expect(page.locator('.recharts-wrapper')).toHaveCount(5);
  await expect(page.getByRole('heading', { name: 'gc.time gc.time' })).toBeVisible();

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('filters reach the two-run Compare screen but not the Summary', { tag: '@filters' }, async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReports(LINKED_HASH_PAIR);
  // The Summary screen has no filter controls at all: SummaryScreen hands RunSideBar
  // an empty bundle list.
  await expect(page.getByRole('checkbox')).toHaveCount(0);

  await app.clickAllRunsButton(); // both runs selected -> Summary becomes Compare
  const chart = page.locator('.recharts-wrapper').first();
  const categories = chart.locator('text').filter({ hasText: /\[size=/ });
  await expect(categories).toHaveText([
    'entryIteratorNext[size=10]',
    'entryIteratorNext[size=100]',
    'firstEntry[size=10]',
    'firstEntry[size=100]'
  ]);

  // `deselectedMethods` is global state RunScreen applies for any run count, so the
  // diff chart loses the method just like a single-run chart would.
  await app.benchmarkFilter(LINKED_HASH, 'firstEntry').click();
  await expect(categories).toHaveText(['entryIteratorNext[size=10]', 'entryIteratorNext[size=100]']);
  await expect(chart.getByText('-48.6616917209557')).toBeHidden();

  await app.benchmarkFilter(LINKED_HASH, 'entryIteratorNext', 'size', '10').click();
  await expect(categories).toHaveText(['entryIteratorNext[size=100]']);

  // ...and the Summary screen ignores all of it -- it never filters, so the tables
  // still compare all 4 method/param combinations.
  await app.clickAllRunsButton();
  await expectDeclinedBenchmarks(page, LINKED_HASH_PAIR_ROWS);

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('double-clicking a class re-selects all of its methods', { tag: '@filters' }, async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReport('linked-hash-first-vs-iter-next-benchmark.json');
  const classLink = app.benchmarkClassLink(LINKED_HASH);
  const chart = page.locator('.recharts-wrapper').first();
  await expect(chart.getByText(/s\/op/)).toHaveCount(4); // as above: don't interrupt the label animation

  // The gesture is offered only when it would do something: with nothing deselected
  // there is no hint on the class row, only the per-method "select only this" ones.
  await expect(page.locator('[data-tooltip="Double-click to select all methods"]')).toHaveCount(0);

  await app.benchmarkFilter(LINKED_HASH, 'firstEntry').click();
  await expect(chart.getByText('firstEntry', { exact: true })).toBeHidden();
  // The hint lives on the Tooltipped <span> wrapping the class link, so assert it
  // carries this class's name rather than looking for the attribute on the link.
  await expect(page.locator('[data-tooltip="Double-click to select all methods"]')).toHaveText(LINKED_HASH);

  await classLink.dblclick();
  await expect(chart.getByText('firstEntry', { exact: true })).toBeVisible();
  await expect(chart.getByText('entryIteratorNext', { exact: true })).toBeVisible();
  await expect(page.locator('[data-tooltip="Double-click to select all methods"]')).toHaveCount(0);

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('a param with a single value is shown as fixed, not as a filter', { tag: '@filters' }, async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  // cost-of-alloc-rate-norm's `batchSize` has exactly one value -- the only such
  // parameter in the repo, since every parameter in the bundled examples has two or
  // more.
  await app.uploadReport('cost-of-alloc-rate-norm-benchmark.json');

  for (const method of ['randomizeAndCompressIntoNewArrays', 'randomizeAndCompressReuseData']) {
    const batchSize = app.benchmarkFilter(COST_OF_ALLOC, method, 'batchSize', '10000');
    await expect(batchSize).toBeChecked();
    await expect(batchSize).toBeDisabled();
  }

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});
