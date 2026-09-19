import { expect, type Page } from '@playwright/test';
import { JmhApp } from './jmh-app';

const CLASS_NAME = 'LinkedHashFirstVsIterNextBenchmark';

export async function expectFiltersBeingPresent(page: Page, opts: { timeout?: number } = {}): Promise<void> {
  await expect(page.getByRole('checkbox', { name: 'entryIteratorNext', exact: true })).toHaveCount(1, opts);
  await expect(page.getByRole('checkbox', { name: 'firstEntry', exact: true })).toHaveCount(1, opts);
  await expect(page.getByRole('checkbox', { name: '10', exact: true })).toHaveCount(2, opts);
  await expect(page.getByRole('checkbox', { name: '100', exact: true })).toHaveCount(2, opts);
}

export async function expectBenchmarkFiltersHavingAnEffect(page: Page, opts: { timeout?: number } = {}): Promise<void> {
  const app = new JmhApp(page);
  const chart = page.locator('.recharts-wrapper');

  for (const name of ['entryIteratorNext', 'firstEntry']) {
    await app.benchmarkFilter(CLASS_NAME, name).click(opts);
    await expect(chart.getByText(name, { exact: true })).toBeHidden(opts);
    await app.benchmarkFilter(CLASS_NAME, name).click(opts);
    await expect(chart.getByText(name, { exact: true })).toBeVisible(opts);
  }

  await app.benchmarkFilter(CLASS_NAME, 'entryIteratorNext').dblclick(opts);
  await expect(chart.getByText('firstEntry', { exact: true })).toBeHidden(opts);
  await app.benchmarkFilter(CLASS_NAME, 'firstEntry').dblclick(opts);
  await expect(chart.getByText('entryIteratorNext', { exact: true })).toBeHidden(opts);
  await app.benchmarkFilter(CLASS_NAME, 'entryIteratorNext').click(opts);
  await expect(chart.getByText('entryIteratorNext', { exact: true })).toBeVisible(opts);

  await app.benchmarkFilter(CLASS_NAME, 'firstEntry', 'size', '10').click(opts);
  await expect(chart.getByText('1.6888394101249562e-9')).toBeHidden(opts);
  await app.benchmarkFilter(CLASS_NAME, 'firstEntry', 'size', '10').click(opts);
  await expect(chart.getByText('1.6888394101249562e-9')).toBeVisible(opts);

  await app.benchmarkFilter(CLASS_NAME, 'entryIteratorNext', 'size', '10').dblclick(opts);
  await expect(chart.getByText('8.664407435614395e-10')).toBeHidden(opts);
  await expect(chart.getByText('7.949607915875453e-10')).toBeVisible(opts);
  await app.benchmarkFilter(CLASS_NAME, 'entryIteratorNext', 'size', '100').dblclick(opts);
  await expect(chart.getByText('8.664407435614395e-10')).toBeVisible(opts);
  await expect(chart.getByText('7.949607915875453e-10')).toBeHidden(opts);

  await app.benchmarkFilter(CLASS_NAME, 'entryIteratorNext', 'size').dblclick(opts);
  await expect(chart.getByText('8.664407435614395e-10')).toBeVisible(opts);
  await expect(chart.getByText('7.949607915875453e-10')).toBeVisible(opts);
}
