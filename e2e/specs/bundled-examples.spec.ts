import { expect, test } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';
import { watchDialogsAndErrors } from '../support/page-watchers';
import { expectSummaryHeader } from '../support/summary-header-assertions';

// The three bundled examples (exampleBenchmark{1,2,3}.js) are app source the migration
// will port, and they are the only data in this repo that is *broad*: 18-19 benchmark
// classes, two benchmark modes and five score units in a single report, 1-3 parameter
// benchmarks, and classes that exist in one run but not another. Until now they were
// used only as negative data in harness.spec.ts ("this report is NOT the fixture"),
// so nothing pinned what they actually render.
//
// Deliberately structural: counts, modes, units, run names, table sizes — not 99 rows
// of scores. The vendored fixtures cover exact values (report-assertions.ts).

test('the single-run example renders every benchmark class in the report', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.loadBundledExample('single');

  await expect(page.getByText(/18 different benchmark classes for single run 'run1' and metric 'Score'/)).toBeVisible();
  await expect(page.locator('ul.nav ul.nav > li')).toHaveCount(18);
  await expect(page.locator('.recharts-wrapper')).toHaveCount(18);
  for (const className of ['ListCreationBenchmark', 'ThreeParamsMultiMethodBenchmark', 'QuickBenchmark']) {
    await expect(page.locator('ul.nav ul.nav').getByText(className, { exact: true })).toBeVisible();
  }

  // Two benchmark modes in one report — the fixtures only ever hold one each.
  await expect(page.getByRole('heading', { name: /ListCreationBenchmark/ }).getByText('Throughput')).toBeVisible();
  await expect(page.getByRole('heading', { name: /AvgTimeBenchmark/ }).getByText('Average Time')).toBeVisible();

  // ...and five score units, each formatted onto its own bars.
  const chartLabels = page.locator('.recharts-wrapper text');
  for (const unit of ['ops/s', 'ops/ms', 'ops/us', 'us/op', 'ms/op']) {
    await expect(chartLabels.filter({ hasText: new RegExp(`\\s${unit.replace('/', '\\/')}$`) }).first()).toBeVisible();
  }

  // Parameterized benchmarks group their bars by param value.
  for (const category of ['a_milis =10', 'a_milis =20']) {
    await expect(chartLabels.filter({ hasText: new RegExp(`^${category}$`) }).first()).toBeVisible();
  }

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('the two-runs example opens on a Summary comparing both runs', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.loadBundledExample('two');

  // 19 classes is the union of both runs — more than the 18 either run holds alone.
  await expectSummaryHeader(page, { results: 95, benchmarkClasses: 19, runName1: 'run1', runName2: 'run2' });
  for (const table of ['Improved Benchmarks (14)', 'Declined Benchmarks (2)', 'Unchanged Benchmarks (79)']) {
    await expect(page.getByRole('heading', { name: table, exact: true })).toBeVisible();
  }

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('the multi-run example offers all three runs and compares the last two', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.loadBundledExample('multi');

  for (const runName of ['run1', 'run2', 'run3']) {
    await expect(page.getByRole('button', { name: runName, exact: true })).toBeVisible();
  }
  for (const table of ['Improved Benchmarks (2)', 'Unchanged Benchmarks (96)']) {
    await expect(page.getByRole('heading', { name: table, exact: true })).toBeVisible();
  }
  // Nothing declined between run2 and run3, so SummaryTable renders no such heading.
  await expect(page.getByRole('heading', { name: /^Declined Benchmarks/ })).toHaveCount(0);
  // The header sentence naming run2 and run3 (rather than run1) is pinned once, on
  // the fixtures, in summary-header.spec.ts -- it needs an app fix older builds lack,
  // and one @needs-fix-tagged test per fix is enough.

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});
