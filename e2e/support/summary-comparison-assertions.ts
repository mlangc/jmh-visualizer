import { expect, type Page } from '@playwright/test';
import { escapeRegExp } from './regex-util';

/**
 * Shared assertion for the Summary screen's per-metric comparison tables
 * (SummaryTable.jsx renders each of Improved/Declined/Unchanged as its own
 * <h3><Table> pair). Verifies both the heading's row count and that each
 * given (method, params) pair appears exactly once, regardless of which
 * table it's checking.
 *
 * Called bare (default timeout) by the specs, and with a short
 * `opts.timeout` inside `expect(...).rejects.toThrow()` by the harness spec
 * -- same routine, so the falsification checks can't drift from what they
 * guard (mirrors `expectCostOfAllocRateNormReport`'s `report-assertions.ts`).
 */
async function expectComparisonRows(
  page: Page,
  tableHeading: string,
  rows: { method: string; params: string }[],
  opts: { timeout?: number } = {}
): Promise<void> {
  const heading = page.getByRole('heading', { name: `${tableHeading} (${rows.length})`, exact: true });
  await expect(heading).toBeVisible(opts);

  // Scope to this table specifically via its immediate DOM sibling (rather
  // than assuming it's the only <table> on the page) -- a threshold that
  // pushes some rows into "Unchanged" still leaves a second, real table.
  const table = heading.locator('xpath=following-sibling::table[1]');
  const tableRows = table.locator('tbody').getByRole('row');
  await expect(tableRows).toHaveCount(rows.length, opts);

  for (const { method, params } of rows) {
    // `params` (e.g. "size=10") must be matched with a negative lookahead,
    // not a plain substring -- "size=100".includes("size=10") is true, which
    // would double-count the size=100 row under size=10 too.
    await expect(
      tableRows.filter({ hasText: method }).filter({ hasText: new RegExp(`${escapeRegExp(params)}(?!\\d)`) })
    ).toHaveCount(1, opts);
  }
}

/** Asserts the Summary screen's "Declined Benchmarks" table contains exactly these rows. */
export async function expectDeclinedBenchmarks(
  page: Page,
  rows: { method: string; params: string }[],
  opts: { timeout?: number } = {}
): Promise<void> {
  await expectComparisonRows(page, 'Declined Benchmarks', rows, opts);
}

/** Asserts the Summary screen's "Improved Benchmarks" table contains exactly these rows. */
export async function expectImprovedBenchmarks(
  page: Page,
  rows: { method: string; params: string }[],
  opts: { timeout?: number } = {}
): Promise<void> {
  await expectComparisonRows(page, 'Improved Benchmarks', rows, opts);
}

/** Asserts the Summary screen's "Unchanged Benchmarks" table contains exactly these rows. */
export async function expectUnchangedBenchmarks(
  page: Page,
  rows: { method: string; params: string }[],
  opts: { timeout?: number } = {}
): Promise<void> {
  await expectComparisonRows(page, 'Unchanged Benchmarks', rows, opts);
}

/**
 * The 4 (method, params) combinations the Summary screen's "last two
 * selected runs" comparison produces for
 * `linked-hash-first-vs-iter-next-benchmark` vs. `...-on-battery-benchmark`
 * -- direction-agnostic: the fixture pair's per-metric scores differ by
 * ~45-102% depending on which run is the comparison's denominator (see
 * SummaryView.jsx's scoreDiff formula), but it's always these same 4
 * method/param combinations that land in whichever table (Declined or
 * Improved) the load order produces. Never the "Unchanged" table at the
 * default 5% threshold.
 */
export const LINKED_HASH_PAIR_ROWS = [
  { method: 'entryIteratorNext', params: 'size=10' },
  { method: 'entryIteratorNext', params: 'size=100' },
  { method: 'firstEntry', params: 'size=10' },
  { method: 'firstEntry', params: 'size=100' }
];

/**
 * At the deviation slider's 50% max, only this one row's ~50.46% deviation
 * still clears the threshold; the other 3 `LINKED_HASH_PAIR_ROWS` entries
 * drop into "Unchanged Benchmarks" instead of disappearing.
 */
export const LINKED_HASH_PAIR_SURVIVING_ROW = LINKED_HASH_PAIR_ROWS[0];
export const LINKED_HASH_PAIR_ROWS_MINUS_SURVIVOR = LINKED_HASH_PAIR_ROWS.slice(1);
