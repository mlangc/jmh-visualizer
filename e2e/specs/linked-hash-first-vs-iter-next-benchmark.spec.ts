import { expect, test } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';

// The suite's first interaction-driven spec: beyond static presence, it
// drives the scale toggle and the details/back navigation and checks their
// effects. Uses this fixture (not cost-of-alloc-rate-norm-benchmark.json)
// because it has populated secondaryMetrics (gc.* profiling data) to exercise
// the Details screen with.
test('linked-hash-first-vs-iter-next-benchmark.json supports scale toggle and details/back navigation', async ({ page }) => {
  // collect dialogs (a JMH parse failure calls window.alert) and dismiss them;
  // assert none fired after each interaction
  const dialogs: string[] = [];
  page.on('dialog', async (d) => {
    dialogs.push(d.message());
    await d.dismiss();
  });

  // collect uncaught exceptions triggered by the interactions below. Not also
  // collecting console errors: the app already emits unrelated unknown-prop
  // warnings (e.g. TocLink's prop spread), so a blanket console-error
  // assertion would be noise, not signal.
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReport('linked-hash-first-vs-iter-next-benchmark.json');

  const chart = page.locator('.recharts-wrapper');
  const header = page.getByRole('heading', { name: /LinkedHashFirstVsIterNextBenchmark/ });

  // initial render: benchmark class, mode badge, both methods
  await expect(page.locator('ul.nav ul.nav').getByText('LinkedHashFirstVsIterNextBenchmark', { exact: true })).toBeVisible();
  await expect(header).toBeVisible();
  await expect(header.getByText('Average Time')).toBeVisible();
  await expect(chart.getByText('entryIteratorNext')).toBeVisible();
  await expect(chart.getByText('firstEntry')).toBeVisible();

  // wait for the bar labels to finish animating in (~540ms) before taking the
  // pre-toggle baseline below — an early baseline would make the post-toggle
  // diff trivially true (labels absent vs present) rather than a real
  // linear-vs-log scale comparison
  // 4, not 2: this fixture has 2 param values (size=10/100) per method, so
  // each of the 2 methods renders as 2 bars — one label per bar
  await expect(chart.getByText(/s\/op/)).toHaveCount(4);

  // Switch scale (log/linear): assert the chart actually changes and nothing errors
  const beforeScale = await chart.textContent();
  await app.toggleScale();
  await expect(async () => {
    expect(await chart.textContent()).not.toBe(beforeScale);
  }).toPass();
  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);

  // Show details: navigate to the per-metric Details screen and check the
  // fixture's secondary GC metrics are all listed (firstEntry contributes
  // gc.time; entryIteratorNext doesn't, so this also proves the union across
  // both methods is shown, not just one method's metrics)
  await app.showDetails();
  await expect(page.getByRole('heading', { name: /Details of/ })).toBeVisible();
  const metricsNav = page.locator('ul.nav ul.nav');
  for (const metric of ['Score', 'gc.alloc.rate', 'gc.alloc.rate.norm', 'gc.count', 'gc.time']) {
    await expect(metricsNav.getByText(metric, { exact: true })).toBeVisible();
  }

  // Back: confirm we're back on the original report screen
  await app.goBack();
  await expect(page.getByText('Back..')).toHaveCount(0);
  await expect(page.locator('ul.nav ul.nav').getByText('LinkedHashFirstVsIterNextBenchmark', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading').locator('[data-tooltip^="Show details"]')).toBeVisible();

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});
