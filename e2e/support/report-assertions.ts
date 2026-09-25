import { expect, type Page } from '@playwright/test';
import { escapeRegExp } from './regex-util';

/**
 * The 14 checks that characterize a complete single-run report for
 * the `cost-of-alloc-rate-norm-benchmark.json` fixture. Each row is an auto-retrying
 * `toBeVisible()` — never `count()` or `await`-then-`expect` — because
 * recharts animates the bar labels in over ~540ms, so rows 10-12 aren't in
 * the DOM the instant upload/load settles.
 *
 * Called bare (default timeout) by the smoke spec, and with a short
 * `opts.timeout` inside `expect(...).rejects.toThrow()` by the harness spec —
 * same routine, so the falsification checks can't drift from what they guard.
 *
 * `opts.runName` defaults to the file-upload run name; pass the actual run
 * name when loading this same fixture via URL/Gist instead, since those
 * mechanisms name the run differently (full filename incl. extension for a
 * URL, `${gistId}/${filename}` for a Gist — see processParameters.ts).
 */
export async function expectCostOfAllocRateNormReport(
  page: Page,
  opts: { timeout?: number; runName?: string } = {}
): Promise<void> {
  const { runName = 'cost-of-alloc-rate-norm-benchmark', ...waitOpts } = opts;
  const chart = page.locator('.recharts-wrapper');
  const header = page.getByRole('heading', { name: /CostOfAllocRateNormBenchmark/ });

  // 1. "JMH Visualizer" brand
  await expect(page.getByText('JMH Visualizer').first()).toBeVisible(waitOpts);

  // 2. "Show JSON" button
  // .first(): one such button renders per benchmark class (SingleRunBundle.tsx),
  // and the wrong-data harness checks load real reports with many classes —
  // unscoped, this throws a strict-mode violation there instead of rejecting on
  // row 3, the first row that's actually content-specific.
  await expect(page.getByRole('button', { name: 'Show JSON' }).first()).toBeVisible(waitOpts);

  // 3. run-summary line
  await expect(
    page.getByText(
      new RegExp(`different benchmark classes for single run '${escapeRegExp(runName)}' and metric 'Score' detected`)
    )
  ).toBeVisible(waitOpts);

  // 4. "Benchmarks" TOC category
  await expect(page.getByText('Benchmarks', { exact: true })).toBeVisible(waitOpts);

  // 5. class listed in sidebar
  await expect(page.locator('ul.nav ul.nav').getByText('CostOfAllocRateNormBenchmark', { exact: true })).toBeVisible(
    waitOpts
  );

  // 6. metric picker + lone "Score" option
  const metricPicker = page.locator('select');
  await expect(metricPicker).toBeVisible(waitOpts);
  await expect(metricPicker.locator('option')).toHaveText(['Score'], waitOpts);

  // 7. chart <h3> heading
  await expect(header).toBeVisible(waitOpts);

  // 8. "Throughput" mode badge
  await expect(header.getByText('Throughput')).toBeVisible(waitOpts);

  // 9. chart controls Details / Sort / Scale
  await expect(header.locator('[data-tooltip^="Show details"]')).toBeVisible(waitOpts);
  await expect(header.locator('[data-tooltip^="Sort by"]')).toBeVisible(waitOpts);
  await expect(header.locator('[data-tooltip^="Switch scale"]')).toBeVisible(waitOpts);

  // 10. both method names in the chart
  await expect(chart.getByText('randomizeAndCompressIntoNewArrays')).toBeVisible(waitOpts);
  await expect(chart.getByText('randomizeAndCompressReuseData')).toBeVisible(waitOpts);

  // 11. param-value bar group "10000"
  await expect(chart.getByText('10000', { exact: true })).toBeVisible(waitOpts);

  // 12. both score labels, by value: rounded and locale-formatted by util.ts's
  // shouldRound/round/formatNumber (these scores are > 5, so they round), with the
  // unit appended. Pinning the text, not just /ops\/s/, is what makes a migration
  // that changes number formatting or bar scaling fail here instead of passing.
  await expect(chart.getByText('60,050 ops/s', { exact: true })).toBeVisible(waitOpts);
  await expect(chart.getByText('59,689 ops/s', { exact: true })).toBeVisible(waitOpts);
  await expect(chart.getByText(/ops\/s/)).toHaveCount(2, waitOpts);

  // 13. x-axis ticks. recharts picks which ticks exist; charts.ts's own tickFormatter
  // decides they read '10k' rather than '10000'. Pinned deliberately even though a
  // recharts major could move the positions for reasons that aren't regressions —
  // that's a change worth being told about. Row 12 carries the value signal alone.
  for (const tick of ['10k', '60k']) {
    await expect(chart.locator('text', { hasText: new RegExp(`^${tick}$`) })).toBeVisible(waitOpts);
  }

  // 14. "Parameter Names: batchSize" caption
  await expect(page.getByText(/Parameter Names:\s*batchSize/)).toBeVisible(waitOpts);
}
