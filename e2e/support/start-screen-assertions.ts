import { expect, Page } from '@playwright/test';

/**
 * The presence checks that characterize the empty upload/start screen --
 * shown both on a fresh page load (no benchmarks provided) and after
 * "Reset & Upload New". Shared between a dedicated start-page spec and the
 * post-reset check at the end of the multi-run spec, since those two paths
 * are driven by genuinely different code that only coincidentally produces
 * the same screen today.
 */
export async function expectStartScreen(
  page: Page,
  opts: { timeout?: number } = {},
): Promise<void> {
  await expect(page.getByText('JMH Visualizer').first()).toBeVisible(opts);
  await expect(page.getByRole('heading', { name: 'Dropzone' })).toBeVisible(opts);
  await expect(page.getByText('Drop your JMH JSON report file(s) here!')).toBeVisible(opts);
  await expect(page.locator('div.btn', { hasText: 'Open File Dialog' })).toBeVisible(opts);

  for (const label of [
    'Load Single Run Example',
    'Load Two Runs Example',
    'Load Multi Run Example',
    'Load from URL(s)',
    'Load from Gist(s)',
  ]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible(opts);
  }
}
