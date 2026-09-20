import { expect, test } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';
import { watchDialogsAndErrors } from '../support/page-watchers';

// `focusedBundles` is the sidebar eye icon: it narrows the Run screen to the classes
// you pick, and once *more than one* is picked SingleRunView reveals a "Sync Axis
// Scales" toggle that puts every focused chart on a shared x-axis maximum.
//
// None of it is reachable with the vendored fixtures -- each holds exactly one
// benchmark class, so focusing it changes nothing and a second one can never be
// focused. The bundled single-run example's 18 classes are what makes this testable
// without inventing a fixture.

test('focusing classes narrows the report to them', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.loadBundledExample('single');
  await expect(page.locator('.recharts-wrapper')).toHaveCount(18);

  await app.focusBundle('NullIndexBenchmark');
  await expect(page.locator('.recharts-wrapper')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'NullIndexBenchmark' })).toBeVisible();

  await app.focusBundle('QuickBenchmark');
  await expect(page.locator('.recharts-wrapper')).toHaveCount(2);

  // The sidebar keeps listing every class, focused or not -- RunScreen passes the
  // unfiltered bundles there on purpose, so the filter stays reversible.
  await expect(page.locator('ul.nav ul.nav > li')).toHaveCount(18);
  await app.focusBundle('NullIndexBenchmark');
  await app.focusBundle('QuickBenchmark');
  await expect(page.locator('.recharts-wrapper')).toHaveCount(18);

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('the axis-sync toggle appears with two focused classes and puts them on one scale', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.loadBundledExample('single');

  // Both throughput classes, so syncing is possible -- and their maxima differ by an
  // order of magnitude, which is what makes the shared axis visible.
  await app.focusBundle('ListCreationBenchmark');
  await expect(app.axisScalesSyncTooltip()).toHaveCount(0); // one focused class: nothing to sync
  await app.focusBundle('NoOpStrategyBenchmark');

  await expect(app.axisScalesSyncTooltip()).toHaveAttribute('data-tooltip', 'Sync Axis Scales: on');
  // Scoped to the toggle's own tooltip span: page-wide, `getByRole('checkbox')` is
  // unique on master but also matches the filter checkboxes on the filters branch.
  await expect(app.axisScalesSyncTooltip().getByRole('checkbox')).toBeChecked();
  await expectAxisTicks(app, 'ListCreationBenchmark', ['0', '1M', '2M', '3M', '4M']);
  await expectAxisTicks(app, 'NoOpStrategyBenchmark', ['0', '1M', '2M', '3M', '4M']);

  await app.toggleAxisScalesSync();
  await expect(app.axisScalesSyncTooltip()).toHaveAttribute('data-tooltip', 'Sync Axis Scales: off');
  await expect(app.axisScalesSyncTooltip().getByRole('checkbox')).not.toBeChecked();
  await expectAxisTicks(app, 'ListCreationBenchmark', ['0', '1M', '2M', '3M', '4M']);
  await expectAxisTicks(app, 'NoOpStrategyBenchmark', ['0', '50k', '100k', '150k', '200k', '250k', '300k']);

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('classes of different benchmark modes cannot have their axes synced', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.loadBundledExample('single');

  // A throughput class and an average-time one: their scores aren't on comparable
  // axes at all, so SingleRunView disables the toggle and says why.
  await app.focusBundle('ListCreationBenchmark');
  await app.focusBundle('NullIndexBenchmark');

  await expect(app.axisScalesSyncTooltip()).toHaveAttribute(
    'data-tooltip',
    'No Axis Scale syncing possible because of multiple benchmark modes: thrpt,avgt!'
  );
  await expect(app.axisScalesSyncTooltip().getByRole('checkbox')).toBeDisabled();
  await expectAxisTicks(app, 'ListCreationBenchmark', ['0', '1M', '2M', '3M', '4M']);
  await expectAxisTicks(app, 'NullIndexBenchmark', ['0', '50', '100', '150', '200']);

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

/** The chart's x-axis ticks, as charts.js's tickFormatter abbreviates them ('1M', '50k'). */
async function expectAxisTicks(app: JmhApp, className: string, ticks: string[]): Promise<void> {
  const labels = app.benchmarkSection(className).locator('.recharts-wrapper').first().locator('text');
  await expect(labels.filter({ hasText: /^[0-9][0-9.]*[kMG]?$/ })).toHaveText(ticks);
}
