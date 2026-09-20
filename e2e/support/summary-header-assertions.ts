import { expect, type Page } from '@playwright/test';
import { escapeRegExp } from './regex-util';

export type SummaryHeaderExpectation = {
  results: number;
  benchmarkClasses: number;
  runName1: string;
  runName2: string;
  metric?: string;
};

/**
 * The Summary screen's header sentence -- "Comparing <n> results out of <m> benchmark
 * classes for '<run1>' and '<run2>' on metric '<metric>'." -- the only place the app
 * names *which* two runs the comparison tables below it are about.
 *
 * `runName1`/`runName2` are the last two selected runs, in selection order, whatever
 * the total run count is. That needs the `SummaryScreen.jsx` fix this suite ships
 * with, so callers comparing 3+ runs tag themselves `@needs-fix`: before the fix,
 * `SummaryView` indexed an already-sliced 2-element `runNames` with absolute run
 * indices, which named the wrong run first and left the second name empty.
 *
 * React splits the sentence into text nodes around the two `<Badge>` counts, so this
 * matches the whole thing as one whitespace-tolerant regex instead of element by
 * element -- which also means the counts are checked, not just the names.
 */
export async function expectSummaryHeader(
  page: Page,
  expected: SummaryHeaderExpectation,
  opts: { timeout?: number } = {}
): Promise<void> {
  const { results, benchmarkClasses, runName1, runName2, metric = 'Score' } = expected;
  const sentence = new RegExp(
    `Comparing\\s*${results}\\s*results out of\\s*${benchmarkClasses}\\s*benchmark classes ` +
      `for '${escapeRegExp(runName1)}' and '${escapeRegExp(runName2)}' on metric '${escapeRegExp(metric)}'\\.`
  );
  await expect(page.getByText(sentence)).toBeVisible(opts);
}
