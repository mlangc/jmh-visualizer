import { expect, test } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';
import { watchDialogsAndErrors } from '../support/page-watchers';

// The controls sitting in every chart header and in the sidebar's button group. Sort
// was never clicked at all before this spec; "Show JSON" was only ever asserted to
// exist.
//
// Both live in two places with different reach: the chart header's copy is local state
// in SingleRunBundle, the sidebar's drives `actions.sort`/`actions.logScale` for the
// whole screen. Sorting is also conditional -- BarDataSet only sorts a chart with a
// single bar group, so none of the vendored fixtures can show it (the linked-hash pair
// has one bar per param value, cost-of-alloc-rate-norm is already in score order).
// The bundled example is the only data here that reorders visibly.

/** ListCreationBenchmark's methods in file order, and by descending score (thrpt: more is better). */
const BY_NAME = ['arrayList', 'arrayList_preSized', 'arrayList_preSized_reUsed', 'immutableList'];
const BY_SCORE = ['arrayList_preSized', 'arrayList_preSized_reUsed', 'arrayList', 'immutableList'];
/** NoOpStrategyBenchmark's, likewise -- a second class, to tell the global control from the per-chart one. */
const NO_OP_BY_NAME = ['noOpImplementation', 'nullCheck', 'optional', 'someImplementation'];
const NO_OP_BY_SCORE = ['optional', 'noOpImplementation', 'someImplementation', 'nullCheck'];

test("a chart header's Sort control reorders that chart and no other", async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.loadBundledExample('single');

  await expectBarOrder(app, 'ListCreationBenchmark', BY_NAME);
  await expectBarOrder(app, 'NoOpStrategyBenchmark', NO_OP_BY_NAME);

  await app.toggleSort('ListCreationBenchmark');
  await expectBarOrder(app, 'ListCreationBenchmark', BY_SCORE);
  await expectBarOrder(app, 'NoOpStrategyBenchmark', NO_OP_BY_NAME);

  await app.toggleSort('ListCreationBenchmark');
  await expectBarOrder(app, 'ListCreationBenchmark', BY_NAME);

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("the sidebar's Sort control reorders every chart at once", async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.loadBundledExample('single');
  await expectBarOrder(app, 'ListCreationBenchmark', BY_NAME);

  await app.toggleSortForAllCharts();
  await expectBarOrder(app, 'ListCreationBenchmark', BY_SCORE);
  await expectBarOrder(app, 'NoOpStrategyBenchmark', NO_OP_BY_SCORE);

  await app.toggleSortForAllCharts();
  await expectBarOrder(app, 'ListCreationBenchmark', BY_NAME);
  await expectBarOrder(app, 'NoOpStrategyBenchmark', NO_OP_BY_NAME);

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("Show JSON reveals the benchmark class's raw JMH entries and Collapse hides them again", async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReport('linked-hash-first-vs-iter-next-benchmark.json');

  const json = page.locator('pre');
  // The panel is rendered but collapsed from the start -- react-bootstrap's Collapse
  // keeps its children mounted, so "not shown yet" is hidden, not absent.
  await expect(json).toBeHidden();

  await page.getByRole('button', { name: 'Show JSON' }).click();
  await expect(json).toBeVisible();
  // The bundle's own benchmark entries, not the rendered scores -- and re-serialized
  // by the app (JSON.stringify), so the vendored file's JMH-style `"key" : value`
  // spacing is gone from what the user sees here.
  await expect(json).toContainText('at.mlangc.benchmarks.LinkedHashFirstVsIterNextBenchmark.entryIteratorNext');
  await expect(json).toContainText('"scoreUnit": "s/op"');
  await expect(json).toContainText('"gc.alloc.rate"'); // secondary metrics too, which no chart on this screen shows

  await page.getByRole('button', { name: 'Collapse' }).click();
  await expect(json).toBeHidden();

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

/**
 * The chart's bar categories in render order. recharts emits the y-axis' category
 * labels as plain <text> nodes in that order, so reading them back is how a reordering
 * becomes observable at all -- `toHaveText` on the filtered set pins order and content
 * in one assertion, and auto-retries while the bars animate into their new positions.
 */
async function expectBarOrder(app: JmhApp, className: string, methodNames: string[]): Promise<void> {
  const labels = app.benchmarkSection(className).locator('.recharts-wrapper').first().locator('text');
  await expect(labels.filter({ hasText: /^[a-z]/ })).toHaveText(methodNames);
}
