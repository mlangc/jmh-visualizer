import { expect, type Page } from '@playwright/test';
import { JmhApp } from './jmh-app';

export type BundledExample = 'single' | 'two' | 'multi';

/**
 * Asserts that a bundled example is on screen, going by what the example renders
 * (charts, tables, run buttons) rather than by the summary sentences, so it holds
 * however those are worded. The shapes differ per example: the single-run example
 * opens on its 18 charts, the other two on a Summary whose tables tell them apart.
 */
export async function expectBundledExampleLoaded(
  page: Page,
  kind: BundledExample,
  opts: { timeout?: number } = {}
): Promise<void> {
  switch (kind) {
    case 'single':
      await expect(new JmhApp(page).benchmarkSection('QuickBenchmark')).toBeVisible(opts);
      await expect(page.locator('.recharts-wrapper')).toHaveCount(18, opts);
      return;
    case 'two':
      await expectSummaryTables(
        page,
        ['Improved Benchmarks (14)', 'Declined Benchmarks (2)', 'Unchanged Benchmarks (79)'],
        opts
      );
      return;
    case 'multi':
      for (const runName of ['run1', 'run2', 'run3']) {
        await expect(page.getByRole('button', { name: runName, exact: true })).toBeVisible(opts);
      }
      await expectSummaryTables(page, ['Improved Benchmarks (2)', 'Unchanged Benchmarks (96)'], opts);
      return;
  }
}

async function expectSummaryTables(page: Page, headings: string[], opts: { timeout?: number }): Promise<void> {
  for (const heading of headings) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible(opts);
  }
}
