import { expect, Page } from '@playwright/test';

/**
 * The 13 presence checks that characterize a complete single-run report for
 * the `randomize-rerun.json` fixture. Each row is an auto-retrying
 * `toBeVisible()` — never `count()` or `await`-then-`expect` — because
 * recharts animates the bar labels in over ~540ms, so rows 10-12 aren't in
 * the DOM the instant upload/load settles.
 *
 * Called bare (default timeout) by the smoke spec, and with a short
 * `opts.timeout` inside `expect(...).rejects.toThrow()` by the harness spec
 * (§2 of E2E_POC_PLAN.md) — same routine, so the falsification checks can't
 * drift from what they guard.
 */
export async function expectCompleteSingleRunReport(
  page: Page,
  opts: { timeout?: number } = {},
): Promise<void> {
  const chart = page.locator('.recharts-wrapper');
  const header = page.getByRole('heading', { name: /CostOfAllocRateNormBenchmark/ });

  // 1. "JMH Visualizer" brand
  await expect(page.getByText('JMH Visualizer').first()).toBeVisible(opts);

  // 2. "Show JSON" button
  // .first(): one such button renders per benchmark class (SingleRunBundle.jsx),
  // and the wrong-data harness checks (§2) load real reports with many classes —
  // unscoped, this throws a strict-mode violation there instead of rejecting on
  // row 3, the first row that's actually content-specific.
  await expect(page.getByRole('button', { name: 'Show JSON' }).first()).toBeVisible(opts);

  // 3. run-summary line
  await expect(
    page.getByText(/different benchmark classes for single run 'randomize-rerun' and metric 'Score' detected/),
  ).toBeVisible(opts);

  // 4. "Benchmarks" TOC category
  await expect(page.getByText('Benchmarks', { exact: true })).toBeVisible(opts);

  // 5. class listed in sidebar
  await expect(
    page.locator('ul.nav ul.nav').getByText('CostOfAllocRateNormBenchmark', { exact: true }),
  ).toBeVisible(opts);

  // 6. metric picker + lone "Score" option
  const metricPicker = page.locator('select');
  await expect(metricPicker).toBeVisible(opts);
  await expect(metricPicker.locator('option')).toHaveText(['Score'], opts);

  // 7. chart <h3> heading
  await expect(header).toBeVisible(opts);

  // 8. "Throughput" mode badge
  await expect(header.getByText('Throughput')).toBeVisible(opts);

  // 9. chart controls Details / Sort / Scale
  await expect(header.locator('[data-tooltip^="Show details"]')).toBeVisible(opts);
  await expect(header.locator('[data-tooltip^="Sort by"]')).toBeVisible(opts);
  await expect(header.locator('[data-tooltip^="Switch scale"]')).toBeVisible(opts);

  // 10. both method names in the chart
  await expect(chart.getByText('randomizeAndCompressIntoNewArrays')).toBeVisible(opts);
  await expect(chart.getByText('randomizeAndCompressReuseData')).toBeVisible(opts);

  // 11. param-value bar group "10000"
  await expect(chart.getByText('10000', { exact: true })).toBeVisible(opts);

  // 12. a score label carries the unit (unit only, never the number) — both
  // bars get one, so assert the count rather than just .first() being visible
  await expect(chart.getByText(/ops\/s/)).toHaveCount(2, opts);

  // 13. "Parameter Names: batchSize" caption
  await expect(page.getByText(/Parameter Names:\s*batchSize/)).toBeVisible(opts);
}
