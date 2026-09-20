import { expect, type Locator, type Page } from '@playwright/test';

export type ChartTooltipExpectation = {
  /** The tooltip's own <h4>: whatever recharts passes as the hovered category's label. */
  heading: string;
  /** The tooltip table's column headers, in order — each view type builds its own set. */
  columnHeaders: string[];
  /** Every body row, cell by cell — the whole table, so nothing silently drops out of it. */
  rows: string[][];
};

/**
 * The custom chart tooltips (`SingleRunChartTooltip`, `TwoRunsChartTooltip`,
 * `MultiRunChartTooltip`) that recharts renders through its `content` prop — an API
 * whose contract moves across recharts majors, and the one part of the charts that
 * only appears under the pointer.
 *
 * Addressed by role throughout: all three render a heading plus a react-bootstrap
 * `<Table>`, and the Run screens underneath them contain no table of their own, so
 * `getByRole('table')` is the open tooltip's table. That keeps the tooltip off the
 * list of non-semantic hooks in CLAUDE.md — nothing here needs recharts' own
 * `.recharts-tooltip-wrapper`.
 */
export async function expectChartTooltip(
  page: Page,
  expected: ChartTooltipExpectation,
  opts: { timeout?: number } = {}
): Promise<void> {
  const { heading, columnHeaders, rows } = expected;

  await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible(opts);

  const table = page.getByRole('table');
  await expect(table.getByRole('columnheader')).toHaveText(columnHeaders, opts);

  // Row by row rather than "these cells exist somewhere": units and run names repeat
  // down the table, and the two-run tooltip's rows only mean anything in order (run 1,
  // run 2, then the Change it computes from them).
  const allRows = table.getByRole('row');
  await expect(allRows).toHaveCount(rows.length + 1, opts); // + the header row
  for (const [index, row] of rows.entries()) {
    await expect(allRows.nth(index + 1).getByRole('cell')).toHaveText(row, opts);
  }
}

/**
 * Point at the bar row carrying `barLabel` in a horizontal bar chart (`BarChartView`,
 * `DiffBarChartView`).
 *
 * recharts derives the tooltip from the pointer's position inside the plot area rather
 * than from whatever element is under it, so this is a raw mouse move, not a
 * `.hover()` on a bar: reaching for the bar node itself would need recharts' internal
 * class names. The row is still named rather than guessed — its own value label fixes
 * the y — while the x is just "somewhere inside the plot area". Hovering the label
 * itself would not do: a long enough label (`'60,050 ops/s'`) extends past the plot
 * area into the chart's right margin, where recharts shows nothing.
 */
export async function hoverBarRow(page: Page, chart: Locator, barLabel: string): Promise<void> {
  const label = chart.getByText(barLabel, { exact: true });
  await expect(label).toBeVisible(); // recharts animates the labels in; their box is only final afterwards
  await label.scrollIntoViewIfNeeded();
  const labelBox = await boundingBoxOf(label);
  const chartBox = await boundingBoxOf(chart);
  await movePointerTo(page, chartBox.x + chartBox.width / 2, labelBox.y + labelBox.height / 2);
}

/**
 * Point at the leftmost run's column of a multi-run `LineChartView`, which has no
 * per-row label to aim at — recharts snaps the tooltip to the nearest x category, so
 * the left edge of the plot area is the first run whatever the run count.
 *
 * Deliberately *between* the lines rather than on one: `LineChartView` renders its
 * `<Tooltip>` only while `activeLine` is null and swaps it for the hovered line's own
 * value labels otherwise, so landing on a line shows no tooltip at all — and a hover
 * that misses this way fails as a full test timeout, not as a clear assertion. The
 * vertical fraction is therefore picked to sit as far from either line as the chart
 * allows for the data the spec uses, rather than merely somewhere that works today.
 */
export async function hoverFirstRunColumn(page: Page, chart: Locator): Promise<void> {
  await chart.scrollIntoViewIfNeeded();
  const chartBox = await boundingBoxOf(chart);
  await movePointerTo(page, chartBox.x + chartBox.width * 0.15, chartBox.y + chartBox.height * 0.36);
}

async function movePointerTo(page: Page, x: number, y: number): Promise<void> {
  // recharts only recomputes the tooltip on a mousemove event, and LineChartView
  // unmounts its Tooltip while a line is hovered -- so park the pointer in the page's
  // top-left corner first, making the move below a real entry into the plot area
  // rather than a no-op from wherever a previous step happened to leave it.
  await page.mouse.move(0, 0);
  await page.mouse.move(x, y, { steps: 4 });
}

// Mouse coordinates are viewport-relative, so callers scroll what they aim at into
// view (once, before measuring anything) rather than measuring a box off-screen.
async function boundingBoxOf(locator: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Cannot hover ${locator}: it has no bounding box (not rendered?)`);
  }
  return box;
}
