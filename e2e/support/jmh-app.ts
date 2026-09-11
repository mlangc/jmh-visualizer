import path from 'node:path';
import { Page } from '@playwright/test';

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
    const fileInput = this.page
      .locator('div.btn', { hasText: 'Open File Dialog' })
      .locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(FIXTURES, fixtureName));
    await this.page.getByText(/different benchmark classes for single run/).waitFor();
  }

  /**
   * Click one of the upload sidebar's "Load … Example" links — plain <a>s
   * wired to `actions.load{Single,Two,Multi}RunExample`, byte-identical
   * master..add-filters-for-large-result-files. Loads the bundled
   * `ListCreationBenchmark`-family report of the requested shape.
   */
  async loadBundledExample(kind: 'single' | 'two' | 'multi'): Promise<void> {
    const label = { single: 'Load Single Run Example', two: 'Load Two Runs Example', multi: 'Load Multi Run Example' }[kind];
    await this.page.getByText(label).click();
    // Unlike uploadReport, the settled state isn't a single shared text across
    // all three shapes (single/two/multi runs each render a differently
    // worded summary line) — a rendered chart is the one signal common to all.
    await this.page.locator('.recharts-wrapper').first().waitFor();
  }
}
