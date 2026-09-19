import { expect, type Page } from '@playwright/test';
import { escapeRegExp } from './regex-util';

export type TwoRunCompareExpectation = {
  runName1: string;
  runName2: string;
  benchmarkClasses: number;
  /** Bar categories, as `DiffBarDataSet` names them: `method[param=value]`, or plain `method`. */
  categories: string[];
  /** The per-bar `scoreDiff` labels (`DiffLabel`), as rendered — unrounded for scores < 1. */
  scoreDiffs: string[];
  metric?: string;
};

/**
 * The two-run Compare screen (`TwoRunsView` -> `TwoRunBundle` -> `DiffBarChartView`),
 * reached by toggling Compare with exactly 2 runs selected. It is a different chart
 * from everything else in the suite: one bar per method/param combination showing the
 * *difference* between the runs in %, with `DiffLabel`'s own value labels and a hand
 * written Legend rather than recharts' derived one.
 *
 * Categories and labels are checked for presence, not for pairing: nothing in the
 * rendered DOM ties a bar label to its category without reaching into recharts'
 * internal class names, which this suite deliberately doesn't do (see Constraints in
 * CLAUDE.md). The Summary screen's tables cover the pairing instead.
 */
export async function expectTwoRunCompare(
  page: Page,
  expected: TwoRunCompareExpectation,
  opts: { timeout?: number } = {}
): Promise<void> {
  const { runName1, runName2, benchmarkClasses, categories, scoreDiffs, metric = 'Score' } = expected;

  const sentence = new RegExp(
    `Comparing\\s*${benchmarkClasses}\\s*benchmark classes for ` +
      `'${escapeRegExp(runName1)}' and '${escapeRegExp(runName2)}' on metric '${escapeRegExp(metric)}'\\.`
  );
  await expect(page.getByText(sentence)).toBeVisible(opts);

  const chart = page.locator('.recharts-wrapper').first();
  for (const legendEntry of ['Decrease in %', 'Increase in %']) {
    await expect(chart.getByText(legendEntry, { exact: true })).toBeVisible(opts);
  }
  for (const category of categories) {
    await expect(chart.getByText(category, { exact: true })).toBeVisible(opts);
  }
  for (const scoreDiff of scoreDiffs) {
    await expect(chart.getByText(scoreDiff, { exact: true })).toBeVisible(opts);
  }
}

/**
 * What the vendored linked-hash pair renders on the Compare screen, loaded in
 * alphabetical (regular, then on-battery) order — the same 4 method/param
 * combinations `LINKED_HASH_PAIR_ROWS` covers on the Summary screen, here with the
 * per-bar percentages the Summary tables round into their own columns.
 */
export const LINKED_HASH_PAIR_COMPARE: TwoRunCompareExpectation = {
  runName1: 'linked-hash-first-vs-iter-next-benchmark',
  runName2: 'linked-hash-first-vs-iter-next-on-battery-benchmark',
  benchmarkClasses: 1,
  categories: [
    'entryIteratorNext[size=10]',
    'entryIteratorNext[size=100]',
    'firstEntry[size=10]',
    'firstEntry[size=100]'
  ],
  scoreDiffs: ['-50.461251425046214', '-45.50971985573979', '-48.6616917209557', '-45.201265463656654']
};
