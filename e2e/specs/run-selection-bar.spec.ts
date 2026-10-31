import { expect, test } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';
import { watchDialogsAndErrors } from '../support/page-watchers';

// The run-selection bar with as many runs as the linked-hash-vs-hash fixtures offer: each
// run's button, and the Summary button next to them, have to stay reachable, however
// narrow the window is. Only reachability is checked, not how the bar is laid out.

const RUNS = ['1-thread', '2-threads', '3-threads', '5-threads', '9-threads'].map(
  (threads) => `linked-hash-vs-hash-multiple-benchmarks-${threads}`
);

for (const width of [1280, 900, 600]) {
  test(`every run can be selected with ${RUNS.length} runs loaded in a ${width}px wide window`, async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    await page.setViewportSize({ width, height: 720 });
    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReports(RUNS.map((run) => `${run}.json`));

    const summaryButton = page.locator('button', { hasText: /^Summary$/ });
    for (const run of RUNS) {
      await expect(page.getByRole('button', { name: run, exact: true })).toBeInViewport({ ratio: 1 });
    }
    await expect(summaryButton).toBeInViewport({ ratio: 1 });

    for (const run of RUNS) {
      await app.selectRun(run);
    }

    await app.clickAllRunsButton();
    await expect(page.getByText(/for single run/)).toHaveCount(0);

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
}
