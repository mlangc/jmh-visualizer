import path from 'node:path';
import type { Page } from '@playwright/test';
import { escapeRegExp } from './regex-util';

const FIXTURES = path.join(__dirname, '..', 'fixtures');

// Page object — the only place that knows app-specific selectors.
export class JmhApp {
  constructor(private readonly page: Page) {}

  /**
   * Upload one JMH JSON via the labelled "Open File Dialog" input in the
   * upload sidebar — a plain <input type="file"> wired to
   * `actions.uploadFiles`, identical on master and the branch. (react-dropzone
   * renders a second file input; target the labelled one.)
   *
   * Settles on the single-run summary line — only correct for a fixture that
   * renders as a single run. A two-/multi-run fixture uploaded this way hangs
   * to the test timeout instead of settling.
   */
  async uploadReport(fixtureName: string): Promise<void> {
    const fileInput = this.page.locator('div.btn', { hasText: 'Open File Dialog' }).locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(FIXTURES, fixtureName));
    await this.page.getByText(/different benchmark classes for single run/).waitFor();
  }

  /**
   * Upload multiple JMH JSON files at once via the same file input, matching
   * a real multi-file drag-and-drop. Settles on the Summary screen's
   * "Ignoring deviations below" text -- the one thing guaranteed present
   * whenever more than one run is loaded, unlike uploadReport()'s single-run
   * settle text, which never fires for a multi-run upload.
   */
  async uploadReports(fixtureNames: string[]): Promise<void> {
    const fileInput = this.page.locator('div.btn', { hasText: 'Open File Dialog' }).locator('input[type="file"]');
    await fileInput.setInputFiles(fixtureNames.map((name) => path.join(FIXTURES, name)));
    await this.page.getByText(/Ignoring deviations below/).waitFor();
  }

  /**
   * Click a top-nav run-selection button, narrowing the view to that single
   * run. Settles on that run's single-run summary sentence, not
   * `.recharts-wrapper` -- the Summary screen already contains recharts
   * elements (SummaryChangeChart/SummaryHistogramChart), so that wait would
   * pass before the click's effect actually landed.
   */
  async selectRun(runName: string): Promise<void> {
    await this.page.getByRole('button', { name: runName, exact: true }).click();
    await this.page.getByText(new RegExp(`for single run '${escapeRegExp(runName)}'`)).waitFor();
  }

  /**
   * Click the run-selection bar's plain "Summary"/"Compare" title button --
   * never its caret (no text content, only a mirrored aria-label) nor the
   * SplitButton's dropdown menu items (an <a role="menuitem"> for each of
   * "Summary"/"Compare", present in the DOM but hidden until the caret is
   * opened -- a bare text/role query matches those too). Scoping to
   * `<button>` with exact text excludes both. Its effect is state-dependent
   * (RunSelectionBar.jsx's selectAllWithPossibleSwitchView): reselects all
   * runs without changing the view when not all runs are currently selected,
   * or toggles Summary<->Compare once all runs are already selected -- so
   * callers assert the result themselves rather than this method waiting on
   * a fixed landmark.
   */
  async clickAllRunsButton(): Promise<void> {
    await this.page.locator('button', { hasText: /^(Summary|Compare)$/ }).click();
  }

  /**
   * Click a "Benchmarks" sidebar entry by benchmark class name. This is a
   * react-scroll smooth-scroll, not a state change, so there's no settled
   * landmark to wait on -- callers assert the scroll's effect via
   * `toBeInViewport()`.
   */
  async clickBenchmarkClassLink(className: string): Promise<void> {
    await this.page.locator('ul.nav ul.nav').getByText(className, { exact: true }).click();
  }

  /**
   * Push the "Ignoring deviations below X%" slider to its max (50%). Focuses
   * the handle via its enclosing aria-valuenow container rather than the
   * handle's own (unlabelled, roleless) library class name, then presses
   * ArrowRight enough times to cover the full min=0/max=50/step=5 range from
   * the initial value of 5.
   */
  async moveMinDeviationSliderToMax(): Promise<void> {
    const handle = this.page.locator('[aria-valuenow] [tabindex="0"]');
    await handle.focus();
    for (let i = 0; i < 9; i++) {
      await this.page.keyboard.press('ArrowRight');
    }
  }

  /**
   * Open the "JMH Visualizer" brand dropdown and click "Reset & Upload New",
   * which does a real `window.location` reload back to the bare URL (not a
   * React transition) -- wait for the start screen's dropzone text to
   * reappear before returning, keeping this symmetric with the suite's other
   * transition methods.
   */
  async resetAndUploadNew(): Promise<void> {
    await this.toggleBrandMenu();
    await this.page.getByRole('menuitem', { name: /Reset & Upload New/ }).click();
    await this.page.getByText('Drop your JMH JSON report file(s) here!').waitFor();
  }

  /**
   * Click one of the upload sidebar's "Load … Example" links — plain <a>s
   * wired to `actions.load{Single,Two,Multi}RunExample`, byte-identical
   * master..add-filters-for-large-result-files. Loads the bundled
   * `ListCreationBenchmark`-family report of the requested shape.
   */
  async loadBundledExample(kind: 'single' | 'two' | 'multi'): Promise<void> {
    const label = { single: 'Load Single Run Example', two: 'Load Two Runs Example', multi: 'Load Multi Run Example' }[
      kind
    ];
    await this.page.getByText(label).click();
    // Unlike uploadReport, the settled state isn't a single shared text across
    // all three shapes (single/two/multi runs each render a differently
    // worded summary line) — a rendered chart is the one signal common to all.
    await this.page.locator('.recharts-wrapper').first().waitFor();
  }

  /**
   * Click a chart header's "Switch scale (log/linear)" control — an
   * unlabelled icon in a `data-tooltip`-carrying span (Icons.jsx's
   * ScaleButton). Scoped to a heading: DetailScreen renders its own
   * ScaleButton in the sidebar (outside any heading), so an unscoped
   * page-wide selector would silently hit the wrong control there.
   */
  async toggleScale(): Promise<void> {
    await this.page.getByRole('heading').locator('[data-tooltip^="Switch scale"]').click();
  }

  async toggleBrandMenu(): Promise<void> {
    await this.page.getByRole('link', { name: 'JMH Visualizer' }).click();
  }

  /**
   * Click a chart header's "Show details" control (Icons.jsx's
   * DetailsButton), navigating to the full-screen DetailScreen.
   */
  async showDetails(): Promise<void> {
    await this.page.getByRole('heading').locator('[data-tooltip^="Show details"]').click();
    await this.page.getByText('Back..').waitFor(); // confirms the DetailScreen navigation completed
  }

  /** Click DetailScreen's "Back.." link, returning to the previous screen via history.goBack(). */
  async goBack(): Promise<void> {
    await this.page.getByText('Back..').click();
  }

  /**
   * Open the "Load from URL(s)" modal (LoadFromUrlsDialog.jsx), fill URL 1
   * (and URL 2 if given), and submit. The dialog's `Load` button doesn't
   * dispatch a store action -- it rewrites `window.location.search` and does
   * a real full-page reload -- so this settles the same way `uploadReport(s)`
   * does, on whichever text is guaranteed present once the reload lands
   * (single-run sentence for 1 URL, "Ignoring deviations below" for 2),
   * rather than on any transition-specific signal.
   */
  async loadFromUrls(urls: string[]): Promise<void> {
    await this.page.getByText('Load from URL(s)', { exact: true }).click();
    const dialog = this.page.getByRole('dialog');
    await dialog.getByLabel('URL 1').fill(urls[0]);
    if (urls[1]) {
      await dialog.getByLabel('URL 2 (optional)').fill(urls[1]);
    }
    await dialog.getByRole('button', { name: 'Load', exact: true }).click();
    await this.waitForRunsSettled(urls.length);
  }

  /**
   * Same as `loadFromUrls`, for the "Load from Gist(s)" modal
   * (LoadFromGistsDialog.jsx). Field 1 takes a raw gist ID, not a full URL.
   *
   * `expectedRunCount` defaults to `gistIds.length`, correct whenever every
   * gist holds exactly 1 file -- pass it explicitly for a gist with 2+ files
   * (`fetchFromGists` in processParameters.js makes one run per file in the
   * gist, not one run per gist ID).
   */
  async loadFromGists(gistIds: string[], expectedRunCount = gistIds.length): Promise<void> {
    await this.page.getByText('Load from Gist(s)', { exact: true }).click();
    const dialog = this.page.getByRole('dialog');
    await dialog.getByLabel('Gist 1').fill(gistIds[0]);
    if (gistIds[1]) {
      await dialog.getByLabel('Gist 2 (optional)').fill(gistIds[1]);
    }
    await dialog.getByRole('button', { name: 'Load', exact: true }).click();
    await this.waitForRunsSettled(expectedRunCount);
  }

  /**
   * Navigate straight to `?sources=url1,url2,...` (processParameters.js),
   * bypassing the "Load from URL(s)" dialog's 2-field cap -- the only way to
   * load 3+ URLs at once.
   */
  async gotoWithSources(urls: string[]): Promise<void> {
    await this.page.goto(`/?sources=${urls.join(',')}`);
    await this.waitForRunsSettled(urls.length);
  }

  /** Same as `gotoWithSources`, for `?gists=id1,id2,...`. */
  async gotoWithGists(gistIds: string[]): Promise<void> {
    await this.page.goto(`/?gists=${gistIds.join(',')}`);
    await this.waitForRunsSettled(gistIds.length);
  }

  /**
   * `runCount` is the number of runs the reload should settle into, not the
   * number of URLs/gist IDs passed to load them -- the two coincide whenever
   * every gist holds exactly 1 file (`fetchFromUrls` is always 1 URL : 1
   * run), but `fetchFromGists` (processParameters.js) turns one gist ID into
   * one run *per file in that gist*. `loadFromGists` above takes an explicit
   * `expectedRunCount` for this reason; `gotoWithGists` doesn't yet, since no
   * caller has needed a multi-file gist via `?gists=` -- add the same
   * parameter there if one does.
   */
  private async waitForRunsSettled(runCount: number): Promise<void> {
    if (runCount === 1) {
      await this.page.getByText(/different benchmark classes for single run/).waitFor();
    } else {
      await this.page.getByText(/Ignoring deviations below/).waitFor();
    }
  }
}
