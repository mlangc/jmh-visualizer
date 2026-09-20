import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
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
    await this.fileInput().setInputFiles(path.join(FIXTURES, fixtureName));
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
    await this.fileInput().setInputFiles(fixtureNames.map((name) => path.join(FIXTURES, name)));
    await this.page.getByText(/Ignoring deviations below/).waitFor();
  }

  /**
   * Upload arbitrary bytes through the same input as `uploadReport`, for content that
   * has no business in `fixtures/` — which holds real, unmodified JMH output. Returns
   * as soon as the file is handed over: what the app does next is the caller's to
   * assert, and for unparseable content it's an `alert()` and no state change at all.
   */
  async uploadRawFile(file: { name: string; mimeType: string; buffer: Buffer }): Promise<void> {
    await this.fileInput().setInputFiles(file);
  }

  /**
   * The upload sidebar's labelled file input. react-dropzone renders a second,
   * unlabelled one, hence the scoping to the "Open File Dialog" button.
   */
  private fileInput(): Locator {
    return this.page.locator('div.btn', { hasText: 'Open File Dialog' }).locator('input[type="file"]');
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
    await this.benchmarkClassLink(className).click();
  }

  /**
   * The same sidebar entry as a Locator, for the gestures `clickBenchmarkClassLink`
   * doesn't perform -- on the filters branch a double-click on it re-selects every
   * method of that class.
   */
  benchmarkClassLink(className: string): Locator {
    return this.page.locator('ul.nav ul.nav').getByText(className, { exact: true });
  }

  /** One benchmark class's row in the "Benchmarks" sidebar, with its icons and (on the filters branch) its filter tree. */
  private sidebarRow(className: string): Locator {
    return this.page.locator('ul.nav ul.nav > li').filter({ has: this.page.getByText(className, { exact: true }) });
  }

  /**
   * The rendered report for one benchmark class -- its heading, chart, and "Show JSON"
   * panel. Single/Two/MultiRunBundle all wrap that in a plain <div> carrying no class
   * or role of its own, so the only branch-independent handle is "the innermost <div>
   * containing that class's heading": ancestors precede descendants in document order,
   * so `.last()` is the innermost one. The Details screen's per-metric sections have
   * the same shape, so this addresses those by their metric heading too.
   *
   * Needed wherever more than one class is on screen -- `toggleScale()`,
   * `showDetails()` and the chart locators are all page-wide otherwise, which is fine
   * for the single-class fixtures and a strict-mode violation on the 18-class examples.
   *
   * The heading match is anchored at the start and must end on a word: the heading
   * carries the class's mode badge and controls after the name, so it can't be matched
   * exactly, but a bare substring match would silently return the wrong section for a
   * name that is the tail of another one (`MultithreadedBenchmark` inside
   * `StupidMultithreadedBenchmark` in example runs 2 and 3, `gc.alloc.rate` inside
   * `gc.alloc.rate.norm` on the Details screen).
   */
  benchmarkSection(className: string): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByRole('heading', { name: new RegExp(`^${escapeRegExp(className)}(\\s|$)`) }) })
      .last();
  }

  /**
   * Click a benchmark class's sidebar eye icon, adding it to / removing it from
   * `focusedBundles` (RunScreen renders only the focused classes once any is focused).
   *
   * RunSideBar renders the eye and details icons as two unlabelled <span>s in that
   * order ahead of the class-name link: no text, no role, and -- unlike the chart
   * header's controls -- no `data-tooltip`, so their position within the row is the
   * only handle. `sidenavi.css` keeps them `display:none` until the row is hovered,
   * hence the hover first.
   */
  async focusBundle(className: string): Promise<void> {
    await this.clickSidebarRowIcon(className, 0);
  }

  /** Click a benchmark class's sidebar details icon -- the sidebar's route to the screen `showDetails()` opens. */
  async showDetailsFromSidebar(className: string): Promise<void> {
    await this.clickSidebarRowIcon(className, 1);
    await this.page.getByText('Back..').waitFor();
  }

  private async clickSidebarRowIcon(className: string, index: number): Promise<void> {
    // sidenavi.css hides and reveals the icons per `li > div`, not per `li`, so both
    // the hover and the lookup are scoped to that div -- on the filters branch the <li>
    // also carries the filter tree, which puts its centre point (what `.hover()` aims
    // at) well below the row, and its own spans into an unscoped `span` lookup.
    const row = this.sidebarRow(className).locator('> div');
    await row.hover();
    await row.locator('> span').nth(index).click();
  }

  /**
   * Flip SingleRunView's "Sync Axis Scales" toggle, which appears only once more than
   * one bundle is focused. Driven through `Tooltipped.jsx`'s `data-tooltip` -- already
   * a sanctioned hook, and it reports the toggle's state as well as accepting the
   * click. Its `#scales-sync` id belongs to react-toggle's screenreader-only <input>,
   * which isn't clickable and would be a fifth non-semantic hook for no gain.
   */
  async toggleAxisScalesSync(): Promise<void> {
    await this.page.locator('[data-tooltip^="Sync Axis Scales"]').click();
  }

  /** The "Sync Axis Scales: on|off" / "No Axis Scale syncing possible ..." tooltip text, as the toggle reports it. */
  axisScalesSyncTooltip(): Locator {
    return this.page.locator('[data-tooltip*="Axis Scale"]');
  }

  /**
   * Locate one control in a benchmark class's sidebar filter tree
   * (MethodParamCheckboxList.jsx), scoped to `className`'s own row and
   * addressed by its path through that tree from there:
   *
   *   benchmarkFilter('SomeBenchmark', 'firstEntry')              -> the method's checkbox
   *   benchmarkFilter('SomeBenchmark', 'firstEntry', 'size')      -> the 'size' param's name label
   *   benchmarkFilter('SomeBenchmark', 'firstEntry', 'size', '100') -> that param value's checkbox
   *
   * Returns a Locator rather than performing the click, so callers keep
   * Playwright's own vocabulary -- `.click(opts)`, `.dblclick(opts)` (both
   * gestures are meaningful here: double-click means "select only this") and
   * `expect(...)`. Every level is scoped to its enclosing <li> -- via the
   * `listitem` role every <li> implicitly gets inside a <ul>/<ol>, no
   * app-specific class needed -- rather than searched unscoped: class,
   * method, and param names, and param values, all repeat (across classes,
   * across methods), so an unscoped lookup can match more than one control
   * and only be picked apart by `.nth()`, which silently depends on render
   * order.
   */
  benchmarkFilter(className: string, methodName: string, paramName?: string, paramValue?: string): Locator {
    const bundleItem = this.sidebarRow(className);

    if (paramName === undefined) {
      return bundleItem.getByRole('checkbox', { name: methodName, exact: true });
    }

    // The `has` locators below are deliberately built from `this.page`, not from
    // `bundleItem`/`method` -- `.filter({ has })` re-scopes its locator under each
    // candidate, and a `has` locator built from an already-scoped locator embeds that
    // same scoping chain again, requiring (impossibly) a second nested match of it.
    const method = bundleItem
      .getByRole('listitem')
      .filter({ has: this.page.getByRole('checkbox', { name: methodName, exact: true }) });
    const paramNameLabel = method.getByText(paramName, { exact: true });
    if (paramValue === undefined) {
      return paramNameLabel;
    }

    const param = method.getByRole('listitem').filter({ has: this.page.getByText(paramName, { exact: true }) });
    return param.getByRole('checkbox', { name: paramValue, exact: true });
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
   *
   * `className` narrows that to one class's header, which is required whenever
   * several classes are on screen; it only flips *that* chart (SingleRunBundle keeps
   * its own copy of the setting), unlike the sidebar control below.
   */
  async toggleScale(className?: string): Promise<void> {
    await this.chartHeaderControl('Switch scale', className).click();
  }

  /** Click a chart header's "Sort by Score/Name" control (Icons.jsx's SortButton). See `toggleScale`. */
  async toggleSort(className?: string): Promise<void> {
    await this.chartHeaderControl('Sort by', className).click();
  }

  private chartHeaderControl(tooltipPrefix: string, className?: string): Locator {
    const scope = className === undefined ? this.page : this.benchmarkSection(className);
    return scope.getByRole('heading').locator(`[data-tooltip^="${tooltipPrefix}"]`);
  }

  /**
   * Click the sidebar's own Sort / Scale control (RunScreen's and DetailScreen's
   * `buttons`), which drives `actions.sort`/`actions.logScale` — global state every
   * chart on the screen follows, as opposed to the per-chart headers above.
   *
   * Same unlabelled `data-tooltip` icon as the header controls, and nothing
   * distinguishes the two beyond where they sit: SplitPane renders the main view
   * before the sidebar, so the sidebar's copy is the last one on the page.
   */
  async toggleSortForAllCharts(): Promise<void> {
    await this.page.locator('[data-tooltip^="Sort by"]').last().click();
  }

  /** See `toggleSortForAllCharts` — the same sidebar control for the log/linear scale. */
  async toggleScaleForAllCharts(): Promise<void> {
    await this.page.locator('[data-tooltip^="Switch scale"]').last().click();
  }

  /**
   * Pick a metric in the sidebar's metric dropdown (`RunSideBar`'s `<select>`, wired
   * to `actions.selectMetric`). Only `'Score'` and `'·'`-prefixed secondary metrics
   * are ever offered — see `secondary-metrics.spec.ts`.
   *
   * Unscoped `select` is safe on the Run and Summary screens, which render exactly
   * one; `DetailSideBar` renders its own (the benchmark-class chooser), so don't
   * reuse this there.
   */
  async selectMetric(metric: string): Promise<void> {
    await this.page.locator('select').selectOption(metric);
  }

  async toggleBrandMenu(): Promise<void> {
    await this.page.getByRole('link', { name: 'JMH Visualizer' }).click();
  }

  /**
   * Click a chart header's "Show details" control (Icons.jsx's
   * DetailsButton), navigating to the full-screen DetailScreen. Pass
   * `className` when more than one class is on screen — see `toggleScale`.
   */
  async showDetails(className?: string): Promise<void> {
    await this.chartHeaderControl('Show details', className).click();
    await this.page.getByText('Back..').waitFor(); // confirms the DetailScreen navigation completed
  }

  /**
   * Pick another benchmark class in DetailSideBar's `<select>`, staying on the Details
   * screen. Not `selectMetric`'s dropdown: that one is the Run screen's metric picker,
   * and the two screens never render both.
   */
  async selectDetailedBenchmarkClass(className: string): Promise<void> {
    await this.page.locator('select').selectOption({ label: className });
    await this.page.getByRole('heading', { name: new RegExp(`Details of .*${escapeRegExp(className)}$`) }).waitFor();
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

  /**
   * Same as `gotoWithSources`, for `?gists=id1,id2,...`.
   *
   * Unlike `loadFromGists`, this has no `expectedRunCount` override -- no
   * caller has needed a multi-file gist via `?gists=` yet. Add the same
   * parameter here if one does.
   */
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
   * `expectedRunCount` for this reason.
   */
  private async waitForRunsSettled(runCount: number): Promise<void> {
    if (runCount === 1) {
      await this.page.getByText(/different benchmark classes for single run/).waitFor();
    } else {
      await this.page.getByText(/Ignoring deviations below/).waitFor();
    }
  }
}
