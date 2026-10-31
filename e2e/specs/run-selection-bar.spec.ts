import { expect, test } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';
import { watchDialogsAndErrors } from '../support/page-watchers';

// The run-selection bar with as many runs as the linked-hash-vs-hash fixtures offer: each
// run's button, and the Summary button next to them, have to stay reachable in windows
// down to 600px wide. Their run names are long and differ only at the end, which is what
// crowds the bar. Only reachability is checked, not how the bar is laid out.

const RUNS = [
  'linked-hash-vs-hash-multiple-benchmarks-1-thread',
  'linked-hash-vs-hash-multiple-benchmarks-2-threads',
  'linked-hash-vs-hash-multiple-benchmarks-3-threads',
  'linked-hash-vs-hash-multiple-benchmarks-5-threads',
  'linked-hash-vs-hash-multiple-benchmarks-9-threads'
];

// Not 1: on master, where the bar wraps, Bootstrap 3's -1px margin pulls the first button of a
// row 1px out of the window
const MOSTLY = 0.99;

for (const width of [1280, 900, 600]) {
  test(`every run can be selected with ${RUNS.length} runs loaded in a ${width}px wide window`, async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    await page.setViewportSize({ width, height: 720 });
    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReports(RUNS.map((run) => `${run}.json`));

    for (const run of RUNS) {
      await expect(app.runButton(run)).toBeInViewport({ ratio: MOSTLY });
    }
    await expect(app.allRunsButton()).toBeInViewport({ ratio: MOSTLY });
    // The Summary button's caret, the bar's rightmost element, has no text to find it by
    await expect(app.allRunsButton().locator('xpath=following-sibling::button')).toBeInViewport({ ratio: MOSTLY });

    for (const run of RUNS) {
      await app.selectRun(run);
    }

    await app.clickAllRunsButton();
    await expect(page.getByText(/Ignoring deviations below/)).toBeVisible();
    await expect(page.getByText(/for single run/)).toHaveCount(0);

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
}
