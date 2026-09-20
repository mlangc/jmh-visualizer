import { expect, test } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';
import { watchDialogsAndErrors } from '../support/page-watchers';

// The sidebar's metric dropdown switches the whole Run screen from the primary score
// to a secondary (profiler) metric — `SecondaryMetricExtractor` instead of
// `PrimaryMetricExtractor`, with the bundle list re-filtered to classes that actually
// carry the metric. `RunSideBar` only offers options that start with JMH's '·', so
// none of the vendored fixtures can reach any of this: their JMH wrote 'gc.alloc.rate'
// without the interpunct. The bundled examples were recorded by an older JMH that
// wrote '·gc.alloc.rate', and are the only data here that exercises the path.

test('switching to a secondary metric re-renders the report on that metric', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.loadBundledExample('single');

  const metricPicker = page.locator('select');
  await expect(metricPicker.locator('option')).toHaveText([
    'Score',
    '·gc.alloc.rate',
    '·gc.alloc.rate.norm',
    '·gc.churn.PS_Eden_Space',
    '·gc.churn.PS_Eden_Space.norm',
    '·gc.churn.PS_Survivor_Space',
    '·gc.churn.PS_Survivor_Space.norm',
    '·gc.count',
    '·gc.time'
  ]);
  await expect(page.getByText(/18 different benchmark classes for single run 'run1' and metric 'Score'/)).toBeVisible();

  await app.selectMetric('·gc.alloc.rate');

  // Only 1 of the 18 classes carries this metric, so the report shrinks to it — the
  // bundle filtering, not just the label, has to change for this to pass.
  await expect(
    page.getByText(/1 different benchmark classes for single run 'run1' and metric '·gc.alloc.rate'/)
  ).toBeVisible();
  // The chart header badge comes from MetricType's table, keyed by the same '·' name.
  await expect(page.getByRole('heading').getByText('Allocation Rate')).toBeVisible();
  await expect(page.locator('.recharts-wrapper')).toHaveCount(1);

  await app.selectMetric('Score');
  await expect(page.getByText(/18 different benchmark classes for single run 'run1' and metric 'Score'/)).toBeVisible();

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("secondary metrics written without JMH's interpunct are never offered", async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReport('linked-hash-first-vs-iter-next-benchmark.json');

  // This fixture does carry 4 secondary metrics -- linked-hash-first-vs-iter-next-
  // benchmark.spec.ts asserts the Details screen lists all of them -- but the
  // dropdown offers none of them, because they lack the '·' prefix
  // RunSideBar filters on. Today that leaves the picker *enabled* with a single
  // option, and its "No secondary metrics found!!" hint suppressed — the hint is
  // keyed on the unfiltered metric count, which is 5 here. Pinned as-is: it's the
  // kind of inconsistency a rewrite silently resolves one way or the other.
  const metricPicker = page.locator('select');
  await expect(metricPicker.locator('option')).toHaveText(['Score']);
  await expect(metricPicker).toBeEnabled();
  await expect(page.locator('[data-tooltip="No secondary metrics found!!"]')).toHaveCount(0);

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});
