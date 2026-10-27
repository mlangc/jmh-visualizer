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

const ONE_THREAD = 'linked-hash-vs-hash-multiple-benchmarks-1-thread.json';
const TWO_THREADS = 'linked-hash-vs-hash-multiple-benchmarks-2-threads.json';
const THREE_THREADS = 'linked-hash-vs-hash-multiple-benchmarks-3-threads.json';
const CLASS_NAME = 'HashVsLinkedHashMapBenchmark';
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

// The longest bar of the single-run Score chart, getAnyEntryUsingIteratorNext's, ends
// in this label
const LONGEST_BAR_LABEL = '313,421,199 ops/s';

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

type Point = [x: number, y: number];

test.describe('the sidebar list', { tag: Tags.ScrollingEnhancements }, () => {
  test('scrolls on its own below a header that stays put', async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReport(ONE_THREAD);

    const list = app.sidebarList();
    const header = runSidebarHeader(page, app, 'single');
    expect((await scrollState(list)).maxScrollTop).toBeGreaterThan(0);
    await expectAllInViewport([...header, list]);

    // A wheel over the list scrolls the list, down to its end, but never the report
    await wheelOver(page, list, 100_000);
    await expect.poll(async () => isScrolledToEnd(list)).toBe(true);
    await expect(list.getByRole('checkbox').last()).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expectAllInViewport(header);

    await wheelOver(page, list, -100_000);
    await expect.poll(async () => (await scrollState(list)).scrollTop).toBe(0);
    await expect(list.getByRole('checkbox').first()).toBeInViewport({ ratio: 1 });
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
    const header = runSidebarHeader(page, app, 'single');

    await expectWholeSidebarReachableWhereverScrolled(page, app, header);

    for (const size of [
      { width: 1280, height: 480 },
      { width: 1000, height: 900 }
    ]) {
      await page.setViewportSize(size);
      await scrollReportTo(page, 'bottom');
      await expectWholeSidebarReachable(page, app, header);
    }
    await page.setViewportSize({ width: 1280, height: 720 });

    // Shorten the report to a single method, from the bottom of the report: the
    // sidebar is then taller than the report, and the page scrolls back up under it
    const chart = page.locator('.recharts-wrapper').first();
    for (const methodName of METHODS.slice(1)) {
      await app.benchmarkFilter(CLASS_NAME, methodName).click();
    }
    await expect(rowLabel(chart, 'put')).toHaveCount(0);
    await scrollReportTo(page, 'bottom');
    await expectWholeSidebarReachable(page, app, header);

    // ...and lengthen it again (a double-click on the class re-selects every method)
    await app.benchmarkClassLink(CLASS_NAME).dblclick();
    await expect(rowLabel(chart, 'put')).toBeVisible();
    await scrollReportTo(page, 'bottom');
    await expectWholeSidebarReachable(page, app, header);

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('stays reachable with 2 runs, on the Run and the Details screen', async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReports([ONE_THREAD, TWO_THREADS]);
    await app.clickAllRunsButton(); // Summary -> Compare
    await expect(rowLabel(page.locator('.recharts-wrapper').first(), FIRST_KEY)).toBeVisible();
    await expectWholeSidebarReachableWhereverScrolled(page, app, runSidebarHeader(page, app, 'two'));

    await app.showDetails();
    await expect(page.locator('.recharts-wrapper')).toHaveCount(METRIC_HEADINGS.length);
    await expectWholeSidebarReachableWhereverScrolled(page, app, detailsSidebarHeader(page, app, 'two'));

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('stays reachable with 3 runs, on the Run and the Details screen', async ({ page }) => {
    // Three runs make for a line per result, 64 of them in each chart, which render slowly
    test.slow();
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReports([ONE_THREAD, TWO_THREADS, THREE_THREADS]);
    await app.clickAllRunsButton(); // Summary -> Compare
    await expect(page.locator('.recharts-wrapper').first()).toBeVisible();
    await expectWholeSidebarReachableWhereverScrolled(page, app, runSidebarHeader(page, app, 'multi'));

    await app.showDetails();
    await expect(page.locator('.recharts-wrapper')).toHaveCount(METRIC_HEADINGS.length);
    await expectWholeSidebarReachableWhereverScrolled(page, app, detailsSidebarHeader(page, app, 'multi'));

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('stays reachable on the Details screen of a single run', async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReport(ONE_THREAD);
    await app.showDetails();
    await expect(page.locator('.recharts-wrapper')).toHaveCount(METRIC_HEADINGS.length);
    await expectWholeSidebarReachableWhereverScrolled(page, app, detailsSidebarHeader(page, app, 'single'));

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

  // Holds on builds without the feature too: a guard against the box cutting off or
  // padding out a list that fits
  test("doesn't scroll when it fits", async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReport('linked-hash-first-vs-iter-next-benchmark.json');

    const list = app.sidebarList();
    expect((await scrollState(list)).maxScrollTop).toBe(0);
    const spareHeight = await list.evaluate(
      (element) => element.clientHeight - (element.firstElementChild?.getBoundingClientRect().height ?? 0)
    );
    expect(Math.abs(spareHeight)).toBeLessThanOrEqual(1);
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
    await expect(chart.getByText(LONGEST_BAR_LABEL, { exact: true })).toBeVisible();

    await expectClickCentresMethod(page, app, 'get', () => rowLabelPoint(chart, 'get'));
    await expectClickCentresMethod(page, app, 'getAnyEntryUsingIteratorNext', () => barPoint(chart, LONGEST_BAR_LABEL));
    // Near the ends of the list, where the method can't be centred
    await expectClickCentresMethod(page, app, 'accumulateAndCopyToArray', () =>
      rowGapPoint(chart, 'accumulateAndCopyToArray')
    );
    await expectClickCentresMethod(page, app, 'put', () => rowLabelPoint(chart, 'put'));
    await expectClickCentresMethod(page, app, 'merge', () => rowGapPoint(chart, 'merge'));

    // Hover tooltips still work
    await movePointerTo(page, ...(await rowGapPoint(chart, 'copyToArray')));
    await expect(page.getByRole('heading', { name: 'copyToArray', exact: true })).toBeVisible();

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('centres the method of the row a click lands on, even if another row was hovered last', async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReport(ONE_THREAD);
    const chart = page.locator('.recharts-wrapper').first();
    await expect(chart.getByText(LONGEST_BAR_LABEL, { exact: true })).toBeVisible();

    // Hover a row, then let the report scroll the next row under the pointer, as a
    // mouse wheel would, and click there without moving -- the Y-axis labels line up
    // on the right, so the point lands on the same spot of the next row
    const [x, y] = await rowGapPoint(chart, 'get');
    await movePointerTo(page, x, y);
    await expect(page.getByRole('heading', { name: 'get', exact: true })).toBeVisible();
    const distance = (await boxOf(rowLabel(chart, 'getAnyEntry'))).y - (await boxOf(rowLabel(chart, 'get'))).y;
    const scrollYBefore = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, distance);
    await expect
      .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - scrollYBefore - distance))
      .toBeLessThanOrEqual(1);
    await page.mouse.down();
    await page.mouse.up();

    await expectMethodCentred(app, 'getAnyEntry');

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

    await expectClickCentresMethod(page, app, 'get', () => rowLabelPoint(chart, GET_KEY));
    await expectClickCentresMethod(page, app, 'accumulateAndCopyToArray', () => barPoint(chart, FIRST_KEY_BAR_LABEL));
    await expectClickCentresMethod(page, app, 'merge', () => rowGapPoint(chart, MERGE_KEY));
    await expectClickCentresMethod(page, app, 'put', () => rowGapPoint(chart, PUT_KEY));

    await movePointerTo(page, ...(await rowGapPoint(chart, COPY_TO_ARRAY_KEY)));
    await expect(page.getByRole('heading', { name: COPY_TO_ARRAY_KEY, exact: true })).toBeVisible();

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('centres the method of a multi-run line chart legend entry in the sidebar list', async ({ page }) => {
    // Three runs make for a line per result, 64 of them in each chart, which render slowly
    test.slow();
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReports([ONE_THREAD, TWO_THREADS, THREE_THREADS]);
    await app.clickAllRunsButton(); // Summary -> Compare
    const chart = page.locator('.recharts-wrapper').first();
    await expect(chart).toBeVisible();

    // Reaching the legend scrolls the page, which slides the chart under the pointer left
    // on the Compare button, and the tooltip that opens repeats the legend's texts
    await page.mouse.move(0, 0);
    for (const [methodName, key] of [
      ['merge', MERGE_KEY],
      ['accumulateAndCopyToArray', FIRST_KEY],
      ['put', PUT_KEY],
      ['get', GET_KEY]
    ]) {
      await expectClickCentresMethod(page, app, methodName, () => centreOf(legendEntry(page, key)));
    }

    // Hovering a legend entry still highlights its line, which then carries a value
    // label ("5,957 ops/s") per run, and hovering the plot still shows the tooltip
    await page.mouse.move(0, 0);
    const valueLabels = chart.getByText(/^[\d.,]+ \S+$/).filter({ visible: true });
    const valueLabelCountBefore = await valueLabels.count();
    await legendEntry(page, COPY_TO_ARRAY_KEY).hover();
    await expect(valueLabels).toHaveCount(valueLabelCountBefore + 3);
    await page.mouse.move(0, 0);
    await expect(valueLabels).toHaveCount(valueLabelCountBefore);
    await chart.scrollIntoViewIfNeeded();
    const chartBox = await boxOf(chart);
    await movePointerTo(page, chartBox.x + chartBox.width * 0.15, chartBox.y + chartBox.height * 0.36);
    await expect(page.getByRole('table')).toBeVisible();

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // One click per metric chart, cycling through the click targets
  test('on the Details screen of a single run centres the method in the Details sidebar list', async ({ page }) => {
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReport(ONE_THREAD);
    await app.showDetails();
    await expect(page.locator('.recharts-wrapper')).toHaveCount(METRIC_HEADINGS.length);

    const charts = METRIC_HEADINGS.map((heading) => app.benchmarkSection(heading).locator('.recharts-wrapper'));
    await expect(charts[0].getByText(LONGEST_BAR_LABEL, { exact: true })).toBeVisible();
    await expectClickCentresMethod(page, app, 'getAnyEntryUsingIteratorNext', () =>
      barPoint(charts[0], LONGEST_BAR_LABEL)
    );
    await expectClickCentresMethod(page, app, 'accumulateAndCopyToArray', () =>
      rowLabelPoint(charts[1], 'accumulateAndCopyToArray')
    );
    await expectClickCentresMethod(page, app, 'merge', () => rowGapPoint(charts[2], 'merge'));
    await expectClickCentresMethod(page, app, 'put', () => rowLabelPoint(charts[3], 'put'));
    await expectClickCentresMethod(page, app, 'get', () => rowGapPoint(charts[4], 'get'));

    await movePointerTo(page, ...(await rowGapPoint(charts[1], 'copyToArray')));
    await expect(page.getByRole('heading', { name: 'copyToArray', exact: true })).toBeVisible();

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

    const charts = METRIC_HEADINGS.map((heading) => app.benchmarkSection(heading).locator('.recharts-wrapper'));
    await expect(charts[0].getByText(FIRST_KEY_BAR_LABEL, { exact: true })).toBeVisible();
    await expectClickCentresMethod(page, app, 'accumulateAndCopyToArray', () =>
      barPoint(charts[0], FIRST_KEY_BAR_LABEL)
    );
    await expectClickCentresMethod(page, app, 'copyToArray', () => rowLabelPoint(charts[1], COPY_TO_ARRAY_KEY));
    await expectClickCentresMethod(page, app, 'put', () => rowGapPoint(charts[2], PUT_KEY));
    await expectClickCentresMethod(page, app, 'merge', () => rowLabelPoint(charts[3], MERGE_KEY));
    // copyToArray has no gc.time results, unlike this get
    await expectClickCentresMethod(page, app, 'get', () => rowGapPoint(charts[4], GET_KEY));

    await movePointerTo(page, ...(await rowGapPoint(charts[1], COPY_TO_ARRAY_KEY)));
    await expect(page.getByRole('heading', { name: COPY_TO_ARRAY_KEY, exact: true })).toBeVisible();

    expect(dialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('on the Details screen of three runs centres the method in the Details sidebar list', async ({ page }) => {
    // Three runs make for a line per result, 64 of them in each chart, which render slowly
    test.slow();
    const { dialogs, pageErrors } = watchDialogsAndErrors(page);

    const app = new JmhApp(page);
    await page.goto('/');
    await app.uploadReports([ONE_THREAD, TWO_THREADS, THREE_THREADS]);
    await app.clickAllRunsButton(); // Summary -> Compare
    await app.showDetails();
    await expect(page.locator('.recharts-wrapper')).toHaveCount(METRIC_HEADINGS.length);

    const keys = [MERGE_KEY, FIRST_KEY, PUT_KEY, COPY_TO_ARRAY_KEY, GET_KEY];
    for (const [i, heading] of METRIC_HEADINGS.entries()) {
      const methodName = keys[i].split(' ')[0];
      await expectClickCentresMethod(page, app, methodName, () =>
        centreOf(legendEntry(app.benchmarkSection(heading), keys[i]))
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

/** The centre of what `locator` points at, scrolled into view. */
async function centreOf(locator: Locator): Promise<Point> {
  await locator.scrollIntoViewIfNeeded();
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

/**
 * The Run screen's sidebar header: the metric dropdown (the screen's only `select`),
 * the Sort and/or Scale controls the view has, and the list's heading.
 */
function runSidebarHeader(page: Page, app: JmhApp, view: 'single' | 'two' | 'multi'): Locator[] {
  return [
    page.locator('select'),
    ...(view === 'multi' ? [] : [app.sortForAllChartsControl()]),
    ...(view === 'two' ? [] : [app.scaleForAllChartsControl()]),
    page.getByText('Benchmarks', { exact: true })
  ];
}

/**
 * The Details screen's sidebar header: the "Back.." link, the class dropdown (the
 * screen's only `select`), the Sort and/or Scale controls and the list of metrics.
 */
function detailsSidebarHeader(page: Page, app: JmhApp, view: 'single' | 'two' | 'multi'): Locator[] {
  return [
    page.getByText('Back..'),
    page.locator('select'),
    ...(view === 'multi' ? [] : [app.sortForAllChartsControl()]),
    ...(view === 'two' ? [] : [app.scaleForAllChartsControl()]),
    page.getByText('Metrics', { exact: true }),
    page.locator('ul.nav ul.nav').getByText('gc.time', { exact: true })
  ];
}

async function expectAllInViewport(locators: Locator[]): Promise<void> {
  for (const locator of locators) {
    await expect(locator).toBeInViewport({ ratio: 1 });
  }
}

/** `expectWholeSidebarReachable` with the report at its top, middle and bottom. */
async function expectWholeSidebarReachableWhereverScrolled(page: Page, app: JmhApp, header: Locator[]): Promise<void> {
  for (const position of ['top', 'middle', 'bottom'] as const) {
    await scrollReportTo(page, position);
    await expectWholeSidebarReachable(page, app, header);
  }
}

/**
 * The sidebar's header and its list's box are in full view, and the list scrolls far
 * enough to show its first and last checkboxes -- so every entry in between can be
 * brought into view too.
 */
async function expectWholeSidebarReachable(page: Page, app: JmhApp, header: Locator[]): Promise<void> {
  const list = app.sidebarList();
  await expectAllInViewport([...header, list]);

  await wheelOver(page, list, 100_000);
  await expect(list.getByRole('checkbox').last()).toBeInViewport({ ratio: 1 });
  await wheelOver(page, list, -100_000);
  await expect(list.getByRole('checkbox').first()).toBeInViewport({ ratio: 1 });
  await expectAllInViewport(header);
}

/**
 * Clicks a chart at the point `aim` returns and expects the click to scroll the sidebar
 * list so that the block of `methodName` ends up centred in it, as far as the list can
 * scroll -- and to change nothing else: the report stays where it is, every checkbox
 * keeps its state, and the list stays as it was (nothing highlighted). Before the
 * click, the pointer has to have turned into a hand there.
 *
 * The list starts out scrolled to whichever end is farther from the block, so the
 * click has to scroll it for real. `aim` may scroll the report to bring its target
 * into view; only the click itself must not.
 */
async function expectClickCentresMethod(
  page: Page,
  app: JmhApp,
  methodName: string,
  aim: () => Promise<Point>
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

  const [x, y] = await aim();
  await expectPointerCursorAt(page, x, y);

  const checkboxes = page.getByRole('checkbox');
  const checkedBefore = await checkedStates(checkboxes);
  const listBefore = await list.innerHTML();
  const scrollYBefore = await page.evaluate(() => window.scrollY);

  await page.mouse.click(x, y);

  await expectMethodCentred(app, methodName);

  expect(await page.evaluate(() => window.scrollY)).toBe(scrollYBefore);
  expect(await checkedStates(checkboxes)).toEqual(checkedBefore);
  expect(await list.innerHTML()).toBe(listBefore);
}

/**
 * The block of `methodName` ends up centred in the sidebar list, as far as the list
 * can scroll.
 */
async function expectMethodCentred(app: JmhApp, methodName: string): Promise<void> {
  const list = app.sidebarList();
  const block = app.sidebarMethodBlock(methodName);
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
}

async function checkedStates(checkboxes: Locator): Promise<boolean[]> {
  return checkboxes.evaluateAll((elements) => elements.map((element) => (element as HTMLInputElement).checked));
}

/**
 * Points at `x`/`y` and expects the pointer to turn into a hand there -- recharts only
 * draws what it draws under a hovered row once the pointer has moved in.
 */
async function expectPointerCursorAt(page: Page, x: number, y: number): Promise<void> {
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
}

async function movePointerTo(page: Page, x: number, y: number): Promise<void> {
  await page.mouse.move(0, 0);
  await page.mouse.move(x, y, { steps: 4 });
}

/**
 * Text the chart draws -- an SVG <text>, which can't be the tooltip's: that renders
 * inside `.recharts-wrapper` too, and an open one repeats row names in its heading.
 * recharts wraps a long text onto several lines, a <tspan> each, so it's matched as a
 * whole, whatever the whitespace where it wraps.
 */
function chartText(chart: Locator, text: string): Locator {
  const pattern = text
    .split(' ')
    .map((part) => escapeRegExp(part))
    .join('\\s*');
  return chart.locator('text').filter({ hasText: new RegExp(`^${pattern}$`) });
}

/** A bar chart row's Y-axis label. */
function rowLabel(chart: Locator, name: string): Locator {
  return chartText(chart, name);
}

function rowLabelPoint(chart: Locator, name: string): Promise<Point> {
  return centreOf(rowLabel(chart, name));
}

/**
 * A point of a bar chart row that's neither its label nor one of its bars: just right
 * of the Y axis, at the height of the row's label, which is the row's middle. On the
 * Run screen no bar crosses that point in the rows clicked there: the single-run
 * chart leaves a slot for every param combination of the class in every row, and
 * those rows have none of theirs in the middle, while the two-run chart's bars start
 * at its 0% line, far right of the axis, and grow rightwards in them.
 */
async function rowGapPoint(chart: Locator, name: string): Promise<Point> {
  const label = rowLabel(chart, name);
  await label.scrollIntoViewIfNeeded();
  const box = await boxOf(label);
  return [box.x + box.width + 20, box.y + box.height / 2];
}

/**
 * A point on a bar, just left of the label at its end. That label sits a few pixels
 * right of the bar, its bottom edge level with the upper half of the bar.
 */
async function barPoint(chart: Locator, barLabel: string): Promise<Point> {
  const label = chartText(chart, barLabel);
  await label.scrollIntoViewIfNeeded();
  const box = await boxOf(label);
  return [box.x - 15, box.y + box.height - 1];
}

/**
 * A line chart's legend entry, scoped to `scope` -- the page on the Run screen, which
 * draws a single class here, or a metric's section on the Details screen. Not to the
 * chart's `.recharts-wrapper`: the legend is rendered below the chart, outside of it.
 */
function legendEntry(scope: Page | Locator, key: string): Locator {
  return scope.getByText(key, { exact: true });
}
