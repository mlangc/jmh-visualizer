import { expect, type Locator, type Page, test } from '@playwright/test';
import { JmhApp } from '../support/jmh-app';
import { watchDialogsAndErrors } from '../support/page-watchers';
import { escapeRegExp } from '../support/regex-util';
import { Tags } from '../support/tags';

// The sidebar's list scrolling on its own below a fixed header, and the charts
// scrolling it to the method a click lands on (plans/2026-10-20-SCROLLABLE-SIDEBAR-PLAN.md).
// Everything here is `@scrolling-enhancements`-tagged (see INCLUDE_SCROLLING_ENHANCEMENTS
// in CLAUDE.md).
//
// Runs on the linked-hash-vs-hash fixtures: one class with 7 methods and 64 results,
// run with 1, 2 and 3 threads. Their method and param checkboxes overflow the suite's
// 1280x720 window on every screen, the Details screen included, which is what the
// scrolling needs; the bundled examples spread their methods over 18 classes instead.
// The one spec that needs a list that fits uses the small linked-hash fixture.

const CLASS_NAME = 'HashVsLinkedHashMapBenchmark';
const ONE_THREAD = 'linked-hash-vs-hash-multiple-benchmarks-1-thread.json';
const TWO_THREADS = 'linked-hash-vs-hash-multiple-benchmarks-2-threads.json';
const THREE_THREADS = 'linked-hash-vs-hash-multiple-benchmarks-3-threads.json';
const METHODS = [
  'accumulateAndCopyToArray',
  'copyToArray',
  'get',
  'getAnyEntry',
  'getAnyEntryUsingIteratorNext',
  'merge',
  'put'
] as const;
const METRIC_HEADINGS = [
  'Score Throughput',
  'gc.alloc.rate gc.alloc.rate',
  'gc.alloc.rate.norm gc.alloc.rate.norm',
  'gc.count gc.count',
  'gc.time gc.time'
];

// The two-run rows and the multi-run lines are one per method and param combination,
// named after BenchmarkMethod's key
const GET_KEY = 'get [impl=HASH:keySpread=1.5:loadFactor=0.5:size=50000]';
const MERGE_KEY = 'merge [impl=LINKED:keySpread=5:size=5]';
const COPY_TO_ARRAY_KEY = 'copyToArray [impl=LINKED:loadFactor=0.75:size=50000]';
const PUT_KEY = 'put [impl=LINKED:keySpread=1.5:loadFactor=0.75:size=5]';
// The first row of the two-run chart, and the label at the end of its bar
const FIRST_KEY = 'accumulateAndCopyToArray [impl=HASH:keySpread=1.05:size=5]';
const FIRST_KEY_BAR_LABEL = '93';

// Scrolls are allowed to animate, and layout rounds to fractions of a pixel
const TOLERANCE_PX = 2;

test.describe('the sidebar list', { tag: Tags.ScrollingEnhancements }, () => {
  test('scrolls on its own below a header that stays put', async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReport(ONE_THREAD);

    const list = app.sidebarList();
    expect((await scrollState(list)).maxScrollTop).toBeGreaterThan(0);
    await expectRunSidebarHeaderInViewport(page);
    await expect(list).toBeInViewport({ ratio: 1 });

    // A wheel over the list scrolls the list, down to its end, but never the report
    await wheelOver(page, list, 100_000);
    await expect.poll(async () => isScrolledToEnd(list)).toBe(true);
    await expect(list.getByRole('checkbox').last()).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expectRunSidebarHeaderInViewport(page);

    await wheelOver(page, list, -100_000);
    await expect.poll(async () => (await scrollState(list)).scrollTop).toBe(0);
    await expect(app.benchmarkClassLink(CLASS_NAME)).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('stays reachable however far the report is scrolled, the window resized or the report shortened', async ({
    page
  }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReport(ONE_THREAD);

    await expectWholeRunSidebarReachable(page, app);
    await scrollReportTo(page, 'middle');
    await expectWholeRunSidebarReachable(page, app);
    await scrollReportTo(page, 'bottom');
    await expectWholeRunSidebarReachable(page, app);

    for (const size of [
      { width: 1280, height: 480 },
      { width: 1000, height: 900 }
    ]) {
      await page.setViewportSize(size);
      await scrollReportTo(page, 'bottom');
      await expectWholeRunSidebarReachable(page, app);
    }
    await page.setViewportSize({ width: 1280, height: 720 });

    // Shorten the report to a single method, from the bottom of the report: the
    // sidebar is then taller than the report, and the page scrolls back up under it
    for (const methodName of METHODS.slice(1)) {
      await app.benchmarkFilter(CLASS_NAME, methodName).click();
    }
    await expect(page.locator('.recharts-wrapper').first().getByText('put', { exact: true })).toHaveCount(0);
    await scrollReportTo(page, 'bottom');
    await expectWholeRunSidebarReachable(page, app);

    // ...and lengthen it again (a double-click on the class re-selects every method)
    await app.benchmarkClassLink(CLASS_NAME).dblclick();
    await expect(page.locator('.recharts-wrapper').first().getByText('put', { exact: true })).toBeVisible();
    await scrollReportTo(page, 'bottom');
    await expectWholeRunSidebarReachable(page, app);

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test("doesn't move as the report scrolls", async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReport(ONE_THREAD);

    const list = app.sidebarList();
    await wheelOver(page, list, 300);
    await expect.poll(async () => (await scrollState(list)).scrollTop).toBeGreaterThan(0);
    const { scrollTop } = await scrollState(list);
    expect(scrollTop).toBeLessThan((await scrollState(list)).maxScrollTop);

    // In small steps, giving anything that reacts to the report's scroll position (like
    // the active class in the list) the chance to react
    for (let i = 0; i < 10; i++) {
      await wheelOverReport(page, 400);
    }
    await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeGreaterThan(2_000);
    expect((await scrollState(list)).scrollTop).toBe(scrollTop);

    await scrollReportTo(page, 'bottom');
    expect((await scrollState(list)).scrollTop).toBe(scrollTop);
    await scrollReportTo(page, 'top');
    expect((await scrollState(list)).scrollTop).toBe(scrollTop);

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test("doesn't scroll when it fits", async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReport('linked-hash-first-vs-iter-next-benchmark.json');

    const list = app.sidebarList();
    expect((await scrollState(list)).maxScrollTop).toBe(0);
    await expect(list.getByRole('checkbox').last()).toBeInViewport({ ratio: 1 });

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});

test.describe('clicking a chart', { tag: Tags.ScrollingEnhancements }, () => {
  test('centres the method of a single-run bar chart row in the sidebar list', async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReport(ONE_THREAD);
    const chart = page.locator('.recharts-wrapper').first();
    // The longest bar of the chart, getAnyEntryUsingIteratorNext's, ends in this label
    const longestBarLabel = '313,421,199 ops/s';
    await expect(chart.getByText(longestBarLabel, { exact: true })).toBeVisible();

    await expectClickCentresMethod(page, app, 'get', () => clickRowLabel(page, chart, 'get'));
    await expectClickCentresMethod(page, app, 'getAnyEntryUsingIteratorNext', () =>
      clickBar(page, chart, longestBarLabel)
    );
    // Near the ends of the list, where the method can't be centred
    await expectClickCentresMethod(page, app, 'accumulateAndCopyToArray', () =>
      clickRowGap(page, chart, 'accumulateAndCopyToArray')
    );
    await expectClickCentresMethod(page, app, 'put', () => clickRowLabel(page, chart, 'put'));
    await expectClickCentresMethod(page, app, 'merge', () => clickRowGap(page, chart, 'merge'));

    // Hover tooltips still work
    await movePointerTo(page, ...(await rowGapPoint(chart, 'copyToArray')));
    await expect(page.getByRole('heading', { name: 'copyToArray', exact: true })).toBeVisible();

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('centres the method of a two-run diff bar chart row in the sidebar list', async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReports([ONE_THREAD, TWO_THREADS]);
    await app.clickAllRunsButton(); // Summary -> Compare
    const chart = page.locator('.recharts-wrapper').first();
    await expect(rowLabel(chart, FIRST_KEY)).toBeVisible();

    await expectClickCentresMethod(page, app, 'get', () => clickRowLabel(page, chart, GET_KEY));
    await expectClickCentresMethod(page, app, 'accumulateAndCopyToArray', () =>
      clickBar(page, chart, FIRST_KEY_BAR_LABEL)
    );
    await expectClickCentresMethod(page, app, 'merge', () => clickRowGap(page, chart, MERGE_KEY));
    await expectClickCentresMethod(page, app, 'put', () => clickRowGap(page, chart, PUT_KEY));

    await movePointerTo(page, ...(await rowGapPoint(chart, COPY_TO_ARRAY_KEY)));
    await expect(page.getByRole('heading', { name: COPY_TO_ARRAY_KEY, exact: true })).toBeVisible();

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('centres the method of a multi-run line chart legend entry in the sidebar list', async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReports([ONE_THREAD, TWO_THREADS, THREE_THREADS]);
    await app.clickAllRunsButton(); // Summary -> Compare
    const chart = page.locator('.recharts-wrapper').first();
    await expect(chart).toBeVisible();

    for (const [methodName, key] of [
      ['merge', MERGE_KEY],
      ['accumulateAndCopyToArray', FIRST_KEY],
      ['put', PUT_KEY],
      ['get', GET_KEY]
    ]) {
      await expectClickCentresMethod(page, app, methodName, () => clickLegendEntry(page, legendEntry(page, key)));
    }

    // Hovering a legend entry still highlights its line, which then carries a value
    // label per run, and hovering the plot still shows the tooltip
    await page.mouse.move(0, 0);
    const numbers = chart.getByText(/^[\d.,]+$/).filter({ visible: true });
    const numberCountBefore = await numbers.count();
    await legendEntry(page, COPY_TO_ARRAY_KEY).hover();
    await expect(numbers).toHaveCount(numberCountBefore + 3);
    await page.mouse.move(0, 0);
    await expect(numbers).toHaveCount(numberCountBefore);
    await chart.scrollIntoViewIfNeeded();
    const chartBox = await boxOf(chart);
    await movePointerTo(page, chartBox.x + chartBox.width * 0.15, chartBox.y + chartBox.height * 0.36);
    await expect(page.getByRole('table')).toBeVisible();

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('on the Details screen of a single run centres the method in the Details sidebar list', async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReport(ONE_THREAD);
    await app.showDetails();
    await expect(page.locator('.recharts-wrapper')).toHaveCount(METRIC_HEADINGS.length);
    expect((await scrollState(app.sidebarList())).maxScrollTop).toBeGreaterThan(0);

    // A label and a gap per chart, each of another method
    const gapMethods = ['merge', 'put', 'accumulateAndCopyToArray', 'copyToArray', 'get'];
    for (const [i, heading] of METRIC_HEADINGS.entries()) {
      const chart = app.benchmarkSection(heading).locator('.recharts-wrapper');
      await expectClickCentresMethod(page, app, METHODS[i], () => clickRowLabel(page, chart, METHODS[i]));
      await expectClickCentresMethod(page, app, gapMethods[i], () => clickRowGap(page, chart, gapMethods[i]));
    }

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('on the Details screen of two runs centres the method in the Details sidebar list', async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReports([ONE_THREAD, TWO_THREADS]);
    await app.clickAllRunsButton(); // Summary -> Compare
    await app.showDetails();
    await expect(page.locator('.recharts-wrapper')).toHaveCount(METRIC_HEADINGS.length);
    expect((await scrollState(app.sidebarList())).maxScrollTop).toBeGreaterThan(0);

    for (const heading of METRIC_HEADINGS) {
      const chart = app.benchmarkSection(heading).locator('.recharts-wrapper');
      await expectClickCentresMethod(page, app, 'get', () => clickRowLabel(page, chart, GET_KEY));
      await expectClickCentresMethod(page, app, 'put', () => clickRowGap(page, chart, PUT_KEY));
    }

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('on the Details screen of three runs centres the method in the Details sidebar list', async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReports([ONE_THREAD, TWO_THREADS, THREE_THREADS]);
    await app.clickAllRunsButton(); // Summary -> Compare
    await app.showDetails();
    await expect(page.locator('.recharts-wrapper')).toHaveCount(METRIC_HEADINGS.length);
    expect((await scrollState(app.sidebarList())).maxScrollTop).toBeGreaterThan(0);

    for (const heading of METRIC_HEADINGS) {
      const section = app.benchmarkSection(heading);
      await expectClickCentresMethod(page, app, 'merge', () => clickLegendEntry(page, legendEntry(section, MERGE_KEY)));
      await expectClickCentresMethod(page, app, 'copyToArray', () =>
        clickLegendEntry(page, legendEntry(section, COPY_TO_ARRAY_KEY))
      );
    }

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});

type ScrollState = { scrollTop: number; maxScrollTop: number };

async function scrollState(list: Locator): Promise<ScrollState> {
  return list.evaluate((element) => ({
    scrollTop: element.scrollTop,
    maxScrollTop: element.scrollHeight - element.clientHeight
  }));
}

async function isScrolledToEnd(list: Locator): Promise<boolean> {
  const { scrollTop, maxScrollTop } = await scrollState(list);
  return Math.abs(scrollTop - maxScrollTop) <= 1;
}

async function boxOf(locator: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`${locator} has no bounding box (not rendered?)`);
  }
  return box;
}

async function centreOf(locator: Locator): Promise<[number, number]> {
  const box = await boxOf(locator);
  return [box.x + box.width / 2, box.y + box.height / 2];
}

async function wheelOver(page: Page, target: Locator, deltaY: number): Promise<void> {
  await page.mouse.move(...(await centreOf(target)));
  await page.mouse.wheel(0, deltaY);
}

async function wheelOverReport(page: Page, deltaY: number): Promise<void> {
  await page.mouse.move(400, 400);
  await page.mouse.wheel(0, deltaY);
}

async function scrollReportTo(page: Page, position: 'top' | 'middle' | 'bottom'): Promise<void> {
  await page.evaluate((position) => {
    const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
    const top = { top: 0, middle: maxScrollY / 2, bottom: maxScrollY }[position];
    window.scrollTo({ top, behavior: 'instant' });
  }, position);
}

async function expectRunSidebarHeaderInViewport(page: Page): Promise<void> {
  await expect(page.locator('select')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('[data-tooltip^="Sort by"]').last()).toBeInViewport({ ratio: 1 });
  await expect(page.locator('[data-tooltip^="Switch scale"]').last()).toBeInViewport({ ratio: 1 });
  await expect(page.getByText('Benchmarks', { exact: true })).toBeInViewport({ ratio: 1 });
}

/**
 * The Run screen's sidebar header and its list's box are in full view, and the list
 * scrolls far enough to show its first and last entries -- so every entry in between
 * can be brought into view too.
 */
async function expectWholeRunSidebarReachable(page: Page, app: JmhApp): Promise<void> {
  const list = app.sidebarList();
  await expectRunSidebarHeaderInViewport(page);
  await expect(list).toBeInViewport({ ratio: 1 });

  await wheelOver(page, list, 100_000);
  await expect(list.getByRole('checkbox').last()).toBeInViewport({ ratio: 1 });
  await wheelOver(page, list, -100_000);
  await expect(app.benchmarkClassLink(CLASS_NAME)).toBeInViewport({ ratio: 1 });
  await expectRunSidebarHeaderInViewport(page);
}

/**
 * Performs `click` on a chart and expects it to scroll the sidebar list so that the
 * block of `methodName` ends up centred in it, as far as the list can scroll -- and
 * to change nothing else: the report stays where it is, and every checkbox keeps its
 * state.
 *
 * The list starts out scrolled to whichever end is farther from the block, so the
 * click has to scroll it for real.
 */
async function expectClickCentresMethod(
  page: Page,
  app: JmhApp,
  methodName: string,
  click: () => Promise<void>
): Promise<void> {
  const list = app.sidebarList();
  const block = app.sidebarMethodBlock(methodName);
  await expect(block).toHaveCount(1);
  await list.evaluate(
    (element, blockElement) => {
      const blockCentre =
        blockElement.getBoundingClientRect().top +
        blockElement.getBoundingClientRect().height / 2 -
        element.getBoundingClientRect().top +
        element.scrollTop;
      element.scrollTop = blockCentre < element.scrollHeight / 2 ? element.scrollHeight : 0;
    },
    await block.elementHandle()
  );

  const checkboxes = page.getByRole('checkbox');
  const checkedBefore = await checkedStates(checkboxes);
  const scrollYBefore = await page.evaluate(() => window.scrollY);

  await click();

  await expect(async () => {
    const offset = await list.evaluate(
      (element, blockElement) => {
        const listBox = element.getBoundingClientRect();
        const blockBox = blockElement.getBoundingClientRect();
        const listCentre = listBox.top + element.clientTop + element.clientHeight / 2;
        return blockBox.top + blockBox.height / 2 - listCentre;
      },
      await block.elementHandle()
    );
    const { scrollTop, maxScrollTop } = await scrollState(list);
    expect(maxScrollTop).toBeGreaterThan(0);

    if (Math.abs(offset) > TOLERANCE_PX) {
      // Not centred, which is only right where the list can't scroll any further
      if (offset < 0) {
        expect(scrollTop).toBe(0);
      } else {
        expect(Math.abs(scrollTop - maxScrollTop)).toBeLessThanOrEqual(1);
      }
    }
  }).toPass({ timeout: 5_000 });

  expect(await page.evaluate(() => window.scrollY)).toBe(scrollYBefore);
  expect(await checkedStates(checkboxes)).toEqual(checkedBefore);
}

async function checkedStates(checkboxes: Locator): Promise<boolean[]> {
  return checkboxes.evaluateAll((elements) => elements.map((element) => (element as HTMLInputElement).checked));
}

/**
 * A bar chart row's Y-axis label. recharts wraps a long one onto two lines, a <tspan>
 * each, so it's matched as a whole, whatever the whitespace where it wraps.
 */
function rowLabel(chart: Locator, name: string): Locator {
  const pattern = name
    .split(' ')
    .map((part) => escapeRegExp(part))
    .join('\\s*');
  return chart.getByText(new RegExp(`^${pattern}$`));
}

async function clickRowLabel(page: Page, chart: Locator, name: string): Promise<void> {
  const label = rowLabel(chart, name);
  await label.scrollIntoViewIfNeeded();
  await clickWithPointerCursor(page, ...(await centreOf(label)));
}

/**
 * Clicks a point of a bar chart row that's neither its label nor one of its bars: just
 * right of the Y axis, at the height of the row's label, which is the row's middle.
 * On the Run screen no bar crosses that point in the rows clicked there: the
 * single-run chart leaves a slot for every param combination of the class in every
 * row, and those rows have none of theirs in the middle, while the two-run chart's
 * bars start at its 0% line, far right of the axis, and grow rightwards in them.
 */
async function clickRowGap(page: Page, chart: Locator, name: string): Promise<void> {
  await clickWithPointerCursor(page, ...(await rowGapPoint(chart, name)));
}

async function rowGapPoint(chart: Locator, name: string): Promise<[number, number]> {
  const label = rowLabel(chart, name);
  await label.scrollIntoViewIfNeeded();
  const box = await boxOf(label);
  return [box.x + box.width + 20, box.y + box.height / 2];
}

/**
 * Clicks a bar just left of the label at its end. That label sits a few pixels right
 * of the bar, its bottom edge level with the upper half of the bar.
 */
async function clickBar(page: Page, chart: Locator, barLabel: string): Promise<void> {
  const label = chart.getByText(barLabel, { exact: true });
  await label.scrollIntoViewIfNeeded();
  const box = await boxOf(label);
  await clickWithPointerCursor(page, box.x - 15, box.y + box.height - 1);
}

/**
 * A click at a point of a chart, after making sure the pointer turns into a hand there
 * -- recharts only draws what it draws under a hovered row once the pointer has moved
 * in, so it moves there first.
 */
async function clickWithPointerCursor(page: Page, x: number, y: number): Promise<void> {
  await movePointerTo(page, x, y);
  await expect
    .poll(async () =>
      page.evaluate(
        ([x, y]) => {
          const element = document.elementFromPoint(x, y);
          return element ? getComputedStyle(element).cursor : null;
        },
        [x, y] as const
      )
    )
    .toBe('pointer');
  await page.mouse.click(x, y);
}

async function movePointerTo(page: Page, x: number, y: number): Promise<void> {
  await page.mouse.move(0, 0);
  await page.mouse.move(x, y, { steps: 4 });
}

/**
 * A line chart's legend entry, scoped to `scope` -- the page on the Run screen, which
 * draws a single class here, or a metric's section on the Details screen. Not to the
 * chart's `.recharts-wrapper`: the legend is rendered below the chart, outside of it.
 */
function legendEntry(scope: Page | Locator, key: string): Locator {
  return scope.getByText(key, { exact: true });
}

async function clickLegendEntry(page: Page, entry: Locator): Promise<void> {
  await entry.scrollIntoViewIfNeeded();
  const [x, y] = await centreOf(entry);
  await clickWithPointerCursor(page, x, y);
}
