import { expect, test } from '@playwright/test';
import { expectChartTooltip, hoverBarRow, hoverFirstRunColumn } from '../support/chart-tooltip-assertions';
import { JmhApp } from '../support/jmh-app';
import { watchDialogsAndErrors } from '../support/page-watchers';

// Every chart in the app hands recharts a hand-written tooltip through its `content`
// prop, and each of the three view types writes a different table. Nothing else in the
// suite ever moves the pointer into a chart, so all of that -- the score/min/max/error
// figures, the per-run rows, the computed "Change" row -- renders only here.
//
// The tooltips also hold the only *derived* numbers the app shows: TwoRunsChartTooltip
// subtracts the two runs' scores and errors itself, and both bar tooltips re-format
// every figure through util.js's formatNumber.

const LINKED_HASH_PAIR = [
  'linked-hash-first-vs-iter-next-benchmark.json',
  'linked-hash-first-vs-iter-next-on-battery-benchmark.json'
];

test("hovering a bar shows that benchmark method's scores per param value", async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReport('linked-hash-first-vs-iter-next-benchmark.json');

  // 2 bar groups (size=10 and size=100), so SingleRunChartTooltip takes its
  // payload.length > 1 branch: one row per bar, prefixed with a param-name column.
  await hoverBarRow(page, page.locator('.recharts-wrapper').first(), '7.949607915875453e-10 s/op');
  await expectChartTooltip(page, {
    heading: 'entryIteratorNext',
    columnHeaders: ['size', 'Score', 'Min', 'Max', 'Error', 'Unit'],
    rows: [
      [
        '10',
        '7.949607915875453e-10',
        '7.800958367831392e-10',
        '8.069397348060598e-10',
        '4.839336096106317e-11',
        's/op'
      ],
      [
        '100',
        '8.664407435614395e-10',
        '8.632972150952172e-10',
        '8.696298531563925e-10',
        '1.0424175520242776e-11',
        's/op'
      ]
    ]
  });

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('a single-bar chart drops the param column from its tooltip', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReport('cost-of-alloc-rate-norm-benchmark.json');

  // batchSize has a single value here, so there is one bar per method and the
  // tooltip's other branch applies -- no param column, one row.
  await hoverBarRow(page, page.locator('.recharts-wrapper').first(), '60,050 ops/s');
  await expectChartTooltip(page, {
    heading: 'randomizeAndCompressIntoNewArrays',
    columnHeaders: ['Score', 'Min', 'Max', 'Error', 'Unit'],
    // Rounded and locale-formatted, exactly as the bar labels are (report-assertions.ts).
    rows: [['60,050', '59,176', '60,600', '433', 'ops/s']]
  });

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('the Compare chart tooltip names both runs and the change between them', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.uploadReports(LINKED_HASH_PAIR);
  await app.clickAllRunsButton(); // both runs already selected -> Summary becomes Compare

  await hoverBarRow(page, page.locator('.recharts-wrapper').first(), '-50.461251425046214');
  await expectChartTooltip(page, {
    heading: 'entryIteratorNext [size=10]',
    columnHeaders: ['Run', 'Score', 'Error', 'Unit'],
    rows: [
      ['linked-hash-first-vs-iter-next-benchmark', '7.949607915875453e-10', '4.839336096106317e-11', 's/op'],
      [
        'linked-hash-first-vs-iter-next-on-battery-benchmark',
        '1.6047252190570438e-9',
        '1.1407255575763956e-10',
        's/op'
      ],
      // The Change row is computed in the tooltip itself and shown nowhere else.
      ['Change', '+8.097644274694985e-10', '+6.567919479657639e-11', 's/op']
    ]
  });

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('the multi-run chart tooltip lists every benchmark of the hovered run', async ({ page }) => {
  const { dialogs, pageErrors } = watchDialogsAndErrors(page);

  const app = new JmhApp(page);
  await page.goto('/');
  await app.loadBundledExample('multi');
  await app.clickAllRunsButton(); // Summary -> Compare, i.e. MultiRunView

  // QuickBenchmark is the smallest class in the example: 2 methods, so 2 lines and a
  // 2-row tooltip. The line chart is keyed by run, not by method, so the tooltip is
  // headed with the run name and lists every method's score for it.
  const chart = app.benchmarkSection('QuickBenchmark').locator('.recharts-wrapper').first();
  await hoverFirstRunColumn(page, chart);
  await expectChartTooltip(page, {
    heading: 'run1',
    columnHeaders: ['Benchmark', 'Score', 'Min', 'Max', 'Score Error', 'Unit'],
    // 'n/a' is util.js's formatNumber on this example's NaN scoreError -- the only
    // place in the suite that branch renders.
    rows: [
      ['sleep100Milliseconds', '103', '103', '103', 'n/a', 'ms/op'],
      ['sleep50Milliseconds', '52', '52', '52', 'n/a', 'ms/op']
    ]
  });

  expect(dialogs).toEqual([]);
  expect(pageErrors).toEqual([]);
});
